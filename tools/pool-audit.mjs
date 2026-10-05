import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[],failures:[]};
fs.mkdirSync(output,{recursive:true});
try{for(const width of [1440,390]){
 const viewport={width,height:width===390?844:1000},context=await browser.newContext({viewport,...(process.env.POOL_VIDEO?{recordVideo:{dir:output,size:viewport}}:{})}),page=await context.newPage(),log=observe(page),video=page.video();
 await page.goto(server.base+'/about/');await ready(page);await settle(page);
 const construction=await page.evaluate(async()=>{
  const T=await import('three'),w=window.studio.world,m=w.model,water=m.root.getObjectByName('leisure-water'),floor=m.root.getObjectByName('leisure-pool-floor');
  m.root.updateWorldMatrix(true,true);const meshes=[];m.root.traverse(o=>{if(o.isMesh&&o!==water)meshes.push(o);});
  const hits=[];
  for(const x of [-.32,.32])for(const z of [-.12,.12]){
   const origin=water.localToWorld(new T.Vector3(x,-.008,z)),direction=new T.Vector3(0,-1,0).transformDirection(water.matrixWorld);
   hits.push(new T.Raycaster(origin,direction).intersectObjects(meshes,false)[0]?.object.name);
  }
  window.poolDisposals=[0,0];[water.material.poolState,floor.material.map].forEach((map,i)=>map.addEventListener('dispose',()=>window.poolDisposals[i]++));
  const after=m.afterActor;window.poolFrames=[];let previous=null;
  m.afterActor=actor=>{
   after(actor);const hands=['left','right'].map(side=>water.worldToLocal(actor.root.getObjectByName('mote-'+side+'-hand').getWorldPosition(new T.Vector3()))),state=m.diagnostics().water;
   let sourceError=0,handError=0,maxArm=0;
   if(previous)for(const source of state.sources){
    const point=new T.Vector3(...source.point),distance=Math.min(...hands.map((hand,i)=>new T.Line3(previous[i],hand).closestPointToPoint(point,true,new T.Vector3()).distanceTo(point)));
    sourceError=Math.max(sourceError,distance);
   }
   for(let i=0;i<2;i++){
    const hand=actor.root.getObjectByName('mote-'+(i?'right':'left')+'-hand');maxArm=Math.max(maxArm,hand.parent.scale.x);
    if(m.actorMotion.swim>.5&&!m.actorMotion.reach){const target=actor.root.localToWorld(m.actorMotion.swimHands[i].clone());handError=Math.max(handError,target.distanceTo(hand.getWorldPosition(new T.Vector3())));}
   }
   previous=hands.map(hand=>hand.clone());
   if(window.poolFrames.length<1500)window.poolFrames.push({time:performance.now(),strength:m.actorMotion.swim,energy:state.energy,peak:state.peak,injections:state.injections,sources:state.sources.length,sourceError,handError,maxArm});
  };
  return{hits,texture:water.material.poolState.image.width+'x'+water.material.poolState.image.height,uploaded:!!w.renderer.properties.get(water.material.poolState).__webglTexture};
 });
 assert.deepEqual(construction.hits,Array(4).fill('leisure-pool-floor'));assert.equal(construction.uploaded,true);
 await page.locator('[data-activity="swim"]').click();await page.waitForFunction(()=>window.studio.world.model.diagnostics().water.injections>20);
 await page.waitForTimeout(850);await page.screenshot({path:`${output}/pool-swimming-${width}.png`});
 await page.locator('[data-activity="run"]').click();await page.waitForTimeout(650);
 const tail=await page.evaluate(()=>window.studio.world.model.diagnostics().water);assert.ok(tail.energy>0);await page.screenshot({path:`${output}/pool-wake-${width}.png`});
 await page.waitForTimeout(2600);const settled=await page.evaluate(()=>window.studio.world.model.diagnostics().water);
 assert.equal(settled.injections,tail.injections);assert.ok(settled.energy<tail.energy*.2);
 const frames=await page.evaluate(()=>window.poolFrames);assert.ok(frames.length>80);assert.ok(frames.some(frame=>frame.sources>0));
 assert.ok(frames.every(frame=>frame.sourceError<1e-7&&frame.handError<1e-7&&frame.maxArm<1.5),JSON.stringify(frames.filter(frame=>frame.sourceError>=1e-7||frame.handError>=1e-7||frame.maxArm>=1.5)));
 assert.ok(frames.every(frame=>Number.isFinite(frame.energy)&&frame.peak<.03));
 // Actual pixels must show the submerged floor; a correct texture hidden by
 // opaque platform geometry is insufficient evidence.
 const visibleFloor=await page.evaluate(()=>{
  const w=window.studio.world;w.stop();const floor=w.model.root.getObjectByName('leisure-pool-floor'),gl=w.renderer.getContext();
  const read=()=>{w.composer.render(0);const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
  const before=read();floor.visible=false;const after=read();floor.visible=true;read();let changed=0;
  for(let i=0;i<before.length;i+=4)if(Math.max(...[0,1,2].map(c=>Math.abs(before[i+c]-after[i+c])))>4)changed++;
  w.start();return changed;
 });assert.ok(visibleFloor>width/30,visibleFloor);
 await page.locator('[data-activity="swim"]').click();await page.waitForTimeout(1200);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(160);
 const reduced=await page.evaluate(()=>{const w=window.studio.world;return{matched:w.reduced.matches,running:w.running,moving:w.moving,progress:w.model.progress,frames:w.renderedFrames,water:w.model.diagnostics().water};});
 assert.equal(reduced.water.energy,0,JSON.stringify({reduced,errors:log.errors}));
 await page.emulateMedia({reducedMotion:'no-preference'});
 const quality=await page.evaluate(async()=>{
  const {setVisualQuality}=await import('/js/experience/visual-quality.js'),w=window.studio.world,map=w.model.root.getObjectByName('leisure-water').material.poolState,result=[];
  for(const value of ['low','high','auto']){setVisualQuality(value);result.push({value,same:map===w.model.root.getObjectByName('leisure-water').material.poolState});}return result;
 });assert.ok(quality.every(item=>item.same));
 const resources=[];
 for(let cycle=0;cycle<3;cycle++){
  await page.evaluate(()=>window.studio.router.navigate('/lab/'));await settle(page);
  assert.deepEqual(await page.evaluate(()=>window.poolDisposals),[1,1]);
  await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
  await page.locator('[data-activity="swim"]').click();await page.waitForFunction(()=>window.studio.world.model.diagnostics().water.injections>20);
  resources.push(await page.evaluate(()=>{const r=window.studio.world.renderer;return{...r.info.memory,programs:r.info.programs.length};}));
 }
 assert.ok(resources.every(item=>JSON.stringify(item)===JSON.stringify(resources[0])),JSON.stringify(resources));
 assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
 report.cases.push({width,construction,frames,tail,settled,visibleFloor,quality,resources});await context.close();if(video)await video.saveAs(`${output}/pool-${width}.webm`);console.log('PASS swimming water',width);
}
 // Suppress the native preference callback to test the frame-loop fallback;
 // disabling that fallback in a served copy must reproduce the frozen wake.
 for(const negative of [false,true]){
  const context=await browser.newContext({viewport:{width:900,height:800}}),page=await context.newPage(),log=observe(page);
  await page.addInitScript(()=>{
   const add=MediaQueryList.prototype.addEventListener;
   window.poolSuppressedCallbacks=0;
   MediaQueryList.prototype.addEventListener=function(type,...args){if(type==='change'&&this.media.includes('prefers-reduced-motion')){window.poolSuppressedCallbacks++;return;}return add.call(this,type,...args);};
  });
  if(negative){
   const source=fs.readFileSync(new URL('../js/world/world.js',import.meta.url),'utf8'),guard='if(reduced!==this.appliedReduced)this.applyMotionPreference();';assert.ok(source.includes(guard));
   await page.route('**/js/world/world.js',route=>route.fulfill({body:source.replace(guard,''),contentType:'text/javascript'}));
  }
  await page.goto(server.base+'/about/');await ready(page);await settle(page);await page.locator('[data-activity="swim"]').click();
  await page.waitForFunction(()=>window.studio.world.model.diagnostics().water.injections>20);
  const before=await page.evaluate(()=>{
   const w=window.studio.world,frame=w.frame,result={energy:w.model.diagnostics().water.energy,progress:w.model.progress,guard:frame.toString().includes('if(reduced!==this.appliedReduced)this.applyMotionPreference();'),suppressed:window.poolSuppressedCallbacks};
   // Both variants enter the same idle render budget. Unrelated resize/font
   // callbacks must not wake the negative control and conceal the missing guard.
   w.frame=function(now){this.moving=0;return frame.call(this,now);};return result;
  });
  assert.equal(before.guard,!negative);assert.ok(before.suppressed>0&&before.energy>0&&before.progress<1,JSON.stringify(before));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(220);
  const result=await page.evaluate(()=>{const w=window.studio.world;return{energy:w.model.diagnostics().water.energy,progress:w.model.progress,bloom:w.bloom.enabled,matched:w.reduced.matches};});
  const accepted=result.energy===0&&result.progress===1&&!result.bloom;assert.equal(accepted,!negative,JSON.stringify(result));
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'missing media callback',negative,accepted,before,...result});await context.close();console.log('PASS preference callback fallback',negative?'negative control':'normal');
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/pool-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
