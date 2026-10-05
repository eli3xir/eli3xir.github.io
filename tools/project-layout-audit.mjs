import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
import {layout} from './vision-audit-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const geometry=async page=>({...await layout(page),...await page.evaluate(()=>{
 const w=window.studio.world,stage=document.querySelector('.project-scene').getBoundingClientRect();
 return{stage:{top:stage.top+scrollY,width:stage.width,height:stage.height},composition:[w.layoutScale,w.heroOffset],hidden:[...document.querySelectorAll('.project-panels>[hidden]')].map(e=>({display:getComputedStyle(e).display,inert:e.inert})),scroll:scrollY};
})});
function verify(result,viewport){
 assert.equal(result.overflow,false);assert.ok(result.bounds.left>=-1&&result.bounds.right<=viewport.width+1,JSON.stringify({viewport,result}));
 if(result.stage.height){
  assert.ok(result.bounds.top>=result.textBottom+12,JSON.stringify({viewport,result}));assert.ok(result.bounds.bottom<result.panelTop-12,JSON.stringify({viewport,result}));
  assert.ok(result.stage.height>=230);assert.ok(result.hidden.every(h=>h.display==='none'&&h.inert));
 }
 assert.ok(result.targets.every(t=>t.width>=44&&t.height>=44),JSON.stringify({viewport,targets:result.targets}));
}
try{
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:768,height:1024},{width:844,height:390},{width:568,height:320},{width:850,height:900},{width:851,height:900},{width:1100,height:800},{width:1101,height:800},{width:1200,height:1000},{width:1440,height:1000}]){
  const recording=process.env.LAYOUT_VIDEO&&viewport.width===390;
  const context=await browser.newContext({viewport,recordVideo:recording?{dir:output,size:viewport}:undefined}),page=await context.newPage(),log=observe(page),modes=[],start=Date.now();
  await page.goto(server.base+'/projects/');await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);
  await page.evaluate(()=>{const w=window.studio.world;window.layoutIdentities=[w.renderer,w.camera,w.model,w.actor];});
  for(const id of ['signal','vision','compiler','signal']){
   await page.locator(`[data-instrument=${id}]`).click();await page.waitForFunction(id=>window.studio.world.model.instrumentLevels[id]===1,id);
   if(id==='vision')await page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready');
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(80);const result=await geometry(page);verify(result,viewport);modes.push({id,seconds:(Date.now()-start)/1000,...result});
   if(result.stage.height){assert.deepEqual(result.stage,modes[0].stage);assert.deepEqual(result.composition,modes[0].composition);}
   if(viewport.width>=390&&viewport.width<=430)assert.ok(result.bounds.bottom<viewport.height-100,JSON.stringify({viewport,result}));
   if(id==='signal'||viewport.width===390)await page.screenshot({path:`${output}/project-layout-${id}-${viewport.width}.png`});
   if(viewport.height<500){await page.evaluate(top=>scrollTo(0,top-16),result.stage.top);await page.waitForTimeout(80);await page.screenshot({path:`${output}/project-layout-${id}-${viewport.width}-scene.png`});}
  }
  // The scene follows actual scrolling, while changing controls below it keeps
  // the same composition. No CSS placeholder is used as geometric evidence.
  if(modes[0].stage.height){
   const before=await page.evaluate(()=>{const w=window.studio.world;w.stop();window.layoutFrame=w.frame;w.frame=()=>{};return{y:w.portalPosition().y*innerHeight,scroll:scrollY};});
   await page.evaluate(()=>scrollTo(0,180));await page.waitForTimeout(80);
   const after=await page.evaluate(()=>{const w=window.studio.world;w.stop();return{y:w.portalPosition().y*innerHeight,scroll:scrollY};});
   assert.ok(Math.abs(after.y-before.y+after.scroll-before.scroll)<1e-6,JSON.stringify({before,after}));await page.evaluate(()=>{const w=window.studio.world;w.frame=window.layoutFrame;w.start();});
  }
  assert.equal(await page.evaluate(()=>{const w=window.studio.world;return[w.renderer,w.camera,w.model,w.actor].every((v,i)=>v===window.layoutIdentities[i]);}),true);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'visible geometry, stable choices, controls and scroll',viewport,modes});await context.close();if(recording)await page.video().saveAs(`${output}/project-layout-390.webm`);console.log('PASS project composition',viewport.width,viewport.height);
 }
 {
  const viewport={width:390,height:844},context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+'/blog/');await ready(page);await settle(page);await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(100);const original=await geometry(page);verify(original,viewport);
  await page.evaluate(()=>{const title=document.querySelector('.hero-title');title.style.fontSize='56px';title.style.maxWidth='220px';});await page.waitForTimeout(160);const expanded=await geometry(page);verify(expanded,viewport);assert.ok(expanded.stage.top>original.stage.top+35);
  await page.locator('[data-instrument=compiler]').click();await page.waitForTimeout(80);const selected=await geometry(page);verify(selected,viewport);assert.deepEqual(selected.stage,expanded.stage);assert.deepEqual(selected.composition,expanded.composition);
  const hidden=await page.evaluate(()=>[...document.querySelectorAll('.project-panels>[hidden] input,.project-panels>[hidden] button')].map(el=>{el.focus();return document.activeElement===el;}));assert.ok(hidden.every(v=>!v));
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'SPA, text reflow, reduced motion and hidden focus',original,expanded,selected});await context.close();console.log('PASS project text reflow and keyboard boundary');
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),log=observe(page),sizes=[];
  await page.goto(server.base+'/projects/');await ready(page);await settle(page);await page.locator('[data-instrument=compiler]').click();await page.waitForFunction(()=>window.studio.world.model.instrumentLevels.compiler===1);
  await page.locator('[data-source="x := (2 + 3) * 4;"]').click();await page.waitForFunction(()=>window.studio.route.compiler.state.phase==='done');
  await page.evaluate(()=>{const w=window.studio.world;window.rotateState=[w.renderer,w.camera,w.model,w.actor,window.studio.route.compiler.state.program];});
  for(const viewport of [{width:568,height:320},{width:844,height:390},{width:1200,height:1000},{width:1440,height:1000},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(120);const result=await geometry(page);verify(result,viewport);
   const state=await page.evaluate(()=>{const w=window.studio.world,c=window.studio.route.compiler;return{same:[w.renderer,w.camera,w.model,w.actor,c.state.program].every((v,i)=>v===window.rotateState[i]),result:c.state.program.result,instrument:w.model.instrument};});
   assert.deepEqual(state,{same:true,result:20,instrument:'compiler'});sizes.push({viewport,...result,state});
  }
  await page.screenshot({path:`${output}/project-layout-rotated-390.png`});assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'rotate and cross layout breakpoints while retaining a real expression',sizes});await context.close();console.log('PASS project rotation and preserved result');
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/project-layout-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
