import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
try{
 const cases=[['projects','/projects/',1440],['home','/',1440],['blend','/skin/',1440],['cached','/',1440],['projects','/projects/',390],['blend','/skin/',390],['radio','/radio/',1440],['radio','/radio/',390],['book','/blog/',1440],['book','/blog/',390],['pool','/about/',1440],['pool','/about/',390]];
 for(const [name,path,width] of cases.filter(([name])=>!process.env.RESTORE_CASE||name===process.env.RESTORE_CASE)){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1000}}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+path);await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  if(path==='/skin/')await page.waitForFunction(()=>window.studio.world.model.previewStatus==='ready');
  await page.evaluate(async name=>{
   const T=await import('three'),w=window.studio.world;w.stop();
   if(name==='pool'){w.model.select('swim',{now:100,delay:0,duration:4});for(let i=0;i<=100;i++)w.frame((100+i/60)*1000);}
   if(name==='home')w.model.applySkin('forest');
   if(name==='blend'){
    w.model.applySkin('forest',{now:100,delay:0,duration:1});w.model.update(0,{},0,100.4);
    w.model.applySkin('ocean',{now:100.4,delay:0,duration:1});w.model.update(0,{},0,100.8);
    w.model.applySkin('brick',{now:100.8,delay:0,duration:1});w.model.update(0,{},0,101.1);
   }
   const reflections=w.model.reflections;window.restoreReflections=reflections;
   window.readReflection=()=>{
    if(!reflections)return null;
    const target=new T.WebGLRenderTarget(384,512,{type:T.HalfFloatType,depthBuffer:false}),data=new Uint16Array(384*512*4);
    w.renderer.initRenderTarget(target);w.renderer.copyTextureToTexture(reflections.texture,target.texture);
    w.renderer.readRenderTargetPixels(target,0,0,384,512,data);target.dispose();return data;
   };
   window.reflectionBefore=window.readReflection();
  },name);
  if(name==='cached'){await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);}
  await page.evaluate(()=>{
   const w=window.studio.world;w.stop();window.realWorldFrame=w.frame;w.frame=()=>{};window.restoreIdentities=[w.renderer,w.composer,w.camera,w.model,w.actor];
   window.readFrame=()=>{
    w.composer.render(0);w.composer.render(0);const gl=w.renderer.getContext(),data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
    gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;
   };
   window.frameBefore=window.readFrame();
  });
  await page.screenshot({path:`${output}/restore-${name}-${width}-before.png`});
  const cycles=[];
  for(let cycle=0;cycle<2;cycle++){
   await page.evaluate(()=>{
    const w=window.studio.world,ext=w.renderer.getContext().getExtension('WEBGL_lose_context');window.didRestore=false;
    w.renderer.domElement.addEventListener('webglcontextrestored',()=>{window.didRestore=true;},{once:true});
    window.restoreContext=()=>ext.restoreContext();ext.loseContext();
   });
   await page.waitForFunction(()=>window.studio.world.renderer.getContext().isContextLost());await page.evaluate(()=>window.restoreContext());await page.waitForFunction(()=>window.didRestore);
   const result=await page.evaluate(async()=>{
    const T=await import('three'),w=window.studio.world,after=window.readFrame();let max=0,total=0,changed=0,bright=0;
    for(let i=0;i<after.length;i+=4){if(after[i]+after[i+1]+after[i+2]>180)bright++;for(let c=0;c<3;c++){
     const delta=Math.abs(after[i+c]-window.frameBefore[i+c]);max=Math.max(max,delta);total+=delta;if(delta>2)changed++;
    }}
    const reflection=window.readReflection();let reflectionMax=0,reflectionMean=0;
    if(reflection)for(let i=0;i<reflection.length;i++){
     const a=T.DataUtils.fromHalfFloat(window.reflectionBefore[i]),b=T.DataUtils.fromHalfFloat(reflection[i]),delta=Math.abs(a-b)/Math.max(1,a,b);
     reflectionMax=Math.max(reflectionMax,delta);reflectionMean+=delta/reflection.length;
    }
    return{max,mean:total/(after.length*.75),changed:changed/(after.length*.75),bright,reflectionMax,reflectionMean,
     identities:[w.renderer,w.composer,w.camera,w.model,w.actor].every((v,i)=>v===window.restoreIdentities[i]),reflectionState:window.restoreReflections?.diagnostics(),mode:w.antialiasing.mode};
   });
   cycles.push(result);console.log(name,width,cycle,JSON.stringify(result));await page.screenshot({path:`${output}/restore-${name}-${width}-after.png`});
   assert.equal(result.identities,true);assert.ok(result.bright>5000);assert.ok(result.mean<.05&&result.changed<.001,JSON.stringify(result));
   assert.ok(result.reflectionMax<(name==='blend'?.003:1e-7),JSON.stringify(result));
  }
  await page.screenshot({path:`${output}/restore-${name}-${width}-after.png`});
  await page.evaluate(()=>{const w=window.studio.world;w.frame=window.realWorldFrame;w.last=performance.now();w.start();});
  if(name==='blend'){
   await page.locator('[data-preview-skin="cream"]').click();await page.waitForFunction(()=>window.studio.world.model.reflections.diagnostics().selected==='cream');
  }else if(name==='projects'||name==='cached'){
   await page.locator('[data-instrument=compiler]').click();await page.waitForFunction(()=>window.studio.world.model.instrumentLevels.compiler===1);
   await page.locator('[data-source="x := (2 + 3) * 4;"]').click();await page.waitForFunction(()=>window.studio.route.compiler.state.phase==='done');assert.equal(await page.evaluate(()=>window.studio.route.compiler.state.program.result),20);
  }else if(name==='pool'){
   const before=await page.evaluate(()=>window.studio.world.model.diagnostics().water.injections);
   await page.locator('[data-activity="swim"]').click();await page.waitForFunction(before=>window.studio.world.model.diagnostics().water.injections>before,before);
  }else if(name==='book'){
   const before=await page.evaluate(()=>window.studio.world.model.index);
   await page.getByRole('button',{name:'翻到下一篇'}).click();
   await page.waitForFunction(before=>window.studio.world.model.index!==before,before);
  }else if(name==='radio'){
   await page.locator('.record-play').click();await page.waitForFunction(()=>window.studio.score.audible);
   await page.waitForFunction(()=>window.studio.world.model.diagnostics().armLift<.02);
   const angle=await page.evaluate(()=>window.studio.world.model.diagnostics().recordAngle);await page.waitForTimeout(150);
   assert.notEqual(await page.evaluate(()=>window.studio.world.model.diagnostics().recordAngle),angle);
  }
  if(name==='cached'){await page.evaluate(()=>window.studio.router.navigate('/'));await settle(page);assert.equal(await page.evaluate(()=>window.studio.world.scene.environment===window.restoreReflections.texture),true);}
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name,width,cycles});await context.close();console.log('PASS visual context restoration',name,width);
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/context-restore-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
