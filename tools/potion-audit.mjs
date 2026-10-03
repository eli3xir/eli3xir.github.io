import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[]};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+'/lab/');await ready(page);await settle(page);
  assert.equal(await page.locator('.lab-card').count(),9);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>!window.studio.score.audible);
  await page.evaluate(()=>{const score=window.studio.score,original=score.cue.bind(score);window.potionCues=[];score.cue=(name,delay=0)=>{if(name==='hover')window.potionCues.push({time:score.time,delay});return original(name,delay);};});
  const state=()=>page.evaluate(()=>{const w=window.studio.world,cap=w.model.root.children.find(o=>o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.height===.15);
    const time=w.reduced.matches?0:window.studio.score.time;
    const liquid=w.model.root.getObjectByName('potion-liquid'),bubbles=w.model.root.getObjectByName('potion-bubbles');
    return{lift:cap.position.y-1.27-Math.sin(time*.7)*.05,tilt:cap.rotation.z,audioTime:window.studio.score.time,cues:window.potionCues.length,
      reaction:liquid.material.uniforms.uReaction.value,bubbles:bubbles.visible,progress:bubbles.material.uniforms.uProgress.value};
  });
  const before=await state(),button=page.getByRole('button',{name:'触发药瓶反应'});
  await button.focus();await page.keyboard.press('Enter');const first=await state();assert.ok(Math.abs(first.lift)<.025,'reaction starts without teleporting');
  await page.waitForTimeout(300);const lifted=await state();assert.ok(lifted.lift>.1);assert.ok(lifted.reaction>.3&&lifted.bubbles&&lifted.progress>0);
  await page.screenshot({path:`${output}/potion-lift-${viewport.width}.png`});
  await button.click();const queued=await state();assert.ok(Math.abs(queued.lift-lifted.lift)<.1,'queuing does not reset the lift');
  await button.click();await button.click();await page.waitForTimeout(2400);
  const returned=await state();assert.equal(returned.audioTime,before.audioTime);assert.ok(Math.abs(returned.lift)<.001);assert.equal(returned.tilt,0);assert.equal(returned.cues,2);
  assert.equal(returned.bubbles,false);assert.equal(returned.reaction,0);
  await page.mouse.click(viewport.width-12,140);await page.waitForTimeout(140);assert.equal((await state()).cues,2);
  // Hit the actual glass, including a scroll needed on smaller screens.
  const hitPoint=()=>page.evaluate(async()=>{const {Vector3}=await import('three'),w=window.studio.world,p=w.model.root.localToWorld(new Vector3(0,-.1,0)).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};});
  let point=await hitPoint();if(point.y>viewport.height-120){await page.evaluate(amount=>scrollBy(0,amount),point.y-viewport.height+170);await page.waitForTimeout(220);point=await hitPoint();}
  await page.mouse.click(point.x,point.y);await page.waitForTimeout(300);assert.ok((await state()).lift>.1);await page.waitForTimeout(1000);assert.ok(Math.abs((await state()).lift)<.001);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await button.click();const timing=await page.evaluate(()=>window.potionCues.at(-1)),phase=(timing.time+timing.delay)*112/60*2;
  assert.ok(Math.abs(phase-Math.round(phase))<.08,'reaction cue starts on a half beat');
  await page.evaluate(()=>window.studio.score.context.suspend());await page.waitForTimeout(1650);assert.ok(Math.abs((await state()).lift)<.001);
  await button.click();await page.waitForTimeout(200);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(180);
  assert.ok(Math.abs((await state()).lift)<.001);assert.equal((await state()).tilt,0);assert.equal((await state()).bubbles,false);
  await button.click();await page.waitForTimeout(150);assert.ok(Math.abs((await state()).lift)<.001);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(120);
  await button.click();await button.click();const count=(await state()).cues;
  await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);await page.waitForTimeout(1300);
  assert.equal(await page.evaluate(()=>window.potionCues.length),count,'leaving cancels queued reaction');
  await page.evaluate(()=>window.studio.router.navigate('/lab/'));await settle(page);assert.equal(await page.getByRole('button',{name:'触发药瓶反应'}).count(),1);
  await page.screenshot({path:`${output}/potion-idle-${viewport.width}.png`});
  const gpu=await page.evaluate(async()=>{
    const T=await import('three'),w=window.studio.world;w.stop();
    const vessel=w.model.root.getObjectByName('potion-vessel'),original=vessel.material.onBeforeCompile;
    let shader;vessel.material.onBeforeCompile=s=>{shader=s;};vessel.material.needsUpdate=true;w.composer.render(0);
    const scene=new T.Scene(),target=new T.WebGLRenderTarget(1,1),pixels=new Uint8Array(4);
    const quad=new T.Mesh(new T.PlaneGeometry(2,2),new T.ShaderMaterial({uniforms:{source:{value:shader.uniforms.transmissionSamplerMap.value}},
      vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D source;void main(){gl_FragColor=texture2D(source,vec2(.03,.97));}',toneMapped:false}));
    scene.add(quad);w.renderer.setRenderTarget(target);w.renderer.render(scene,new T.Camera());w.renderer.readRenderTargetPixels(target,0,0,1,1,pixels);w.renderer.setRenderTarget(null);
    target.dispose();quad.geometry.dispose();quad.material.dispose();vessel.material.onBeforeCompile=original;vessel.material.needsUpdate=true;
    // Upload the initially hidden cloud before measuring repeated reactions.
    w.model.next({now:90,delay:0,duration:1});w.model.update(0,{pulse:0},0,90.4,false);w.composer.render(0);w.model.update(0,{pulse:0},0,91,false);
    const initial={...w.renderer.info.memory},bubbleGeometry=w.model.root.getObjectByName('potion-bubbles').geometry,shared=w.particles.geometry;
    for(let i=0;i<30;i++){w.model.next({now:100+i*2,delay:0,duration:1});w.model.update(0,{pulse:0},0,100+i*2+.4,false);w.composer.render(0);w.model.update(0,{pulse:0},0,101+i*2,false);}
    const result={transmissionBackground:[...pixels],initial,after:{...w.renderer.info.memory},bubbleIdentity:bubbleGeometry===w.model.root.getObjectByName('potion-bubbles').geometry,sharedIdentity:shared===w.particles.geometry};
    window.potionDisposed=[0,0,0,0];const bubble=w.model.root.getObjectByName('potion-bubbles'),liquid=w.model.root.getObjectByName('potion-liquid');
    [bubble.geometry,bubble.material,liquid.geometry,liquid.material].forEach((resource,i)=>resource.addEventListener('dispose',()=>window.potionDisposed[i]++));
    w.start();return result;
  });
  assert.ok(gpu.transmissionBackground.slice(0,3).every(v=>v>0&&v<64),'glass transmission samples the dark background with shadows enabled');
  assert.deepEqual(gpu.after,gpu.initial);assert.ok(gpu.bubbleIdentity&&gpu.sharedIdentity);
  await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
  const disposed=await page.evaluate(()=>window.potionDisposed);assert.deepEqual(disposed,[1,1,1,1]);gpu.disposed=disposed;
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({viewport,before,first,lifted,queued,returned,point,timing,gpu,errors:log.errors});await context.close();
 }
 const page=await browser.newPage();await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 await page.goto(server.base+'/lab/');await ready(page);await settle(page);assert.equal(await page.locator('.reaction-trigger').count(),0);assert.equal(await page.locator('.lab-card').count(),9);
 report.cases.push({noWebGL:true,originalExperiments:9});await page.close();
}finally{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(`${output}/potion-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
