import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';

const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,date:new Date().toISOString(),cases:[],failures:[]};
fs.mkdirSync(output,{recursive:true});
const sizes=[{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:568,height:320},{width:1440,height:1000},{width:1280,height:540}];
async function inspect(page){
 return page.evaluate(()=>{
  const layer=document.querySelector('.portal-layer'),surface=layer.firstElementChild,rect=layer.getBoundingClientRect();
  layer.style.pointerEvents='auto';
  const corners=[[rect.left+1,rect.top+1],[rect.right-1,rect.top+1],[rect.left+1,rect.bottom-1],[rect.right-1,rect.bottom-1]];
  const covered=corners.map(([x,y])=>document.elementsFromPoint(x,y).includes(surface));
  layer.style.removeProperty('pointer-events');
  const x=parseFloat(layer.style.getPropertyValue('--portal-x'))/100,y=parseFloat(layer.style.getPropertyValue('--portal-y'))/100;
  const distances=[[0,0],[rect.width,0],[0,rect.height],[rect.width,rect.height]].map(([cx,cy])=>Math.hypot(cx-x*rect.width,cy-y*rect.height));
  return{covered,clip:getComputedStyle(surface).clipPath,radius:parseFloat(layer.style.getPropertyValue('--portal-radius')),farthest:Math.max(...distances),
   width:rect.width,height:rect.height,origin:[x,y],cover:+layer.style.getPropertyValue('--portal')};
 });
}
async function pose(page,cover){
 await page.evaluate(cover=>window.studio.router.transition(cover===0?0:.48+.52*cover),cover);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return inspect(page);
}
async function boundary(page){
 const full=await pose(page,1);assert.ok(full.covered.every(Boolean),'mount midpoint must cover every corner');
 const edge=await pose(page,.97);assert.ok(!edge.covered.every(Boolean),'paper already fully covers the viewport before its final edge');
 assert.ok(Math.abs(full.radius-full.farthest-2)<.1,JSON.stringify(full));
 const clear=await pose(page,0);assert.ok(clear.covered.every(value=>!value));
 return{full,edge,clear};
}
async function run(name,options,action){
 const context=await browser.newContext({viewport:{width:390,height:844},...options}),page=await context.newPage(),log=observe(page),result={name};
 try{await action(page,result);assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);result.ok=true;console.log(`PASS ${name}`);}
 catch(error){result.error=error.stack;report.failures.push(name);console.log(`FAIL ${name}: ${error.message}`);}
 finally{result.errors=log.errors;result.failed=log.failed;report.cases.push(result);await context.close();}
}
try{
 await run('seven reference boxes and resize while covered',{},async(page,result)=>{
  await page.goto(server.base+'/about/');await ready(page);await settle(page);result.sizes=[];
  for(const size of sizes){
   await page.setViewportSize(size);result.sizes.push({size,...await boundary(page)});
   if(size.width===390||size.width===1440){await pose(page,.65);await page.screenshot({path:`${output}/portal-edge-${size.width}.png`});await pose(page,0);}
  }
  await pose(page,1);await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  result.resizedFull=await inspect(page);assert.ok(result.resizedFull.covered.every(Boolean));
  assert.ok(Math.abs(result.resizedFull.radius-result.resizedFull.farthest-2)<.1);
  const edge=await pose(page,.97);assert.ok(!edge.covered.every(Boolean));await pose(page,0);
 });
 await run('real mounts stay covered and preserve the shared scene rig',{},async(page,result)=>{
  await page.goto(server.base+'/about/');await ready(page);await settle(page);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.evaluate(()=>{
   const s=window.studio,router=s.router,mount=router.mount;
   window.portalRig={renderer:s.world.renderer,actor:s.world.actor,sources:[...s.score.sources]};window.portalMounts=[];
   router.mount=async(...args)=>{
    const layer=document.querySelector('.portal-layer'),surface=layer.firstElementChild;
    layer.style.pointerEvents='auto';
    const full=[[1,1],[innerWidth-1,1],[1,innerHeight-1],[innerWidth-1,innerHeight-1]].every(([x,y])=>document.elementsFromPoint(x,y).includes(surface));
    layer.style.removeProperty('pointer-events');window.portalMounts.push({path:args[1].pathname,full});return mount(...args);
   };
  });
  for(const path of ['/radio/','/blog/','/projects/','/about/']){await page.evaluate(path=>window.studio.router.navigate(path),path);await settle(page);}
  result.mounts=await page.evaluate(()=>window.portalMounts);assert.equal(result.mounts.length,4);assert.ok(result.mounts.every(mount=>mount.full));
  result.shared=await page.evaluate(()=>{const s=window.studio,b=window.portalRig;return s.world.renderer===b.renderer&&s.world.actor===b.actor&&s.score.sources.every((source,i)=>source===b.sources[i])&&s.score.audible;});
  assert.ok(result.shared);await page.locator('[data-activity="swim"]').click();await page.waitForFunction(()=>window.studio.world.model.activity==='swim');
 });
 await run('reduced motion keeps complete midpoint coverage',{reducedMotion:'reduce'},async(page,result)=>{
  await page.goto(server.base+'/about/');await ready(page);await settle(page);result.coverage=await boundary(page);
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
  assert.equal(await page.locator('.hero-word').evaluateAll(words=>words.flatMap(word=>word.getAnimations()).length),0);
  assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.hero-title')),true);
 });
 await run('no WebGL uses the measured fallback origin',{},async(page,result)=>{
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
  await page.goto(server.base+'/about/');await ready(page);await settle(page);result.coverage=[];
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);result.coverage.push(await boundary(page));}
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
  assert.equal(await page.evaluate(()=>window.studio.route.id),'blog');
 });
 await run('oversized legacy circle is rejected',{},async(page,result)=>{
  await page.goto(server.base+'/about/');await ready(page);await settle(page);
  await page.addStyleTag({content:'.portal-surface{clip-path:circle(calc(var(--portal)*150%) at var(--portal-x,72%) var(--portal-y,50%))!important}'});
  await assert.rejects(boundary(page),/paper already fully covers/);result.rejected=true;
 });
}finally{
 fs.writeFileSync(`${output}/portal-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();if(report.failures.length)process.exitCode=1;
}
