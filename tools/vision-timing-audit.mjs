import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
import {compareReference} from './vision-audit-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
try{
 const page=await browser.newPage(),log=observe(page);await page.goto(server.base+'/projects/');await ready(page);await settle(page);await page.locator('[data-instrument=vision]').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready');
 for(const size of process.env.VISION_TIMING_ONLY==='1'?[]:[[320,512],[512,320]]){
  await page.evaluate(async([width,height])=>{const image=new Image();image.src='/assets/vision/astronaut.png';await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(image,0,0);await window.studio.route.vision.loadFile(await new Promise(resolve=>canvas.toBlob(resolve)));},size);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.vision-run').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='done');const actual=await page.evaluate(()=>window.studio.route.vision.state.report);
  const differences=compareReference(actual);report.cases.push({name:'non-square input retains coordinates and original stage outputs',size,differences,counts:actual.stages.map(s=>s.boxes.length)});console.log(`PASS vision reference ${size}`);
 }
 await page.locator('[data-vision=sample]').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
 await page.evaluate(()=>{const v=window.studio.route.vision,s=window.studio.score;window.cueTimes=[];const cue=s.cue.bind(s);s.cue=(...args)=>{window.cueTimes.push({args,progress:v.state.progress,phase:v.state.phase,stage:v.state.stage});return cue(...args);};window.launch=null;
  // Observe the actual scheduling boundary, before DOM subscriber/render cost.
  const run=v.run.bind(v);v.run=provider=>run(()=>{const options=provider();window.launch={delay:options.delay,audioBeat:s.time/options.beat,uiBeat:options.beat,startedAt:options.now+options.delay,scheduledAt:performance.now()/1000};return options;});
  v.subscribe(state=>{if(state.phase==='playing'&&window.launch&&window.launch.notificationDelay===undefined)window.launch.notificationDelay=performance.now()/1000-window.launch.scheduledAt;});});
 await page.locator('.vision-run').click();await page.waitForFunction(()=>window.launch);await page.evaluate(()=>window.studio.score.context.suspend());
 const paused=await page.evaluate(()=>window.studio.score.time);await page.waitForFunction(()=>window.studio.route.vision.state.phase==='done');const timing=await page.evaluate(()=>({launch:window.launch,cues:window.cueTimes,pausedNow:window.studio.score.time,progress:window.studio.route.vision.state.progress}));
 report.timing=timing;assert.ok(timing.launch.delay>=-.02&&timing.launch.delay<timing.launch.uiBeat,JSON.stringify(timing));const scheduled=timing.launch.audioBeat+timing.launch.delay/timing.launch.uiBeat;assert.ok(Math.abs(scheduled-Math.round(scheduled))<.06,JSON.stringify(timing));
 assert.ok(Math.abs(timing.pausedNow-paused)<.03);assert.equal(timing.progress,8);assert.deepEqual(timing.cues.filter(c=>c.phase==='playing').map(c=>c.stage),[1,2,3]);assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
 report.cases.push({name:'completion aligns to next music beat; UI sequence completes while audio clock is suspended',timing});console.log('PASS vision audio clock');
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/vision-timing-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
