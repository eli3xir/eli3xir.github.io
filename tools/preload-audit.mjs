import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildPreloads} from './build-module-preloads.mjs';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';

const graph=await buildPreloads(),helper='/js/experience/preload.js',entry='/js/experience/entry.js';
const expected=key=>[...graph.common,...graph.graphs.get(key)].sort();
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,date:new Date().toISOString(),browser:browser.version(),cases:[],failures:[]};
fs.mkdirSync(output,{recursive:true});
async function run(name,action){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),log=observe(page),result={name};
 try{await action(page,context,result,log);result.ok=true;console.log(`PASS ${name}`);}
 catch(error){result.error=error.stack;report.failures.push(name);console.log(`FAIL ${name}: ${error.message}`);}
 finally{Object.assign(result,{errors:log.errors,failed:log.failed});report.cases.push(result);await context.close();}
}
const hints=page=>page.locator('link[rel="modulepreload"]').evaluateAll(links=>links.map(link=>new URL(link.href).pathname).sort());
const clean=log=>{assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);};
async function useScene(page){
 await ready(page);await settle(page);
 await page.locator('[data-activity="swim"]').click();await page.waitForFunction(()=>window.studio.world.model.activity==='swim');
 await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
 assert.equal(await page.evaluate(()=>window.studio.route.id),'radio');
}
try{
 await run('early current-route hints share native module requests',async(page,context,result,log)=>{
  const cdp=await context.newCDPSession(page),requests=[];
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  cdp.on('Network.requestWillBeSent',event=>{const path=new URL(event.request.url).pathname;if(/\.m?js$/.test(path))requests.push(path);});
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**'+entry,async route=>{await gate;await route.continue();});
  try{
   await page.goto(server.base+'/about/index.html',{waitUntil:'commit'});
   await page.waitForFunction(()=>document.querySelector('link[rel="modulepreload"]'));
   result.earlyHints=await hints(page);assert.deepEqual(result.earlyHints,expected('about'));
   await page.waitForFunction(entry=>{
    const loaded=new Set(performance.getEntriesByType('resource').map(resource=>resource.name));
    return [...document.querySelectorAll('link[rel="modulepreload"]')].every(link=>new URL(link.href).pathname===entry||loaded.has(link.href));
   },entry);
   result.beforeEntry=await page.evaluate(()=>({studio:Boolean(window.studio),canvases:document.querySelectorAll('canvas').length}));
   assert.equal(result.beforeEntry.studio,false);assert.equal(result.beforeEntry.canvases,0);
   release();await ready(page);await settle(page);
   result.requests=[...requests];assert.deepEqual(requests.filter(url=>url!==helper).sort(),expected('about'));
   assert.equal(requests.length,new Set(requests).size,'preloads must reuse module requests even with HTTP cache disabled');
   const previous=await hints(page);
   await page.evaluate(()=>{globalThis.__preloadExperience('/about/');globalThis.__preloadExperience('/unknown.html');});
   assert.deepEqual(await hints(page),previous,'aliases and unknown paths must not add duplicate or unrelated hints');
   await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
   result.navigationHints=await hints(page);
   assert.deepEqual(result.navigationHints,[...new Set([...expected('about'),...expected('radio')])].sort());
   assert.equal(await page.evaluate(()=>window.studio.route.id),'radio');clean(log);
  }finally{release();}
 });
 await run('unavailable optional helper preserves scene and navigation',async(page,context,result,log)=>{
  await page.route('**'+helper,route=>route.fulfill({status:503,contentType:'text/javascript',body:''}));
  await page.goto(server.base+'/about/');await useScene(page);
  assert.deepEqual(await hints(page),[]);assert.equal(await page.evaluate(()=>typeof globalThis.__preloadExperience),'undefined');
  assert.deepEqual(log.errors,[]);assert.ok(log.failed.some(item=>item.status===503&&item.url.endsWith(helper)));
  assert.ok(log.failed.every(item=>item.url.endsWith(helper)));result.expectedFailure=helper;
 });
 await run('unsupported modulepreload uses native imports',async(page,context,result,log)=>{
  await page.addInitScript(()=>{
   const supports=DOMTokenList.prototype.supports;
   DOMTokenList.prototype.supports=function(token){return token==='modulepreload'?false:supports.call(this,token);};
  });
  await page.goto(server.base+'/about/');await useScene(page);
  assert.deepEqual(await hints(page),[]);assert.equal(await page.evaluate(()=>typeof globalThis.__preloadExperience),'undefined');clean(log);
 });
 await run('late helper follows current URL without blocking startup',async(page,context,result,log)=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**'+helper,async route=>{await gate;await route.continue();});
  try{
   await page.goto(server.base+'/about/',{waitUntil:'domcontentloaded'});await useScene(page);
   assert.deepEqual(await hints(page),[]);release();
   await page.waitForFunction(()=>typeof globalThis.__preloadExperience==='function');
   result.hints=await hints(page);assert.deepEqual(result.hints,expected('radio'));
   assert.equal(await page.evaluate(()=>window.studio.route.id),'radio');clean(log);
  }finally{release();}
 });
 await run('embedded experiment requests no outer scene hints',async(page,context,result,log)=>{
  const requests=[];page.on('request',request=>requests.push(new URL(request.url()).pathname));
  await page.goto(server.base+'/lab/fluid.html?embedded=1');await page.waitForFunction(()=>document.querySelector('canvas'));
  assert.deepEqual(await hints(page),[]);assert.equal(await page.evaluate(()=>typeof globalThis.__preloadExperience),'undefined');
  for(const path of ['/js/experience/app.js','/js/experience/route-assets.js','/js/world/world.js'])assert.ok(!requests.includes(path));
  result.requests=requests;clean(log);
 });
}finally{
 fs.writeFileSync(`${output}/preload-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();if(report.failures.length)process.exitCode=1;
}
