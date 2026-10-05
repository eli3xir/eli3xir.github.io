import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
import {checkConductorLayout} from './conductor-layout.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
try{
 for(const width of [1440,390]){
  const viewport={width,height:width===390?844:1000};
  const context=await browser.newContext({viewport,...(process.env.CONDUCTOR_VIDEO?{recordVideo:{dir:output,size:viewport}}:{})}),page=await context.newPage(),log=observe(page);
  const video=page.video();await page.goto(server.base+'/radio/');await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(async()=>{
   const T=await import('three'),w=window.studio.world;window.conductorFrames=[];window.conductorRecording=true;
   const sample=()=>{
    if(!window.conductorRecording)return;
    const root=w.model.root;if(w.route.id!=='radio'){requestAnimationFrame(sample);return;}
    root.updateWorldMatrix(true,true);w.actor.root.updateWorldMatrix(true,true);
    const hand=w.actor.root.getObjectByName('mote-right-hand').getWorldPosition(new T.Vector3()),baton=root.getObjectByName('conductor-baton').getWorldPosition(new T.Vector3());
    const pose=w.model.diagnostics().conductor;
    window.conductorFrames.push({now:performance.now()/1000,time:w.score.time,handError:hand.distanceTo(baton),pose});requestAnimationFrame(sample);
   };requestAnimationFrame(sample);
  });
  await page.locator('.record-play').click();await page.waitForFunction(()=>window.studio.score.audible);await page.waitForTimeout(2200);
  const playing=await page.evaluate(()=>window.studio.world.model.diagnostics().conductor);assert.equal(playing.mode,'conducting');assert.ok(playing.presence>.99);
  await page.screenshot({path:`${output}/conductor-playing-${width}.png`});
  for(const name of ['氛围','低音','旋律','节奏'])await page.getByRole('button',{name:name+'声部',exact:true}).click();
  await page.waitForFunction(()=>window.studio.world.model.diagnostics().conductor.mode==='listening');await page.waitForTimeout(750);
  const listening=await page.evaluate(()=>window.studio.world.model.diagnostics().conductor);assert.ok(listening.tilt>.25);assert.ok(listening.rightZ>.7);assert.ok(Math.abs(listening.foot)<.001);
  await page.screenshot({path:`${output}/conductor-listening-${width}.png`});
  await page.getByRole('button',{name:'旋律声部',exact:true}).click();await page.waitForFunction(()=>window.studio.world.model.diagnostics().conductor.mode==='conducting');await page.waitForTimeout(1200);
  await page.evaluate(()=>window.studio.score.setVolume(0));await page.waitForFunction(()=>window.studio.world.model.diagnostics().conductor.mode==='listening');
  await page.evaluate(()=>window.studio.score.setVolume(.45));await page.waitForFunction(()=>window.studio.world.model.diagnostics().conductor.mode==='conducting');
  for(let i=0;i<6;i++){await page.getByRole('button',{name:'旋律声部',exact:true}).click();await page.waitForTimeout(80);}
  await page.locator('.record-play').click();await page.waitForFunction(()=>!window.studio.score.audible);await page.waitForTimeout(1500);
  const rest=await page.evaluate(()=>window.studio.world.model.diagnostics().conductor);assert.ok(Math.abs(rest.leftZ)<.001);assert.ok(Math.abs(rest.rightZ)<.001);assert.equal(rest.mode,'rest');
  await page.screenshot({path:`${output}/conductor-rest-${width}.png`});
  const frames=await page.evaluate(()=>{window.conductorRecording=false;return window.conductorFrames;});
  assert.ok(frames.length>100);const maxHandError=Math.max(...frames.map(f=>f.handError));assert.ok(maxHandError<1e-7,`baton detached ${maxHandError}`);
  for(let i=1;i<frames.length;i++){const dt=frames[i].now-frames[i-1].now;if(dt>.07)continue;assert.ok(Math.abs(frames[i].pose.rightZ-frames[i-1].pose.rightZ)<dt*18+.03,'gesture jumped');}
  let layouts=[];
  if(width===390){
   for(const name of ['氛围','低音','节奏'])await page.getByRole('button',{name:name+'声部',exact:true}).click();
   await page.locator('.record-play').click();await page.waitForFunction(()=>window.studio.score.audible);layouts=await checkConductorLayout(page);
   await page.setViewportSize(viewport);await page.locator('.record-play').click();await page.waitForFunction(()=>!window.studio.score.audible);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.record-play').click();await page.waitForFunction(()=>window.studio.score.audible);await page.waitForTimeout(150);
  const reduced=await page.evaluate(()=>window.studio.world.model.diagnostics().conductor);assert.equal(reduced.mode,'rest');assert.equal(reduced.rightZ,0);
  await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
  assert.equal(await page.evaluate(()=>window.studio.world.actor.root.getObjectByName('mote-head').rotation.x),0);
  assert.equal(await page.evaluate(()=>window.studio.world.scene.getObjectByName('conductor-baton')===undefined),true);
  await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);assert.equal(await page.locator('.record-play').getAttribute('aria-pressed'),'true');
  const memory=await page.evaluate(()=>({ ...window.studio.world.renderer.info.memory}));
  for(let i=0;i<2;i++){await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);}
  assert.deepEqual(await page.evaluate(()=>({...window.studio.world.renderer.info.memory})),memory);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({width,playing,listening,rest,reduced,maxHandError,memory,layouts,frames,errors:log.errors});
  await context.close();if(video)await video.saveAs(`${output}/conductor-${width}.webm`);console.log('PASS conductor',width,frames.length);
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/conductor-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
