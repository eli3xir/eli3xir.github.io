import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';

const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
async function run(name,action){
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),log=observe(page),result={name};
 let release;const gate=new Promise(resolve=>release=resolve);
 await page.route('**/js/world/phonograph.js',async route=>{await gate;await route.continue();});
 try{await page.goto(server.base+'/about/');await ready(page);await settle(page);await action(page,result,release);assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);result.ok=true;console.log(`PASS ${name}`);}
 catch(error){result.ok=false;result.error=error.stack;report.failures.push(name);console.log(`FAIL ${name}: ${error.message}`);}
 finally{release();result.errors=log.errors;result.failed=log.failed;report.cases.push(result);await context.close();}
}
try{
 await run('keyboard preparation, seven layouts and cancel current destination',async(page,result,release)=>{
  await page.locator('.menu-toggle').click();await page.locator('.studio-nav a[href="/radio/"]').focus();
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.classList.contains('is-preparing'));
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.menu-toggle')),true);
  result.layouts=[];
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:568,height:320},{width:1440,height:1000},{width:1280,height:540}]){
   await page.setViewportSize(viewport);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const layout=await page.evaluate(()=>{
    const status=document.querySelector('.navigation-status'),s=status.getBoundingClientRect(),overlap=[];
    for(const selector of ['.studio-brand','.menu-toggle','.hero-title','.leisure-controls','.sound-dock','.room-link']){
     const node=document.querySelector(selector);if(!node||getComputedStyle(node).visibility==='hidden'||!node.getClientRects().length)continue;
     const r=node.getBoundingClientRect();if(Math.min(r.right,s.right)-Math.max(r.left,s.left)>1&&Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>1)overlap.push(selector);
    }
    return{width:innerWidth,height:innerHeight,status:{x:s.x,y:s.y,width:s.width,height:s.height},overlap,visibility:getComputedStyle(status).visibility,cover:window.studio.world.transition,pointer:getComputedStyle(document.querySelector('#page-view')).pointerEvents};
   });result.layouts.push(layout);assert.deepEqual(layout.overlap,[]);assert.equal(layout.visibility,'visible');assert.equal(layout.cover,0);assert.notEqual(layout.pointer,'none');
   assert.ok(layout.status.x>=0&&layout.status.y>=0&&layout.status.x+layout.status.width<=viewport.width&&layout.status.y+layout.status.height<=viewport.height);
  }
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${output}/navigation-preparing-390.png`});
  await page.evaluate(()=>{window.preparationModel=window.studio.world.model;window.studio.router.navigate(location.href);});
  await settle(page);
  result.cancelled=await page.evaluate(()=>({sameModel:window.studio.world.model===window.preparationModel,route:window.studio.route.id,cover:window.studio.world.transition,
   notice:getComputedStyle(document.querySelector('.navigation-status')).visibility,pending:window.studio.router.pending}));
  assert.ok(result.cancelled.sameModel);assert.equal(result.cancelled.route,'about');assert.equal(result.cancelled.cover,0);assert.equal(result.cancelled.notice,'hidden');assert.equal(result.cancelled.pending,null);
  assert.ok((await page.locator('.studio-toast').textContent()).includes('已留在当前页面'));
  await page.locator('[data-activity="chess"]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.studio.world.model.activity==='chess');
  release();await page.evaluate(()=>window.studio.router.prepare(new URL('/radio/',location.href)));assert.equal(await page.evaluate(()=>window.studio.route.id),'about');
 });
 await run('history supersedes an unfinished destination without intermediate mounting',async(page,result,release)=>{
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.evaluate(()=>{const s=window.studio;window.preparationIdentity={renderer:s.world.renderer,actor:s.world.actor,sources:[...s.score.sources]};window.preparationVisited=[];const show=s.world.show.bind(s.world);s.world.show=route=>{window.preparationVisited.push(route.id);show(route);};});
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
  await page.evaluate(()=>{window.studio.router.navigate('/radio/');});await page.waitForFunction(()=>document.body.classList.contains('is-preparing'));
  await page.goBack();await page.waitForFunction(()=>window.studio.route.id==='about'&&!window.studio.router.busy);await settle(page);
  assert.equal(new URL(page.url()).pathname,'/about/');await page.goForward();await page.waitForFunction(()=>window.studio.route.id==='blog'&&!window.studio.router.busy);await settle(page);
  release();await page.evaluate(()=>window.studio.router.prepare(new URL('/radio/',location.href)));
  result.state=await page.evaluate(()=>({url:location.pathname,current:window.studio.router.currentURL.pathname,visited:window.preparationVisited,
   renderer:window.studio.world.renderer===window.preparationIdentity.renderer,actor:window.studio.world.actor===window.preparationIdentity.actor,
   sources:window.studio.score.sources.every((source,i)=>source===window.preparationIdentity.sources[i]),audible:window.studio.score.audible,
   focused:document.activeElement===document.querySelector('.hero-title'),notice:getComputedStyle(document.querySelector('.navigation-status')).visibility}));
  assert.equal(result.state.url,'/blog/');assert.equal(result.state.current,'/blog/');assert.deepEqual(result.state.visited,['blog','about','blog']);
  for(const key of ['renderer','actor','sources','audible','focused'])assert.equal(result.state[key],true,key);assert.equal(result.state.notice,'hidden');
 });
}finally{fs.writeFileSync(`${output}/navigation-preparation-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();if(report.failures.length)process.exitCode=1;}
