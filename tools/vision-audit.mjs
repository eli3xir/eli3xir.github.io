import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
import {compareReference,geometryFrame,layout} from './vision-audit-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};let activePage=null,activeLog=null;fs.mkdirSync(output,{recursive:true});
const visionReady=page=>page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready'&&(!window.studio.world||window.studio.world.model.instrumentLevels.vision===1));
const done=page=>page.waitForFunction(()=>window.studio.route.vision.state.phase==='done',null,{timeout:60000});
const sample=fs.readFileSync('assets/vision/astronaut.png');
async function enter(page){await page.goto(server.base+'/projects/');await ready(page);await settle(page);await page.locator('[data-instrument=vision]').click();await visionReady(page);}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page),requests=[];context.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  activePage=page;activeLog=log;await enter(page);assert.ok(!requests.some(r=>/tfjs|weights.bin/.test(r.url)),'model loaded before explicit detection');
  await page.evaluate(()=>{const w=window.studio.world;window.identities={root:w.model.root,actor:w.actor,renderer:w.renderer,photo:w.model.optical.photo};window.heartbeat=0;window.tick=setInterval(()=>window.heartbeat++,16);});
  await page.locator('.vision-run').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='playing',null,{timeout:60000});
  const first=await page.evaluate(()=>{window.studio.world.stop();clearInterval(window.tick);return{report:window.studio.route.vision.state.report,memory:window.studio.route.vision.state.memory,ticks:window.heartbeat};});
  const differences=compareReference(first.report);assert.ok(first.ticks>3);assert.equal(first.memory.numTensors,50);
  const frames=[];for(const p of [0,1.9,2.9,4.7,6.7,7.5,8]){const frame=await geometryFrame(page,p);assert.ok(frame.handError<1e-6,JSON.stringify(frame));frames.push(frame);}
  assert.deepEqual(frames.map(f=>f.visibleBoxes),[0,0,370,370,3,1,1]);assert.equal(frames.at(-1).landmarks,5);
  const final=frames.at(-1),marks=first.report.stages[2].boxes[0].marks;report.lastSampledEndpoint=final.atRequestedTime;assert.equal(await page.evaluate(()=>window.studio.route.vision.state.phase),'done');
  final.points.forEach((p,i)=>{assert.ok(Math.abs(p[0]-(-.12+(marks[i*2]/512-final.origin[0])*final.zoom*1.88-.94))<1e-6);assert.ok(Math.abs(p[1]-(.31+.94-(marks[i*2+1]/512-final.origin[1])*final.zoom*1.88))<1e-6);});
  assert.equal(final.photo.repeat[0],1/final.zoom);assert.ok(Math.abs(final.photo.offset[1]-(1-final.origin[1]-1/final.zoom))<1e-9);
  if(viewport.width<700)await page.evaluate(()=>scrollTo(0,280));await page.screenshot({path:`${output}/vision-final-${viewport.width}.png`});
  // A rerun captures the current pose. Stopping holds all eleven scale planes.
  await page.evaluate(()=>window.studio.world.start());await page.locator('.vision-run').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='playing');await page.evaluate(()=>window.studio.world.stop());
  const before=await geometryFrame(page,1.9);await page.evaluate(()=>document.querySelector('.vision-run').click());const after=await geometryFrame(page,2.5);
  assert.equal(after.progress,before.progress);assert.deepEqual(after.levels,before.levels);assert.equal(after.wheel,before.wheel);assert.match(await page.locator('#vision-status').textContent(),/已停止/);
  await page.evaluate(()=>window.studio.world.start());await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.vision-run').click();await done(page);
  const memories=[];for(let i=0;i<4;i++){await page.locator('.vision-run').click();await done(page);memories.push(await page.evaluate(()=>({worker:window.studio.route.vision.state.memory,gpu:{...window.studio.world.renderer.info.memory}})));}
  assert.ok(memories.every(m=>m.worker.numTensors===50&&m.worker.numBytes===1983400));assert.equal(new Set(memories.map(m=>JSON.stringify(m.gpu))).size,1);
  await page.locator('[data-vision=blank]').click();await page.locator('.vision-run').click();await done(page);assert.deepEqual(await page.evaluate(()=>window.studio.route.vision.state.report.stages.map(s=>s.boxes.length)),[0,0,0]);assert.match(await page.locator('#vision-status').textContent(),/空白试片/);
  await page.locator('.vision-inputs input').setInputFiles({name:'local-portrait.png',mimeType:'image/png',buffer:sample});await visionReady(page);assert.equal(await page.locator('.vision-source').textContent(),'local-portrait.png');await page.locator('.vision-run').click();await done(page);compareReference(await page.evaluate(()=>window.studio.route.vision.state.report));
  await page.locator('.vision-inputs input').setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});await page.waitForFunction(()=>window.studio.route.vision.state.phase==='error');assert.match(await page.locator('#vision-status').textContent(),/PNG、JPEG 或 WebP/);
  await page.locator('[data-vision=sample]').click();await visionReady(page);await page.emulateMedia({reducedMotion:'no-preference'});
  const motion=await page.evaluate(async()=>{const w=window.studio.world,m=w.model,instant=[],frames=[];const pose=()=>[...Object.values(m.instrumentLevels),...m.actorAnchor.position.toArray(),w.layoutScale,w.heroOffset];
   for(const id of ['signal','compiler','vision','compiler','vision']){const before=pose();document.querySelector(`[data-instrument=${id}]`).click();instant.push(Math.max(...pose().map((v,i)=>Math.abs(v-before[i]))));const end=performance.now()+135;while(performance.now()<end){await new Promise(requestAnimationFrame);frames.push(pose());}}
   return{instant,frames,same:w.model.root===window.identities.root&&w.actor===window.identities.actor&&w.renderer===window.identities.renderer&&m.optical.photo===window.identities.photo};});
  assert.ok(motion.same);assert.ok(motion.instant.every(v=>v===0));for(const i of [6,7])assert.ok(Math.max(...motion.frames.map(f=>f[i]))-Math.min(...motion.frames.map(f=>f[i]))<1e-7);
  await visionReady(page);await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{const m=window.studio.world.model.optical;window.oldVision=window.studio.route.vision;window.releases={photo:0,atlas:0,marks:0};m.photo.addEventListener('dispose',()=>window.releases.photo++);m.atlas.addEventListener('dispose',()=>window.releases.atlas++);m.marks.geometry.addEventListener('dispose',()=>window.releases.marks++);});
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);assert.deepEqual(await page.evaluate(()=>window.releases),{photo:1,atlas:1,marks:1});assert.equal(await page.evaluate(()=>window.oldVision.state.image),null);
  assert.ok(requests.every(r=>r.method==='GET'&&new URL(r.url).origin===new URL(server.base).origin));assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({name:'real inference, independent reference, continuous mechanism, local file, blank, resources and cleanup',viewport,differences,firstTicks:first.ticks,frames,memories,motion});await context.close();console.log(`PASS vision behavior ${viewport.width}`);
 }
 {
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page),layouts=[];activePage=page;activeLog=log;
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:568,height:320},{width:1280,height:540},{width:1440,height:1000}]){
   await page.setViewportSize(viewport);await enter(page);await page.locator('.vision-run').click();await done(page);await page.waitForTimeout(100);const result=await layout(page);
   assert.equal(result.overflow,false);assert.ok(result.bounds.left>=-1&&result.bounds.right<=viewport.width+1,JSON.stringify({viewport,result}));
   if(viewport.width<=850){assert.ok(result.bounds.top>=result.textBottom+12,JSON.stringify({viewport,result}));assert.ok(result.bounds.bottom<result.heroHeight-25,JSON.stringify({viewport,result}));}
   assert.ok(result.targets.every(b=>b.height>=44&&b.width>=44));layouts.push({viewport,...result});
  }
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'seven responsive compositions, reduced motion and target sizes',layouts});await context.close();console.log('PASS vision layouts');
 }
 {
  const context=await browser.newContext(),page=await context.newPage(),log=observe(page);activePage=page;activeLog=log;await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await enter(page);await page.locator('.vision-run').click();await done(page);compareReference(await page.evaluate(()=>window.studio.route.vision.state.report));assert.equal(await page.locator('.vision-preview').isVisible(),true);
  await page.screenshot({path:`${output}/vision-no-webgl.png`});assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'real WASM inference and annotated canvas without WebGL'});await context.close();console.log('PASS vision no WebGL');
 }
}catch(error){report.failures.push(error.stack);report.failureState=await activePage?.evaluate(()=>{const s=window.studio?.route?.vision?.state;return s?{phase:s.phase,busy:s.busy,serial:s.serial,progress:s.progress,error:s.error,button:document.querySelector('.vision-run')?.textContent}:null;}).catch(()=>null);report.failureLog=activeLog?{errors:activeLog.errors,failed:activeLog.failed}:null;process.exitCode=1;}
finally{fs.writeFileSync(`${output}/vision-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
