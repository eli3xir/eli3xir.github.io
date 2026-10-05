import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer();
const browser=await launchBrowser(),report={base:server.base,cases:[]};fs.mkdirSync(output,{recursive:true});
const observations=[];
function watch(page){
 const log=observe(page),pending=new Set();observations.push({page,log,pending});
 page.on('request',request=>pending.add(request));
 for(const event of ['requestfinished','requestfailed'])page.on(event,request=>pending.delete(request));
 return log;
}
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=watch(page);
  if(viewport.width===390)await context.addInitScript(()=>{AudioParam.prototype.cancelAndHoldAtTime=undefined;});
  await page.goto(server.base+'/radio/');await ready(page);await settle(page);
  const diagnostics=()=>page.evaluate(()=>window.studio.world.model.diagnostics());
  const emission=()=>page.evaluate(async()=>{
    const {Vector3}=await import('three'),w=window.studio.world,u=w.particles.material.uniforms,emitter=w.model.particleEmitter;
    const points=[[0,0,0],[.79,0,0],[0,.55,0],[0,0,.79]];
    const error=Math.max(...points.map(p=>new Vector3(...p).applyMatrix4(u.uEmitter.value).applyMatrix4(w.particles.matrixWorld)
      .distanceTo(new Vector3(...p).applyMatrix4(emitter.object.matrixWorld))));
    return{error,enabled:u.uEmission.value,levels:u.uLevels.value.toArray()};
  });
  const idle=await diagnostics();await page.waitForTimeout(200);assert.equal((await diagnostics()).recordAngle,idle.recordAngle);assert.ok(idle.armLift>.99);
  assert.equal((await emission()).enabled,0);
  await page.screenshot({path:`${output}/radio-idle-${viewport.width}.png`});
  await page.locator('.record-play').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.studio.score.audible);await page.waitForTimeout(650);
  const playing=await diagnostics();assert.notEqual(playing.recordAngle,idle.recordAngle);assert.ok(playing.armLift<.02);
  const radiating=await emission();assert.equal(radiating.enabled,1);assert.ok(radiating.levels.some(v=>v>0));assert.ok(radiating.error<1e-7);
  const alignment=[];
  if(viewport.width===390){
    for(const size of [{width:768,height:1024},{width:320,height:568},viewport]){
      await page.setViewportSize(size);await page.evaluate(()=>scrollTo(0,150));await page.waitForTimeout(180);
      const sample=await emission();assert.ok(sample.error<1e-7);alignment.push({size,...sample});
    }
    await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(180);
  }
  await page.evaluate(()=>{window.radioSources=window.studio.score.sources.slice();window.radioMeters=window.studio.score.meters.slice();window.radioParticles=window.studio.world.particles.geometry;});
  // Read actual master PCM to distinguish working mute switches from cosmetic controls.
  const probe=()=>page.evaluate(async()=>{
    const s=window.studio.score,a=s.context.createAnalyser();a.fftSize=1024;s.master.connect(a);const data=new Float32Array(1024);let peak=0;
    for(let i=0;i<6;i++){await new Promise(resolve=>setTimeout(resolve,40));a.getFloatTimeDomainData(data);for(const v of data)peak=Math.max(peak,Math.abs(v));}
    s.master.disconnect(a);a.disconnect();return{peak,levels:Array.from(s.levels())};
  });
  const sound=await probe();assert.ok(sound.peak>.005);
  for(const name of ['氛围','低音','旋律','节奏'])await page.getByRole('button',{name:name+'声部',exact:true}).click();
  assert.match(await page.locator('.record-position').textContent(),/全部声部已关闭/);
  await page.waitForTimeout(350);const silent=await probe();assert.ok(silent.peak<.0001,JSON.stringify(silent));assert.ok(silent.levels.every(level=>level<.0001));
  assert.ok((await emission()).levels.every(v=>v<.0001));
  await page.getByRole('button',{name:'旋律声部',exact:true}).click();await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(()=>window.studio.score.stemEnabled),[false,false,true,false]);
  const melody=await probe();assert.ok(melody.peak>.0001);assert.ok(melody.levels.every((v,i)=>i===2||v<.0001));
  assert.ok((await emission()).levels.every((v,i)=>i===2||v<.0001));
  await page.evaluate(()=>window.studio.score.setVolume(0));await page.waitForTimeout(120);assert.deepEqual((await emission()).levels,[0,0,0,0]);
  await page.evaluate(()=>window.studio.score.setVolume(.45));
  const meterPoint=await page.evaluate(async()=>{const {Vector3}=await import('three'),w=window.studio.world,deck=w.model.root.children[0];w.camera.updateMatrixWorld();deck.updateWorldMatrix(true,true);const p=deck.localToWorld(new Vector3(-.29,-.455,.935)).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};});
  await page.mouse.click(meterPoint.x,meterPoint.y);assert.equal(await page.evaluate(()=>window.studio.score.stemEnabled[1]),true);
  await page.mouse.click(meterPoint.x,meterPoint.y);assert.equal(await page.evaluate(()=>window.studio.score.stemEnabled[1]),false);
  await page.screenshot({path:`${output}/radio-melody-${viewport.width}.png`});
  await page.locator('.record-play').click();await page.waitForFunction(()=>!window.studio.score.audible);await page.waitForTimeout(650);
  const paused=await diagnostics();await page.waitForTimeout(180);assert.equal((await diagnostics()).recordAngle,paused.recordAngle);assert.ok(paused.armLift>.99);
  assert.equal((await emission()).enabled,0);
  // Click the real vinyl surface to resume the original sources.
  const point=await page.evaluate(async()=>{const {Vector3}=await import('three'),w=window.studio.world,deck=w.model.root.children[0];w.camera.updateMatrixWorld();deck.updateWorldMatrix(true,true);const p=deck.localToWorld(new Vector3(-.65,-.195,.16)).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};});
  await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>window.studio.score.audible);
  await page.evaluate(()=>{
    const textures=new Set();window.radioTextureDisposals=[];
    window.studio.world.model.root.traverse(object=>{for(const material of [object.material].flat().filter(Boolean))for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
    for(const texture of textures){const item={name:texture.name,count:0};window.radioTextureDisposals.push(item);texture.addEventListener('dispose',()=>item.count++);}
  });
  await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);assert.equal(await page.evaluate(()=>window.studio.score.listeners.size),1);
  const disposed=await page.evaluate(()=>window.radioTextureDisposals);assert.ok(disposed.length>0);assert.ok(disposed.every(item=>item.count===1),JSON.stringify(disposed));
  await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
  const continuous=await page.evaluate(()=>{const s=window.studio.score;return{sources:s.sources.every((v,i)=>v===window.radioSources[i]),meters:s.meters.every((v,i)=>v===window.radioMeters[i]),particles:window.studio.world.particles.geometry===window.radioParticles,enabled:s.stemEnabled,listeners:s.listeners.size};});
  assert.equal(continuous.sources,true);assert.equal(continuous.meters,true);assert.equal(continuous.particles,true);assert.equal(continuous.listeners,2);assert.deepEqual(continuous.enabled,[false,false,true,false]);
  const resources=[];
  if(viewport.width===1440)for(let cycle=0;cycle<3;cycle++){
    const memory=await page.evaluate(()=>{const r=window.studio.world.renderer;return{...r.info.memory,programs:r.info.programs.length};});resources.push(memory);
    await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
    await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
    assert.deepEqual(await page.evaluate(()=>{const r=window.studio.world.renderer;return{...r.info.memory,programs:r.info.programs.length};}),memory);
  }
  await page.evaluate(()=>window.studio.score.context.suspend());await page.waitForTimeout(700);assert.ok((await diagnostics()).armLift>.99);
  assert.match(await page.locator('.record-play').textContent(),/继续唱片/);await page.locator('.record-play').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const reduced=await diagnostics();await page.waitForTimeout(200);
  assert.equal((await diagnostics()).recordAngle,reduced.recordAngle);assert.deepEqual((await diagnostics()).levels,[0,0,0,0]);
  assert.equal((await emission()).enabled,0);
  await page.reload();await ready(page);await settle(page);assert.deepEqual(await page.evaluate(()=>window.studio.score.stemEnabled),[false,false,true,false]);
  assert.equal(await page.locator('.ep.soon').count(),3);assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({viewport,idle,playing,radiating,alignment,sound,silent,melody,meterPoint,paused,point,continuous,disposed,resources,errors:log.errors});await context.close();
 }
 const context=await browser.newContext(),page=await context.newPage();watch(page);
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 await page.goto(server.base+'/radio/');await ready(page);await settle(page);await page.locator('.record-play').click();await page.waitForFunction(()=>window.studio.score.audible);
 await page.getByRole('button',{name:'低音声部',exact:true}).click();assert.equal(await page.evaluate(()=>window.studio.score.stemEnabled[1]),false);report.cases.push({noWebGL:true,playbackAndStems:true});await context.close();
 const loopPage=await browser.newPage();watch(loopPage);await loopPage.goto(server.base+'/radio/');await ready(loopPage);
 const loop=await loopPage.evaluate(async()=>{
  const {createPhonograph}=await import('/js/world/phonograph.js'),{disposeGroup}=await import('/js/world/materials.js');
  const duration=32*240/112,state={active:true,time:duration-.3,cycle:(duration-.3)/duration,levels:[0,0,0,0]},model=createPhonograph(()=>state);
  for(let i=0;i<90;i++)model.update(0,{},0,i/60,false);
  const frames=[];for(let i=0;i<90;i++){state.time=duration-.3+i/60;state.cycle=(state.time%duration)/duration;model.update(0,{},0,1.5+i/60,false);frames.push(model.diagnostics());}
  model.dispose();disposeGroup(model.root);return frames;
 });
 assert.ok(Math.max(...loop.map(frame=>frame.armLift))>.6);assert.ok(loop.at(-1).armLift<.05);
 for(let i=1;i<loop.length;i++){assert.ok(Math.abs(loop[i].recordAngle-loop[i-1].recordAngle)<.07);assert.ok(Math.abs(loop[i].armYaw-loop[i-1].armYaw)<.09);}
 report.cases.push({loopReturn:true,peakLift:Math.max(...loop.map(frame=>frame.armLift)),finalLift:loop.at(-1).armLift});await loopPage.close();
 for(const viewport of [{width:1024,height:768},{width:1280,height:720},{width:1280,height:600},{width:1920,height:720}]){
  const context=await browser.newContext({viewport}),page=await context.newPage();watch(page);await page.goto(server.base+'/radio/');await ready(page);await settle(page);
  const bounds=await page.evaluate(()=>({panel:document.querySelector('.record-controls').getBoundingClientRect().toJSON(),dock:document.querySelector('.sound-dock').getBoundingClientRect().toJSON()}));
  assert.ok(bounds.panel.bottom<bounds.dock.top-12,JSON.stringify({viewport,bounds}));
  await page.screenshot({path:`${output}/radio-landscape-${viewport.width}-${viewport.height}.png`});
  report.cases.push({viewport,controlsClearDock:true,bounds});await context.close();
 }
 for(const {log} of observations){assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);}
}catch(error){
 report.failure={message:error.stack,pages:[]};
 for(const {page,log,pending} of observations){
  const item={url:page.url(),closed:page.isClosed(),...log.drain(),pending:[...pending].map(request=>request.url())};
  if(!item.closed){
   item.state=await page.evaluate(()=>({title:document.title,readyState:document.readyState,studio:!!window.studio,ready:window.__ready,error:String(window.__error||'')})).catch(error=>({error:error.message}));
   await page.screenshot({path:`${output}/radio-failure-${report.failure.pages.length}.png`,timeout:5000}).catch(()=>{});
  }
  report.failure.pages.push(item);
 }
 throw error;
}finally{fs.writeFileSync(`${output}/radio-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
