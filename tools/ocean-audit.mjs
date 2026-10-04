import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[]};
const state=page=>page.evaluate(()=>({audio:window.studio.score.time,...window.studio.world.model.diagnostics()}));
const wind=async(page,value)=>{await page.locator(`[data-wind="${value}"]`).click();await page.waitForFunction(value=>Math.abs(window.studio.world.model.diagnostics().strength-value)<1e-7,value);};
const sailingFrame=async page=>{
 const handle=await page.locator('.experiment-frame').elementHandle(),frame=await handle.contentFrame();assert.ok(frame);
 await frame.waitForURL(url=>url.searchParams.has('embedded'),{waitUntil:'domcontentloaded'});return frame;
};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<700}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+'/lab/ocean.html');await ready(page);await settle(page);
  assert.equal(await page.locator('[data-wind]').count(),3);
  await page.locator('[data-wind="0"]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.studio.world.model.diagnostics().strength===0);
  const calm=await state(page);assert.equal(calm.position[1],-.61);assert.ok(Math.abs(calm.rotation[0])<1e-12);assert.ok(Math.abs(calm.rotation[2])<1e-12);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);await page.locator('.sound-toggle').click();await page.waitForFunction(()=>!window.studio.score.audible);
  const paused=await state(page);await wind(page,1.6);const windy=await state(page);assert.equal(windy.audio,paused.audio);assert.ok(windy.time>paused.time);
  assert.ok(Math.abs(windy.position[1]+.61-Object.values(windy.samples).reduce((a,b)=>a+b,0)/4)<1e-10);
  const redirect=await page.evaluate(()=>{const m=window.studio.world.model,before=m.diagnostics();m.setWind(0,{now:performance.now()/1000,duration:1});return{before,after:m.diagnostics()};});assert.equal(redirect.before.strength,redirect.after.strength);assert.deepEqual(redirect.before.position,redirect.after.position);
  await wind(page,.8);
  const hit=await page.evaluate(async()=>{const {Vector3}=await import('three'),w=window.studio.world,deck=w.model.root.getObjectByName('sailboat-deck');const p=deck.localToWorld(new Vector3(-.10,.025,.56)).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};});
  await page.mouse.click(hit.x,hit.y);await page.waitForFunction(()=>window.studio.world.model.wind===1.6);
  await page.mouse.click(viewport.width-8,120);assert.equal((await state(page)).target,1.6);
  await page.waitForTimeout(1200);await page.screenshot({path:`${output}/ocean-windy-${viewport.width}.png`});
  const gpu=await page.evaluate(async()=>{
    const T=await import('three'),{waveGLSL,waveSample}=await import('/js/world/ocean-waves.js'),w=window.studio.world;
    const target=new T.WebGLRenderTarget(16,1,{type:T.FloatType,format:T.RGBAFormat}),scene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=1;
    const material=new T.ShaderMaterial({vertexShader:'void main(){gl_Position=vec4(position,1.);}',fragmentShader:waveGLSL+'\nvoid main(){float i=floor(gl_FragCoord.x);gl_FragColor=vec4(oceanWave(vec2(i*.173-1.1,i*.097-.8),12.37,1.6),1.);}',toneMapped:false});
    const quad=new T.Mesh(new T.PlaneGeometry(2,2),material);scene.add(quad);w.renderer.setRenderTarget(target);w.renderer.render(scene,camera);const pixels=new Float32Array(64);w.renderer.readRenderTargetPixels(target,0,0,16,1,pixels);w.renderer.setRenderTarget(null);
    let error=0;for(let i=0;i<16;i++){const v=waveSample(i*.173-1.1,i*.097-.8,12.37,1.6);[v.height,v.dx,v.dz].forEach((value,j)=>error=Math.max(error,Math.abs(value-pixels[i*4+j])));}
    target.dispose();quad.geometry.dispose();material.dispose();
    const main=w.model.root.getObjectByName('sailboat-main'),jib=w.model.root.getObjectByName('sailboat-jib');return{error,mainKey:main.material.customProgramCacheKey(),jibKey:jib.material.customProgramCacheKey()};
  });assert.ok(gpu.error<1e-4,JSON.stringify(gpu));assert.notEqual(gpu.mainKey,gpu.jibKey);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  const beat=await page.evaluate(()=>{const s=window.studio.score,cue=s.cue.bind(s);s.cue=(name,delay=0)=>{window.oceanCue={time:s.time,delay};cue(name,delay);};return s.time;});
  await wind(page,0);const cue=await page.evaluate(()=>window.oceanCue);const beatPosition=(cue.time+cue.delay)*112/60*2;assert.ok(Math.abs(beatPosition-Math.round(beatPosition))<.035);assert.ok(beat>=0);
  await page.evaluate(()=>window.studio.score.context.suspend());await wind(page,1.6);assert.equal(await page.evaluate(()=>window.studio.score.audible),false);
  await page.emulateMedia({reducedMotion:'reduce'});await wind(page,0);const reduced=await state(page);await page.waitForTimeout(300);assert.deepEqual((await state(page)).position,reduced.position);
  await page.emulateMedia({reducedMotion:'no-preference'});await wind(page,1.6);
  await page.locator('.hero-copy .explore-button').click();
  const frame=await sailingFrame(page);await frame.waitForFunction(()=>window.oceanExperiment);
  await frame.waitForFunction(()=>window.oceanExperiment.diagnostics().targetWind===1.6);const boatBefore=await frame.evaluate(()=>window.oceanExperiment.diagnostics());
  await frame.locator('[data-helm="KeyW"]').focus();await page.keyboard.down('Enter');await page.waitForTimeout(650);await page.keyboard.up('Enter');
  const accelerated=await frame.evaluate(()=>window.oceanExperiment.diagnostics());assert.ok(accelerated.speed>1);assert.notDeepEqual(accelerated.position,boatBefore.position);
  await frame.locator('[data-helm="KeyA"]').focus();await page.keyboard.down('Space');await page.waitForTimeout(400);await page.keyboard.up('Space');
  const turned=await frame.evaluate(()=>window.oceanExperiment.diagnostics());assert.ok(turned.heading>accelerated.heading+.1);assert.deepEqual(turned.held,[]);
  const button=frame.locator('[data-helm="KeyS"]'),box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.move(box.x+box.width+30,box.y-20);await page.mouse.up();
  const stopped=await frame.evaluate(()=>window.oceanExperiment.diagnostics());assert.equal(stopped.speed,0);assert.deepEqual(stopped.held,[]);
  await frame.locator('#scene').click({position:{x:50,y:230}});await page.keyboard.down('KeyW');await page.waitForTimeout(400);await page.keyboard.up('KeyW');assert.ok((await frame.evaluate(()=>window.oceanExperiment.diagnostics())).speed>.5);
  await page.keyboard.down('KeyS');await page.waitForTimeout(450);await page.keyboard.up('KeyS');
  let touchResult=null;
  if(viewport.width<700){
    const cdp=await context.newCDPSession(page),points=[];
    for(const [i,code] of ['KeyW','KeyA'].entries()){const rect=await frame.locator(`[data-helm="${code}"]`).boundingBox();points.push({id:i+1,x:rect.x+rect.width/2,y:rect.y+rect.height/2});}
    const before=await frame.evaluate(()=>window.oceanExperiment.diagnostics());await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await page.waitForTimeout(450);await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    touchResult=await frame.evaluate(()=>window.oceanExperiment.diagnostics());assert.ok(touchResult.speed>before.speed+1);assert.ok(touchResult.heading>before.heading+.1);assert.deepEqual(touchResult.held,[]);await cdp.detach();
    await page.keyboard.down('KeyS');await page.waitForTimeout(600);await page.keyboard.up('KeyS');
  }
  await page.screenshot({path:`${output}/ocean-sailing-${viewport.width}.png`});
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(600);
  await frame.waitForFunction(()=>!window.oceanExperiment.diagnostics().visible);const hidden=await frame.evaluate(()=>window.oceanExperiment.diagnostics());await page.waitForTimeout(250);assert.equal((await frame.evaluate(()=>window.oceanExperiment.diagnostics())).renderedFrames,hidden.renderedFrames);
  const resources=await page.evaluate(()=>{const w=window.studio.world,m=w.model;window.oceanDisposals=[0,0,0,0];const boat=m.root.getObjectByName('sailboat');const main=boat.getObjectByName('sailboat-main'),jib=boat.getObjectByName('sailboat-jib');const deck=boat.getObjectByName('sailboat-deck');[main.customDepthMaterial,jib.customDepthMaterial,deck.material.map,m.root.getObjectByName('ocean-water').material].forEach((r,i)=>r.addEventListener('dispose',()=>window.oceanDisposals[i]++));window.oldOcean=m;const before={...w.renderer.info.memory};for(let i=0;i<32;i++){m.setWind(i%2?1.6:0,{now:performance.now()/1000,reduced:true});m.update(0,{},0,performance.now()/1000,true);}return{before,after:{...w.renderer.info.memory}};});assert.deepEqual(resources.before,resources.after);
  await page.evaluate(()=>window.studio.router.navigate('/lab/'));await settle(page);const disposal=await page.evaluate(()=>({counts:window.oceanDisposals,callback:window.oldOcean.onPick}));assert.deepEqual(disposal.counts,[1,1,1,1]);assert.equal(disposal.callback,null);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({viewport,calm,windy,redirect,hit,gpu,cue,reduced,boatBefore,accelerated,turned,stopped,touchResult,hidden,resources,disposal});console.log(`PASS ocean ${viewport.width}`);await context.close();
 }
 {
  const context=await browser.newContext(),page=await context.newPage(),log=observe(page),layouts=[];
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390}]){
   await page.setViewportSize(viewport);await page.goto(server.base+'/lab/ocean.html');await ready(page);await settle(page);await page.waitForTimeout(200);
   const layout=await page.evaluate(async()=>{
    const T=await import('three'),w=window.studio.world;w.stop();Object.defineProperty(window.studio.score,'time',{get:()=>4});const now=performance.now(),copy=document.querySelector('.hero-copy').getBoundingClientRect();w.model.setWind(1.6,{now:now/1000,reduced:true});let left=Infinity,right=-Infinity,top=Infinity,anchorError=0;
    for(let i=0;i<160;i++){w.frame(now+i*60);const box=new T.Box3().setFromObject(w.model.root).union(new T.Box3().setFromObject(w.actor.root));
     for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(w.camera);left=Math.min(left,(p.x+1)*innerWidth/2);right=Math.max(right,(p.x+1)*innerWidth/2);top=Math.min(top,(1-p.y)*innerHeight/2);}
     anchorError=Math.max(anchorError,w.model.actorAnchor.getWorldPosition(new T.Vector3()).distanceTo(w.actor.root.position));
    }
    return{left,right,topGap:top-copy.bottom,anchorError,overflow:document.documentElement.scrollWidth-innerWidth};
   });assert.ok(layout.left>=-.1&&layout.right<=viewport.width+.1,JSON.stringify(layout));assert.ok(layout.topGap>8,JSON.stringify(layout));assert.ok(layout.anchorError<1e-8);assert.ok(layout.overflow<=0);
   await page.screenshot({path:`${output}/ocean-layout-${viewport.width}.png`});layouts.push({viewport,...layout});
  }
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'compact wave and sail envelope',layouts});console.log('PASS ocean compact');await context.close();
 }
 {
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+'/lab/ocean.html');await ready(page);await wind(page,1.6);const before=await state(page);await page.waitForTimeout(300);assert.deepEqual((await state(page)).position,before.position);
  await page.locator('.hero-copy .explore-button').click();const frame=await sailingFrame(page);await frame.locator('.experiment-gate button').waitFor();assert.equal(await frame.evaluate(()=>Boolean(window.oceanExperiment)),false);
  await frame.locator('.experiment-gate button').click();await frame.waitForFunction(()=>window.oceanExperiment?.diagnostics().targetWind===1.6&&window.oceanExperiment.diagnostics().renderedFrames>2);assert.equal(await frame.locator('[data-helm]').count(),4);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'reduced motion keeps explicit sailing opt-in and selected weather'});console.log('PASS ocean reduced gate');await context.close();
 }
 {
  const context=await browser.newContext(),page=await context.newPage(),log=observe(page);await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await page.goto(server.base+'/lab/ocean.html');await ready(page);assert.equal(await page.locator('[data-wind]').count(),0);await page.locator('.hero-copy .explore-button').click();
  const frame=await sailingFrame(page);await frame.locator('.ocean-unavailable').waitFor();assert.equal(await page.locator('.experiment-page>a[href="/lab/"]').count(),1);assert.deepEqual(log.errors,[]);
  report.cases.push({name:'no WebGL keeps explanation and return route'});console.log('PASS ocean no WebGL');await context.close();
 }
}finally{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(`${output}/ocean-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({base:report.base,cases:report.cases.length},null,2));
