import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
import {rasterCoverage} from './antialiasing-pixels.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
async function choose(page,mode){
 if(!await page.locator('.sound-settings').evaluate(e=>e.open))await page.locator('.sound-settings summary').click();
 await page.getByLabel('画面质量',{exact:true}).selectOption(mode);
 await page.waitForTimeout(100);
}
async function probe(page){return page.evaluate(()=>{
 const w=window.studio.world,c=w.composer,r=w.renderer,aa=w.antialiasing,gl=r.getContext(),saved=r.getRenderTarget();
 w.moving=1;w.frame(performance.now());r.setRenderTarget(aa.sceneTarget);const actualSamples=gl.getParameter(gl.SAMPLES);r.setRenderTarget(saved);
 return{mode:aa.mode,supported:aa.supported,actualSamples,sceneSamples:aa.sceneTarget.samples,otherSamples:c.renderTarget1.samples,fxaa:aa.pass.enabled,
  ratio:r.getPixelRatio(),width:aa.sceneTarget.width,height:aa.sceneTarget.height,resolution:aa.pass.material.uniforms.resolution.value.toArray(),
  sceneBufferReady:!aa.sceneTarget.samples||c.readBuffer===aa.sceneTarget,memory:{...r.info.memory},programs:r.info.programs.length,renderbuffers:window.liveRenderbuffers?.size};
});}
function verify(sample,quality,width){
 const budget=quality==='low'?0:quality==='high'||width>=700?4:2,expected=Math.max(0,...sample.supported.filter(n=>n<=budget));
 assert.equal(sample.sceneSamples,expected);assert.equal(sample.actualSamples,expected);assert.equal(sample.otherSamples,0);assert.equal(sample.fxaa,expected===0);assert.equal(sample.sceneBufferReady,true);
 assert.ok(Math.abs(sample.resolution[0]*sample.width-1)<1e-9);assert.ok(Math.abs(sample.resolution[1]*sample.height-1)<1e-9);
}
try{
 if(!process.env.AA_RESTORE_ONLY)for(const profile of [{width:1440,height:1000,dpr:1},{width:390,height:844,dpr:3},{width:1440,height:1000,dpr:2}]){
  const context=await browser.newContext({viewport:profile,deviceScaleFactor:profile.dpr}),page=await context.newPage(),log=observe(page);
  await page.addInitScript(()=>{
   const proto=WebGL2RenderingContext.prototype,create=proto.createRenderbuffer,remove=proto.deleteRenderbuffer;window.liveRenderbuffers=new Set();
   proto.createRenderbuffer=function(){const buffer=create.call(this);window.liveRenderbuffers.add(buffer);return buffer;};
   proto.deleteRenderbuffer=function(buffer){window.liveRenderbuffers.delete(buffer);return remove.call(this,buffer);};
  });
  await page.goto(server.base+'/projects/');await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const w=window.studio.world;window.aaIdentities=[w.renderer,w.composer,w.camera,w.model,w.actor,w.antialiasing.sceneTarget];});
  const cycles=[];
  for(let cycle=0;cycle<4;cycle++)for(const quality of ['auto','high','low']){await choose(page,quality);const sample=await probe(page);verify(sample,quality,profile.width);cycles.push({cycle,quality,...sample});}
  for(const mode of ['auto','high','low']){
   const samples=cycles.filter(s=>s.quality===mode&&s.cycle>0);assert.equal(new Set(samples.map(s=>JSON.stringify([s.memory,s.programs,s.renderbuffers]))).size,1,JSON.stringify(samples));
  }
  assert.equal(await page.evaluate(()=>{const w=window.studio.world;return[w.renderer,w.composer,w.camera,w.model,w.actor,w.antialiasing.sceneTarget].every((v,i)=>v===window.aaIdentities[i]);}),true);
  await choose(page,'high');await page.locator('.sound-settings summary').click();if(profile.width<700)await page.evaluate(()=>scrollTo(0,280));
  await page.screenshot({path:`${output}/aa-projects-${profile.width}-${profile.dpr}.png`});
  const pixels=await page.evaluate(rasterCoverage),baseline=pixels[0];assert.ok(baseline.interior>4000&&baseline.partial===0,JSON.stringify(pixels));
  assert.ok(pixels[1].partial>100&&pixels[1].mse<baseline.mse,JSON.stringify(pixels));
  for(const p of pixels){assert.equal(p.nonfinite,0);if(p.actualSamples>0)assert.ok(p.partial>100&&p.mse<baseline.mse*.8,JSON.stringify(pixels));}
  await page.setViewportSize({width:profile.width<700?844:390,height:profile.width<700?390:844});await choose(page,'auto');const resized=await probe(page);verify(resized,'auto',profile.width<700?844:390);
  await page.emulateMedia({reducedMotion:'reduce'});const reduced=await probe(page);verify(reduced,'auto',profile.width<700?844:390);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'quality, actual samples, pixel coverage, stable resources and resize',profile,cycles,pixels,resized,reduced});await context.close();console.log('PASS antialiasing',profile.width,profile.dpr);
 }
 if(!process.env.AA_RESTORE_ONLY)for(const support of ['none','depth-mismatch','two-only']){
  const context=await browser.newContext(),page=await context.newPage(),log=observe(page);
  await page.addInitScript(support=>{
   const proto=WebGL2RenderingContext.prototype,original=proto.getInternalformatParameter;
   proto.getInternalformatParameter=function(target,format,pname){
    if(pname===this.SAMPLES&&(format===this.RGBA16F||format===this.DEPTH_COMPONENT24))return new Int32Array(support==='none'?[]:support==='two-only'?[2]:format===this.RGBA16F?[4]:[2]);
    return original.call(this,target,format,pname);
   };
  },support);
  await page.goto(server.base+'/radio/');await ready(page);await settle(page);await choose(page,'high');const result=await probe(page);
  assert.equal(result.actualSamples,support==='two-only'?2:0);assert.equal(result.fxaa,support!=='two-only');
  const frames=await page.evaluate(()=>window.studio.world.renderedFrames);await page.waitForTimeout(120);assert.ok(await page.evaluate(()=>window.studio.world.renderedFrames)>frames);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'format support fallback',support,result});await context.close();console.log('PASS antialiasing fallback',support);
 }
 {
  const context=await browser.newContext(),page=await context.newPage(),log=observe(page);await page.goto(server.base+'/projects/');await ready(page);await settle(page);
  await choose(page,'low');await choose(page,'high');
  await page.locator('.sound-settings summary').click();await page.screenshot({path:`${output}/aa-before-restore.png`});
  await page.evaluate(()=>{const w=window.studio.world,ext=w.renderer.getContext().getExtension('WEBGL_lose_context');window.aaRestore=()=>ext.restoreContext();window.framesBeforeLoss=w.renderedFrames;ext.loseContext();});
  await page.waitForFunction(()=>window.studio.world.renderer.getContext().isContextLost());await page.evaluate(()=>window.aaRestore());
  await page.waitForFunction(()=>!window.studio.world.renderer.getContext().isContextLost()&&window.studio.world.renderedFrames>window.framesBeforeLoss+3);
  const restored=await probe(page);verify(restored,'high',1280);await page.screenshot({path:`${output}/aa-after-restore.png`});await page.locator('[data-instrument=compiler]').click();await page.waitForFunction(()=>window.studio.world.model.instrumentLevels.compiler===1);
  await page.locator('[data-source="x := (2 + 3) * 4;"]').click();await page.waitForFunction(()=>window.studio.route.compiler.state.phase==='done');assert.equal(await page.evaluate(()=>window.studio.route.compiler.state.program.result),20);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'context restoration keeps rendering and real expression input',restored});await context.close();console.log('PASS antialiasing context restoration');
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/antialiasing-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
