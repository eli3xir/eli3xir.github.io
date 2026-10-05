import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';

const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,date:new Date().toISOString(),cases:[],failures:[]};
fs.mkdirSync(output,{recursive:true});
async function run(name,action,{shaderError=false,reducedMotion='no-preference'}={}){
 if(process.env.SHADER_CASE&&!name.includes(process.env.SHADER_CASE))return;
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion}),page=await context.newPage(),log=observe(page),result={name};
 try{
  await page.goto(server.base+'/about/');await ready(page);await settle(page);
  await action(page,result);
  if(shaderError)assert.ok(log.errors.some(error=>error.includes('THREE.WebGLProgram')),'real invalid GLSL must still be reported');
  else assert.deepEqual(log.errors,[]);
  assert.deepEqual(log.failed,[]);result.ok=true;console.log('PASS',name);
 }catch(error){result.error=error.stack;report.failures.push(name);console.log('FAIL',name,error.message);}
 finally{result.errors=log.errors;result.failed=log.failed;report.cases.push(result);await context.close();}
}
async function hold(page){
 await page.evaluate(()=>{
  const w=window.studio.world,gl=w.renderer.getContext(),get=gl.getProgramParameter;
  window.shaderPolls=0;window.holdShaders=true;
  gl.getProgramParameter=function(program,pname){if(pname===37297&&window.holdShaders){window.shaderPolls++;return false;}return get.call(this,program,pname);};
  window.restoreShaderQueries=()=>{gl.getProgramParameter=get;window.holdShaders=false;};
 });
}
try{
 await run('all chapter and experiment models prepare against the shared compositor',async(page,result)=>{
  result.routes=[];
  const routes=['/radio/','/blog/','/projects/','/lab/','/skin/','/',...['ocean','partext','moon','fluid','trails','galaxy','glass','breakout','bullet'].map(id=>`/lab/${id}.html`),'/about/'];
  await page.evaluate(()=>{window.shaderRig=[window.studio.world.renderer,window.studio.world.actor];});
  for(const path of routes){
   await page.evaluate(path=>window.studio.router.navigate(path),path);await settle(page);await ready(page);
   if(path==='/skin/')await page.waitForFunction(()=>window.studio.world.model.previewStatus==='ready');
   await page.evaluate(()=>window.studio.world.whenRenderReady());
   const frames=await page.evaluate(()=>window.studio.world.renderedFrames);
   await page.waitForFunction(frames=>window.studio.world.renderedFrames>frames,frames);
   const state=await page.evaluate(()=>{const w=window.studio.world;return{...w.diagnostics(),same:w.renderer===window.shaderRig[0]&&w.actor===window.shaderRig[1],checks:w.renderer.debug.checkShaderErrors};});
   assert.equal(state.shaders.state,'ready');assert.ok(state.same&&state.checks);result.routes.push({path,state});
  }
 });
 for(const leave of [false,true])await run(`late room attachment ${leave?'after leaving stays inactive':'prepares the selected preview'}`,async(page,result)=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/room/room.glb',async route=>{await gate;await route.continue();});
  try{
   await page.evaluate(()=>{
    const w=window.studio.world,prepare=w.prepareRender;window.shaderCalls=[];
    w.prepareRender=function(){window.shaderCalls.push({route:this.route.id,preview:this.model.previewStatus});return prepare.call(this);};
   });
   await page.evaluate(()=>window.studio.router.navigate('/skin/'));await settle(page);
   assert.equal(await page.evaluate(()=>window.studio.world.model.previewStatus),'loading');
   await page.locator('[data-preview-skin="ocean"]').click();
   await page.evaluate(()=>{window.delayedPreview=window.studio.world.model;});
   if(leave){await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);}
   const count=await page.evaluate(()=>window.shaderCalls.length);release();
   await page.evaluate(()=>window.delayedPreview.ready);await page.evaluate(()=>window.studio.world.whenRenderReady());
   result.calls=await page.evaluate(()=>window.shaderCalls);
   if(leave){assert.equal(result.calls.length,count);assert.equal(await page.evaluate(()=>window.studio.world.route.id),'about');}
   else{
    assert.ok(result.calls.some(call=>call.route==='skin'&&call.preview==='ready'));
    assert.equal(await page.evaluate(()=>window.studio.world.model.selected),'ocean');
    assert.equal(await page.evaluate(()=>window.studio.world.shaderStatus.state),'ready');
   }
  }finally{release();}
 });
 await run('preparation preserves frozen physical materials and clipping pixels',async(page,result)=>{
  result.pixels=[];
  for(const path of ['/about/','/projects/','/lab/glass.html','/']){
   await page.evaluate(path=>window.studio.router.navigate(path),path);await ready(page);await settle(page);await page.evaluate(()=>window.studio.world.whenRenderReady());
   const pixels=await page.evaluate(async()=>{
    const w=window.studio.world,r=w.renderer,frame=w.frame;w.stop();w.frame=()=>{};
    const read=()=>{w.composer.render(0);w.composer.render(0);const gl=r.getContext(),data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
    const before=read();await w.prepareRender();const after=read();let sum=0,changed=0,bright=0;
    for(let i=0;i<before.length;i+=4){if(after[i]+after[i+1]+after[i+2]>180)bright++;for(let c=0;c<3;c++){const delta=Math.abs(before[i+c]-after[i+c]);sum+=delta;if(delta>2)changed++;}}
    w.frame=frame;w.last=performance.now();w.start();return{mean:sum/(before.length*.75),changed:changed/(before.length*.75),bright,checks:r.debug.checkShaderErrors};
   });
   assert.ok(pixels.mean<.05&&pixels.changed<.001&&pixels.bright>5000&&pixels.checks,JSON.stringify(pixels));result.pixels.push({path,...pixels});
  }
 });
 await run('covered navigation yields to UI and sound while shaders are pending',async(page,result)=>{
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await hold(page);
  await page.evaluate(()=>{
   const s=window.studio;window.shaderSources=[...s.score.sources];window.shaderNavigation=s.router.navigate('/radio/');
  });
  await page.waitForFunction(()=>window.studio.world.route.id==='radio'&&window.studio.world.preparingRender&&window.shaderPolls>0);
  result.waiting=await page.evaluate(async()=>{
   const s=window.studio,w=s.world,frames=w.renderedFrames,audio=s.score.time,start=performance.now();let ticks=0;
   while(performance.now()-start<300){await new Promise(requestAnimationFrame);ticks++;}
   return{ticks,draws:w.renderedFrames-frames,audio:s.score.time-audio,covered:w.transition===1,busy:s.router.busy,target:w.renderer.getRenderTarget()===null,checks:w.renderer.debug.checkShaderErrors};
  });
  assert.ok(result.waiting.ticks>=5);assert.equal(result.waiting.draws,0);assert.ok(result.waiting.audio>.2);
  assert.ok(result.waiting.covered&&result.waiting.busy&&result.waiting.target&&result.waiting.checks);
  await page.evaluate(()=>{window.restoreShaderQueries();return window.shaderNavigation;});await settle(page);
  assert.equal(await page.evaluate(()=>window.studio.score.sources.every((source,i)=>source===window.shaderSources[i])),true);
 });
 await run('bounded wait, explicit cancellation and target restoration',async(page,result)=>{
  result.boundaries=await page.evaluate(async()=>{
   const {prepareShaders}=await import('/js/world/shader-preparation.js'),T=await import('three'),w=window.studio.world,r=w.renderer;
   w.stop();const target=new T.WebGLRenderTarget(8,8),scene=new T.Scene(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial({color:0xff4321}));scene.add(mesh);
   const originalCompile=r.compile;let calls=0;
   r.compile=function(...args){const result=originalCompile.apply(this,args);for(const program of r.info.programs){program.isReady=()=>{calls++;return false;};}return result;};
   r.setRenderTarget(target);
   const pending=prepareShaders(r,scene,w.camera,w.composer.readBuffer,{timeout:120});
   const restored=r.getRenderTarget()===target;const timeout=await pending;
   const controller=new AbortController(),aborted=prepareShaders(r,scene,w.camera,w.composer.readBuffer,{signal:controller.signal});controller.abort();
   const cancel=await aborted,before=calls;await new Promise(resolve=>setTimeout(resolve,80));
   r.setRenderTarget(null);r.compile=originalCompile;target.dispose();mesh.geometry.dispose();mesh.material.dispose();
   return{restored,timeout,cancel,afterCancelQueries:calls-before};
  });
  assert.ok(result.boundaries.restored);assert.equal(result.boundaries.timeout.state,'timeout');assert.equal(result.boundaries.cancel.state,'cancelled');assert.equal(result.boundaries.afterCancelQueries,0);
 });
 await run('leaving a preparing model detaches now and releases it after driver work',async(page,result)=>{
  await hold(page);
  await page.evaluate(async()=>{
   const {preparePath}=await import('/js/experience/route-assets.js'),{routeFor}=await import('/js/experience/domain.js');
   await preparePath('/radio/');const w=window.studio.world;w.show(routeFor('/radio/'));window.abandonedShaderWait=w.renderReady;
   window.departingModel=w.model;window.departingDisposed=false;const dispose=w.model.dispose;
   w.model.dispose=function(){window.departingDisposed=true;return dispose?.call(this);};
  });
  await page.waitForFunction(()=>window.shaderPolls>0);
  result.swap=await page.evaluate(async()=>{
   const s=window.studio,w=s.world;w.show(s.route);
   const detached=!window.departingModel.root.parent,retained=!window.departingDisposed;
   window.restoreShaderQueries();const abandoned=await window.abandonedShaderWait;await w.whenRenderReady();
   return{abandoned,current:w.shaderStatus.state,route:w.route.id,detached,retained,released:window.departingDisposed};
  });
  assert.equal(result.swap.abandoned.state,'ready');assert.equal(result.swap.current,'ready');assert.equal(result.swap.route,'about');
  assert.ok(result.swap.detached&&result.swap.retained&&result.swap.released);
 });
 await run('context loss during preparation releases navigation and restores rendering',async(page,result)=>{
  await hold(page);
  await page.evaluate(()=>{window.shaderNavigation=window.studio.router.navigate('/radio/');});
  await page.waitForFunction(()=>window.studio.world.route.id==='radio'&&window.studio.world.preparingRender&&window.shaderPolls>0);
  await page.evaluate(()=>{const gl=window.studio.world.renderer.getContext();window.loseShaders=gl.getExtension('WEBGL_lose_context');window.loseShaders.loseContext();});
  await page.waitForFunction(()=>!window.studio.world.preparingRender);
  result.lost=await page.evaluate(()=>window.studio.world.shaderStatus);assert.equal(result.lost.state,'context-lost');
  await page.evaluate(()=>window.shaderNavigation);await settle(page);
  await page.evaluate(()=>{window.restoreShaderQueries();window.loseShaders.restoreContext();});
  await page.waitForFunction(()=>!window.studio.world.renderer.getContext().isContextLost()&&!window.studio.world.preparingRender&&window.studio.world.shaderStatus.state==='ready');
  const before=await page.evaluate(()=>window.studio.world.renderedFrames);await page.waitForFunction(before=>window.studio.world.renderedFrames>before,before);
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
 });
 await run('unsupported extension and compilation exception preserve normal rendering',async(page,result)=>{
  result.fallbacks=await page.evaluate(async()=>{
   const {prepareShaders}=await import('/js/world/shader-preparation.js'),w=window.studio.world,r=w.renderer,has=r.extensions.has,compile=r.compile;
   r.extensions.has=function(name){return name==='KHR_parallel_shader_compile'?false:has.call(this,name);};
   const unsupported=await w.prepareRender();r.extensions.has=has;
   r.compile=()=>{throw new Error('controlled preparation exception');};const failed=await w.prepareRender();r.compile=compile;
   const targetRestored=r.getRenderTarget()===null;await w.prepareRender();return{unsupported,failed,targetRestored,checks:r.debug.checkShaderErrors};
  });
  assert.equal(result.fallbacks.unsupported.state,'unsupported');assert.equal(result.fallbacks.failed.state,'failed');assert.ok(result.fallbacks.targetRestored&&result.fallbacks.checks);
  await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
 });
 await run('reduced motion resumes one complete frame after preparation',async(page,result)=>{
  await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
  result.state=await page.evaluate(()=>window.studio.world.diagnostics());assert.equal(result.state.shaders.state,'ready');assert.ok(result.state.renderedFrames>0);
  assert.equal(await page.locator('.hero-word').evaluateAll(words=>words.flatMap(word=>word.getAnimations()).length),0);
 },{reducedMotion:'reduce'});
 await run('invalid GLSL still reaches Three shader diagnostics',async(page,result)=>{
  result.diagnostics=await page.evaluate(async()=>{
   const T=await import('three'),{prepareShaders}=await import('/js/world/shader-preparation.js'),w=window.studio.world,r=w.renderer;w.stop();
   const scene=new T.Scene(),material=new T.ShaderMaterial({vertexShader:'void main(){ gl_Position = vec4(position,1.0); }',fragmentShader:'void main(){ gl_FragColor = invalid_shader_symbol; }'}),mesh=new T.Mesh(new T.BoxGeometry(),material);scene.add(mesh);
   const prepared=await prepareShaders(r,scene,w.camera,w.composer.readBuffer);r.render(scene,w.camera);mesh.geometry.dispose();material.dispose();return{prepared,checks:r.debug.checkShaderErrors};
  });assert.ok(result.diagnostics.checks);
 },{shaderError:true});
}finally{
 fs.writeFileSync(`${output}/shader-preparation-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();if(report.failures.length)process.exitCode=1;
}
