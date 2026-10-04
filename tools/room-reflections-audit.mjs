import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const navigate=async(page,path)=>{await page.evaluate(path=>window.studio.router.navigate(path),path);await settle(page);};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page),downloads=[];
  page.on('request',request=>{if(request.url().includes('/reflections/'))downloads.push(request.url());});
  await page.goto(server.base);await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  const pixels=await page.evaluate(async()=>{
   const T=await import('three'),w=window.studio.world,r=w.model.reflections;w.stop();if(!r)throw Error(w.model.reflectionError);
   const readTarget=new T.WebGLRenderTarget(384,512,{type:T.HalfFloatType,depthBuffer:false}),data=new Uint16Array(384*512*4);w.renderer.initRenderTarget(readTarget);
   const read=()=>{w.renderer.copyTextureToTexture(r.texture,readTarget.texture);w.renderer.readRenderTargetPixels(readTarget,0,0,384,512,data);return data.slice();};
   const equal=(a,b)=>a.every((value,index)=>value===b[index]);
   r.set('default');const a=read();r.set('forest');const b=read();r.set('default');r.begin('forest');r.blend(.5);const midpoint=read();
   let maxError=0,different=0;for(let i=0;i<a.length;i+=4)for(let c=0;c<3;c++){
    const av=T.DataUtils.fromHalfFloat(a[i+c]),bv=T.DataUtils.fromHalfFloat(b[i+c]),actual=T.DataUtils.fromHalfFloat(midpoint[i+c]);
    maxError=Math.max(maxError,Math.abs(actual-(av+bv)/2)/Math.max(1,av,bv));if(a[i+c]!==b[i+c])different++;
   }
   r.begin('ocean');r.blend(0);const retarget=equal(midpoint,read());r.blend(1);const final=read();r.set('default');r.set('ocean');const endpoint=equal(final,read());
   const old=w.renderer.getRenderTarget(),savedViewport=w.renderer.getViewport(new T.Vector4()).toArray(),savedScissor=w.renderer.getScissor(new T.Vector4()).toArray(),savedTest=w.renderer.getScissorTest();
   w.renderer.setRenderTarget(readTarget);w.renderer.setViewport(1,2,16,12);w.renderer.setScissor(3,4,8,6);w.renderer.setScissorTest(true);r.set('cream');
   const restored=w.renderer.getRenderTarget()===readTarget&&w.renderer.getViewport(new T.Vector4()).toArray().join()==='1,2,16,12'&&w.renderer.getScissor(new T.Vector4()).toArray().join()==='3,4,8,6'&&w.renderer.getScissorTest();
   w.renderer.setRenderTarget(old);w.renderer.setViewport(...savedViewport);w.renderer.setScissor(...savedScissor);w.renderer.setScissorTest(savedTest);readTarget.dispose();r.set('default');
   const materials=new Set();w.model.asset.traverse(node=>{if(node.material)materials.add(node.material);});
   const glass=[...materials].find(mat=>mat.name==='Material_0'),liquids=[...materials].filter(mat=>/^Material_[123567]$/.test(mat.name));
   window.initialReflection=r;window.initialTexture=r.texture;w.last=performance.now();w.start();
   return{maxError,different,retarget,endpoint,restored,glass:{transmission:glass.transmission,opacity:glass.opacity,ior:glass.ior},liquids:liquids.map(m=>({name:m.name,transmission:m.transmission,intensity:m.emissiveIntensity}))};
  });
  assert.ok(pixels.maxError<.002,JSON.stringify(pixels));assert.ok(pixels.different>50000);assert.equal(pixels.retarget,true);assert.equal(pixels.endpoint,true);assert.equal(pixels.restored,true);
  assert.equal(pixels.glass.opacity,1);assert.ok(pixels.glass.transmission>.9);assert.equal(pixels.liquids.length,6);assert.ok(pixels.liquids.every(m=>m.transmission===0&&m.intensity===.18));
  await page.screenshot({path:`${output}/room-reflections-home-${viewport.width}.png`});
  await navigate(page,'/skin/');await page.waitForFunction(()=>window.studio.world.model.previewStatus==='ready');
  const continuous=await page.evaluate(()=>{
   const w=window.studio.world,m=w.model;w.stop();const r=m.reflections,same=r===window.initialReflection&&r.texture===window.initialTexture,samples=[];
   for(let i=0;i<24;i++){const id=['forest','ocean','brick','cream','default'][i%5];m.applySkin(id,{now:100,delay:0,duration:1});m.update(0,{},0,100.3);m.update(0,{},0,101);w.frame(performance.now());samples.push({...w.renderer.info.memory,programs:w.renderer.info.programs.length});}
   m.applySkin('default');w.last=performance.now();w.start();return{same,samples};
  });
  assert.equal(continuous.same,true);for(const key of ['textures','geometries','programs'])assert.equal(Math.max(...continuous.samples.slice(2).map(s=>s[key])),Math.min(...continuous.samples.slice(2).map(s=>s[key])),key);
  await page.evaluate(async()=>{const T=await import('three');window.liveCaptures=0;const original=T.PMREMGenerator.prototype.fromScene;T.PMREMGenerator.prototype.fromScene=function(...args){window.liveCaptures++;return original.apply(this,args);};window.switchFrames=[];window.recordSwitch=true;let last=performance.now();const tick=now=>{window.switchFrames.push(now-last);last=now;if(window.recordSwitch)requestAnimationFrame(tick);};requestAnimationFrame(tick);});
  await page.locator('[data-preview-skin="forest"]').click();await page.waitForTimeout(1600);
  const timing=await page.evaluate(()=>{window.recordSwitch=false;const w=window.studio.world,m=w.model,after=m.reflections.diagnostics();const matrix=[];
   m.root.getObjectByName('same-room-preview').traverse(node=>{if(node.material?.envMap){const shader={uniforms:{},fragmentShader:''};node.material.onBeforeCompile(shader);matrix.push(shader.uniforms.uRoomReflectionRotation.value.elements.slice());}});
   return{frames:window.switchFrames,captures:window.liveCaptures,after,matrix};});
  assert.equal(timing.captures,0);assert.equal(timing.after.selected,'forest');assert.ok(timing.matrix.length>50);assert.ok(timing.matrix.every(m=>m.every(Number.isFinite)));
  await page.screenshot({path:`${output}/room-reflections-skin-${viewport.width}.png`});
  const draws=await page.evaluate(()=>window.studio.world.model.reflections.diagnostics().draws);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>window.studio.world.model.reflections.diagnostics().draws),draws);
  await navigate(page,'/');await ready(page);assert.equal(await page.evaluate(()=>window.studio.world.scene.environment===window.initialTexture),true);
  await navigate(page,'/blog/');assert.equal(await page.evaluate(()=>window.studio.world.scene.environment===window.studio.world.environment),true);
  assert.equal(downloads.length,2,JSON.stringify(downloads));assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({name:'GPU radiance, continuous palette, shared resources and route restoration',viewport,pixels,continuous,timing,downloads});await context.close();console.log(`PASS room reflection pixels, palette and lifecycle ${viewport.width}`);
 }
 for(const failure of ['missing','corrupt','unsupported']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  if(failure==='missing')await page.route('**/assets/room/reflections/manifest.json',route=>route.fulfill({status:404,body:'Missing'}));
  if(failure==='corrupt')await page.route('**/assets/room/reflections/probes.bin',route=>route.fulfill({body:Buffer.from([1,2,3,4]),contentType:'application/octet-stream'}));
  if(failure==='unsupported')await page.addInitScript(()=>{window.DecompressionStream=undefined;});
  await page.goto(server.base);await ready(page);await settle(page);const result=await page.evaluate(()=>({ready:window.studio.world.model.loaded,reflections:!!window.studio.world.model.reflections,error:window.studio.world.model.reflectionError,generic:window.studio.world.scene.environment===window.studio.world.environment}));
  assert.equal(result.ready,true);assert.equal(result.reflections,false);assert.equal(result.generic,true);assert.ok(result.error);
  await navigate(page,'/skin/');await page.waitForFunction(()=>window.studio.world.model.previewStatus==='ready');await page.locator('[data-preview-skin="ocean"]').click();assert.equal(await page.evaluate(()=>window.studio.world.model.selected),'ocean');
  assert.deepEqual(log.errors,[]);assert.ok(log.failed.every(item=>failure==='missing'&&item.status===404&&item.url.endsWith('/assets/room/reflections/manifest.json')));
  report.cases.push({name:failure,result});await context.close();console.log(`PASS reflection fallback ${failure}`);
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/room/reflections/probes.bin',async route=>{await gate;await route.continue();});
  try{
   const requested=page.waitForRequest('**/assets/room/reflections/probes.bin');await page.goto(server.base,{waitUntil:'domcontentloaded'});await requested;
   await page.waitForFunction(()=>window.studio);await page.evaluate(()=>{window.loadingRoom=window.studio.world.model;});
   assert.equal(await page.evaluate(()=>window.loadingRoom.loaded),false);await navigate(page,'/blog/');release();
   await page.waitForFunction(()=>window.loadingRoom.loaded);assert.equal(await page.evaluate(()=>window.studio.world.scene.environment===window.studio.world.environment),true);
   await navigate(page,'/');await ready(page);assert.equal(await page.evaluate(()=>window.studio.world.scene.environment===window.loadingRoom.reflections.texture),true);
   assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'late reflection keeps the active scene and joins the returning room'});console.log('PASS delayed reflection and navigation');
  }finally{release();await context.close();}
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/room-reflections-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
