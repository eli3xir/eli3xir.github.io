import fs from 'node:fs';
import assert from 'node:assert/strict';
import os from 'node:os';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';

const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,date:new Date().toISOString(),environment:{browser:browser.version(),node:process.version,cpu:os.cpus()[0].model},cases:[],failures:[]};
fs.mkdirSync(output,{recursive:true});
const forbidden=/\/js\/(?:world\/(?:room|book|signal-bench|phonograph|potion|skin-preview|ocean|word-machine|moon|fluid|trails|galaxy|glass|breakout|bullet)\.js|experience\/(?:radio|skin|project-compiler|vision|ocean|partext|moon|fluid|trails|galaxy|glass|breakout|bullet)\.js)$/;
async function run(name,viewport,action){
 const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page),entry={name,viewport};
 try{await action(page,context,entry,log);entry.ok=true;console.log(`PASS ${name}`);}
 catch(error){entry.ok=false;entry.error=error.stack;report.failures.push(name);console.log(`FAIL ${name}: ${error.message}`);}
 finally{entry.errors=log.errors;entry.failed=log.failed;report.cases.push(entry);await context.close();}
}
const clean=log=>{assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await run(`cold entry ${viewport.width}`,viewport,async(page,context,result,log)=>{
   const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   if(process.env.OPENING_NETWORK)await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.5*1024*1024,uploadThroughput:.75*1024*1024,connectionType:'cellular4g'});
   result.network=process.env.OPENING_NETWORK?'150ms / 1.5MiB per second':'unthrottled';
   await page.addInitScript(()=>{
    performance.setResourceTimingBufferSize(2000);window.openingMarks={};window.openingLongTasks=[];
    new PerformanceObserver(list=>window.openingLongTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});
    const sample=()=>{
     if(document.querySelector('.world-hero')&&!window.openingMarks.hero)window.openingMarks.hero=performance.now();
     if(window.studio?.world?.renderedFrames>0){window.openingMarks.scene=performance.now();return;}
     requestAnimationFrame(sample);
    };requestAnimationFrame(sample);
   });
   await page.goto(server.base+'/about/',{waitUntil:'domcontentloaded'});await ready(page);await settle(page);
   await page.waitForFunction(()=>window.openingMarks.scene);
   await page.evaluate(()=>window.openingMarks.beforeSound=performance.now());await page.locator('.sound-toggle').click();
   await page.waitForFunction(()=>window.studio.score.audible);
   Object.assign(result,await page.evaluate(()=>({marks:{...window.openingMarks,audible:performance.now()},generationMs:window.studio.score.data.generationMs,
    navigation:performance.getEntriesByType('navigation')[0].toJSON(),resources:performance.getEntriesByType('resource').map(e=>e.toJSON()),longTasks:window.openingLongTasks,
    renderer:window.studio.diagnostics()})));
   result.scripts=result.resources.filter(r=>r.initiatorType==='script').map(r=>new URL(r.name).pathname);
   assert.ok(result.scripts.includes('/js/world/leisure.js'));assert.ok(result.scripts.includes('/js/experience/about.js'));
   assert.deepEqual(result.scripts.filter(path=>forbidden.test(path)),[],'unrelated route modules entered the cold graph');
   await page.locator('[data-activity="swim"]').click();await page.waitForFunction(()=>window.studio.world.model.activity==='swim');
   clean(log);
  });
  await run(`slow module and queued navigation ${viewport.width}`,viewport,async(page,context,result,log)=>{
   let release;const gate=new Promise(resolve=>release=resolve);
   await page.route('**/js/world/phonograph.js',async route=>{await gate;await route.continue();});
   try{
    await page.goto(server.base+'/about/');await ready(page);await settle(page);
    await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
    await page.evaluate(()=>{const s=window.studio;window.openingBefore={renderer:s.world.renderer,actor:s.world.actor,model:s.world.model,hero:document.querySelector('.world-hero'),sources:[...s.score.sources],time:s.score.time,frames:s.world.renderedFrames};});
    const request=page.waitForRequest('**/js/world/phonograph.js');
    // A real navigation click starts both HTML and module requests.
    if(await page.locator('.menu-toggle').isVisible())await page.locator('.menu-toggle').click();
    await page.locator('.studio-nav a[href="/radio/"]').click();await request;
    await page.waitForFunction(()=>window.studio.world.transition===1);
    result.held=await page.evaluate(()=>({route:window.studio.route.id,url:location.pathname,hero:document.querySelector('.world-hero')===window.openingBefore.hero,
     model:window.studio.world.model===window.openingBefore.model,time:window.studio.score.time-window.openingBefore.time,frames:window.studio.world.renderedFrames-window.openingBefore.frames}));
    assert.equal(result.held.route,'about');assert.equal(result.held.url,'/about/');assert.ok(result.held.hero&&result.held.model);assert.ok(result.held.time>0&&result.held.frames>0);
    await page.evaluate(()=>{window.studio.router.navigate('/lab/');window.studio.router.navigate('/blog/');});
    release();await page.waitForFunction(()=>window.studio.route.id==='blog'&&!window.studio.router.busy);await settle(page);
    result.after=await page.evaluate(()=>({route:window.studio.route.id,url:location.pathname,renderer:window.studio.world.renderer===window.openingBefore.renderer,
     actor:window.studio.world.actor===window.openingBefore.actor,sources:window.studio.score.sources.every((s,i)=>s===window.openingBefore.sources[i]),
     oldHeroGone:!window.openingBefore.hero.isConnected,oldHandlersReleased:window.openingBefore.model.onPick===null,focused:document.activeElement===document.querySelector('.hero-title')}));
    assert.equal(result.after.url,'/blog/');for(const key of ['renderer','actor','sources','oldHeroGone','oldHandlersReleased','focused'])assert.equal(result.after[key],true,key);
    clean(log);
   }finally{release();}
  });
  await run(`failed destination keeps current controls ${viewport.width}`,viewport,async(page,context,result,log)=>{
   await page.route('**/js/world/moon.js',route=>route.fulfill({status:503,contentType:'text/javascript',body:'Unavailable'}));
   await page.goto(server.base+'/about/');await ready(page);await settle(page);
   await page.evaluate(()=>{window.openingModel=window.studio.world.model;window.openingHero=document.querySelector('.world-hero');});
   await page.evaluate(()=>window.studio.router.navigate('/lab/moon.html'));await settle(page);
   result.failure=await page.evaluate(()=>({route:window.studio.route.id,url:location.pathname,current:window.studio.router.currentURL.pathname,
    sameModel:window.studio.world.model===window.openingModel,sameHero:document.querySelector('.world-hero')===window.openingHero,
    link:document.querySelector('.studio-toast a')?.getAttribute('href'),message:document.querySelector('.studio-toast').textContent,busy:window.studio.router.busy}));
   assert.equal(result.failure.route,'about');assert.equal(result.failure.url,'/about/');assert.equal(result.failure.current,'/about/');
   assert.ok(result.failure.sameModel&&result.failure.sameHero);assert.equal(result.failure.busy,false);assert.ok(result.failure.link.endsWith('/lab/moon.html'));
   assert.ok(result.failure.message.includes('互动场景暂时未能载入'));assert.ok(!result.failure.message.includes('/js/'));
   await page.locator('[data-activity="chess"]').click();await page.waitForFunction(()=>window.studio.world.model.activity==='chess');
   await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);assert.equal(await page.evaluate(()=>window.studio.route.id),'radio');
   assert.deepEqual(log.errors,[]);assert.ok(log.failed.some(f=>f.status===503&&f.url.endsWith('/js/world/moon.js')));
   assert.ok(log.failed.every(f=>f.url.endsWith('/js/world/moon.js')));result.expectedFailure='/js/world/moon.js';
  });
 }
 await run('stalled module times out and late completion stays inactive',{width:390,height:844},async(page,context,result,log)=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/js/world/phonograph.js',async route=>{await gate;await route.continue();});
  try{
   await page.goto(server.base+'/about/');await ready(page);await settle(page);
   await page.evaluate(()=>{window.openingStarted=performance.now();window.openingModel=window.studio.world.model;window.openingNavigation=window.studio.router.navigate('/radio/');});
   await page.waitForFunction(()=>!window.studio.router.busy,null,{timeout:17000});
   result.timeout=await page.evaluate(()=>({elapsed:performance.now()-window.openingStarted,route:window.studio.route.id,url:location.pathname,
    sameModel:window.studio.world.model===window.openingModel,message:document.querySelector('.studio-toast').textContent}));
   assert.equal(result.timeout.route,'about');assert.equal(result.timeout.url,'/about/');assert.ok(result.timeout.sameModel);assert.ok(result.timeout.message.includes('超时'));
   await page.locator('[data-activity="run"]').click();await page.waitForFunction(()=>window.studio.world.model.activity==='run');
   await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
   await page.evaluate(()=>{window.openingSettled=window.studio.world.model;});
   release();await page.evaluate(()=>window.studio.router.prepare(new URL('/radio/',location.href)));
   result.late=await page.evaluate(()=>({url:location.pathname,route:window.studio.route.id,sameModel:window.studio.world.model===window.openingSettled}));
   assert.equal(result.late.url,'/blog/');assert.equal(result.late.route,'blog');assert.ok(result.late.sameModel);
   await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);assert.equal(await page.evaluate(()=>window.studio.route.id),'radio');clean(log);
  }finally{release();}
 });
 await run('first module failure preserves native document',{width:390,height:844},async(page,context,result,log)=>{
  await page.route('**/js/world/leisure.js',route=>route.fulfill({status:503,contentType:'text/javascript',body:'Unavailable'}));
  await page.goto(server.base+'/about/');await page.locator('.startup-fallback').waitFor();
  result.native=await page.evaluate(()=>({studio:Boolean(window.studio),experience:document.body.dataset.experience||null,
   text:document.querySelector('main .about-lead')?.textContent,contacts:document.querySelectorAll('main .about-contact a').length,nav:document.querySelector('.page-nav a[href="/blog/"]')?.getAttribute('href')}));
  assert.equal(result.native.studio,false);assert.equal(result.native.experience,null);assert.ok(result.native.text.includes('eli3xir'));assert.equal(result.native.contacts,3);assert.equal(result.native.nav,'/blog/');
  await page.locator('.page-nav a[href="/blog/"]').click();await ready(page);assert.equal(await page.evaluate(()=>window.studio.route.id),'blog');
  assert.deepEqual(log.errors,[]);assert.ok(log.failed.some(f=>f.status===503&&f.url.endsWith('/js/world/leisure.js')));assert.ok(log.failed.every(f=>f.url.endsWith('/js/world/leisure.js')));
  result.expectedFailure='/js/world/leisure.js';
 });
 await run('embedded experiment skips the cabinet graph',{width:390,height:844},async(page,context,result,log)=>{
  const requests=[];page.on('request',r=>requests.push(new URL(r.url()).pathname));
  await page.goto(server.base+'/lab/fluid.html?embedded=1');await page.waitForFunction(()=>document.querySelector('canvas'));
  result.requests=requests;assert.ok(!requests.includes('/js/experience/app.js'));assert.ok(!requests.includes('/js/experience/route-assets.js'));assert.equal(await page.evaluate(()=>Boolean(window.studio)),false);clean(log);
 });
}finally{
 fs.writeFileSync(`${output}/opening-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();if(report.failures.length)process.exitCode=1;
}
