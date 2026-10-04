import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[]};
const snapshot=page=>page.evaluate(()=>{const s=window.studio.score,w=window.studio.world;return{time:s.time,audible:s.audible,playing:s.playing,context:s.context.state,eyes:window.characterEyes.map(o=>o.scale.y),frames:w.renderedFrames};});
const interrupt=async(page,system)=>{
 await page.evaluate(system=>new Promise((resolve,reject)=>{
  const deadline=performance.now()+8000;
  const poll=()=>{if(window.characterEyes[0].scale.y<.5){const s=window.studio.score;window.expressionSamples=[];(system?s.context.suspend():s.pause()).then(resolve,reject);}else if(performance.now()>deadline)reject(new Error('No resting blink within eight seconds'));else requestAnimationFrame(poll);};poll();
 }),system);
 const before=await snapshot(page);await page.waitForTimeout(400);const after=await snapshot(page);
 assert.equal(after.time,before.time);assert.equal(after.audible,false);assert.equal(after.context,'suspended');assert.ok(after.frames>before.frames);
 after.eyes.forEach(value=>assert.ok(value>=.99&&value<=1.41));
 const samples=await page.evaluate(()=>window.expressionSamples);assert.ok(samples.some(s=>s.eye>.12&&s.eye<.98),'closing and opening contain intermediate poses');
 return{before,after,samples};
};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+'/about/');await ready(page);await settle(page);
  await page.evaluate(()=>{
   const actor=window.studio.world.actor,update=actor.update;
   window.characterActor=actor;window.characterEyes=actor.root.children[0].children.filter(o=>o.geometry?.parameters.radius===.029);window.expressionSamples=[];
   actor.update=(...args)=>{update(...args);if(window.expressionSamples.length<1000)window.expressionSamples.push({now:performance.now()/1000,eye:window.characterEyes[0].scale.y,time:window.studio.score.time});};
  });
  assert.equal(await page.evaluate(()=>window.characterEyes.length),2);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.evaluate(()=>{window.characterSources=window.studio.score.sources.slice();});
  const paused=await interrupt(page,false);
  await page.screenshot({path:`${output}/character-paused-${viewport.width}.png`});
  await page.waitForFunction(()=>window.characterEyes[0].scale.y<.5,null,{timeout:8000,polling:'raf'});await page.waitForTimeout(300);
  const again=await snapshot(page);assert.equal(again.time,paused.after.time);again.eyes.forEach(value=>assert.ok(value>=.99&&value<=1.41));
  await page.locator('[data-activity="run"]').click();await page.waitForFunction(()=>window.studio.world.model.progress===1);assert.equal((await snapshot(page)).time,paused.after.time);
  // Wait for the event expression to decay before checking the next resting blink.
  await page.waitForTimeout(2200);await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  const interrupted=await interrupt(page,true);assert.equal(interrupted.after.playing,true);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
  const reduced=await snapshot(page);reduced.eyes.forEach(value=>assert.ok(Math.abs(value-1)<1e-4));
  await page.evaluate(()=>{window.expressionSamples=[];window.studio.world.moving=1;});await page.waitForTimeout(600);
  assert.ok((await page.evaluate(()=>window.expressionSamples)).every(s=>Math.abs(s.eye-1)<1e-4));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.evaluate(()=>window.studio.router.navigate('/lab/'));await settle(page);
  const continuity=await page.evaluate(()=>({actor:window.characterActor===window.studio.world.actor,sources:window.characterSources.every((s,i)=>s===window.studio.score.sources[i]),rhythmDifference:Math.abs(window.studio.world.storyFrame.time-window.studio.score.time)}));
  assert.equal(continuity.actor,true);assert.equal(continuity.sources,true);assert.ok(continuity.rhythmDifference<.1);
  const nextPage=await interrupt(page,false);assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({viewport,paused,again,interrupted,reduced,continuity,nextPage});console.log(`PASS character clock ${viewport.width}`);await context.close();
 }
}finally{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(`${output}/character-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({base:report.base,cases:report.cases.length},null,2));
