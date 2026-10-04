import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,note:'Desktop Chromium at desktop and phone dimensions/DPR; not physical-phone performance.',cases:[],failures:[]};
const specs=[['ocean',1.25,1.6],['partext',1.25,1.6],['moon',1.4,1.75,true],['fluid',1.3,1.6],['trails',1.3,1.6],['galaxy',1.3,1.6],['breakout',1.4,1.7,true],['bullet',1.4,1.7,true]];
const global=id=>id==='partext'?'wordExperiment':id+'Experiment';
fs.mkdirSync(output,{recursive:true});
async function open(page,id){await page.goto(server.base+`/lab/${id}.html`);await ready(page);await settle(page);}
async function enter(page,id,{gate=false}={}){
 if(await page.locator('.sound-settings').evaluate(e=>e.open))await page.locator('.sound-settings summary').click();
 await page.locator('.hero-copy .explore-button').click();
 const frame=await(await page.locator('.experiment-frame').elementHandle()).contentFrame();
 if(gate){await frame.locator('.experiment-gate button').click();}
 await frame.waitForFunction(name=>window[name],global(id));
 await page.evaluate(()=>document.querySelector('.experiment-frame').scrollIntoView({block:'center',behavior:'instant'}));
 await frame.waitForFunction(name=>{const d=window[name].diagnostics();return d.active??d.visible;},global(id));return frame;
}
async function choose(page,value){
 if(!await page.locator('.sound-settings').evaluate(e=>e.open))await page.locator('.sound-settings summary').click();
 await page.getByLabel('画面质量',{exact:true}).selectOption(value);
}
async function probe(frame,id){return frame.evaluate(name=>{
 const e=window[name],r=e.renderer,b=r.domElement.getBoundingClientRect();
 return {ratio:r.getPixelRatio(),shadows:r.shadowMap.enabled,width:r.domElement.width,height:r.domElement.height,cssWidth:b.width,cssHeight:b.height,programs:r.info.programs.length,...r.info.memory};
},global(id));}
async function expectQuality(page,frame,id,ratio,shadow,heroRatio){
 await frame.waitForFunction(({name,ratio,shadow})=>{const r=window[name]?.renderer;return r?.getPixelRatio()===ratio&&r.shadowMap.enabled===shadow;},{name:global(id),ratio,shadow});
 const actual=await probe(frame,id);assert.equal(actual.width,Math.floor(actual.cssWidth*ratio));assert.equal(actual.height,Math.floor(actual.cssHeight*ratio));
 const host=await page.evaluate(()=>{const w=window.studio.world;return{ratio:w.renderer.getPixelRatio(),shadows:w.renderer.shadowMap.enabled,key:w.key.castShadow,bloom:w.bloom.enabled,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,mode:document.querySelector('[aria-label="画面质量"]').value};});
 assert.equal(host.ratio,heroRatio);assert.equal(host.shadows,host.mode!=='low');assert.equal(host.key,host.mode!=='low');assert.equal(host.bloom,host.mode!=='low'&&!host.reduced);return actual;
}
async function prepare(frame,id){
 if(['fluid','trails','breakout','bullet'].includes(id)){
  await frame.locator(`[data-${id}-${id==='fluid'?'drop':'launch'}]`).click();
  await frame.waitForTimeout(id==='breakout'?1300:650);
  await frame.locator(`[data-${id}-pause]`).click();
 }
 if(id==='partext')await frame.locator('[data-word-next]').click();
 if(id==='moon')await frame.locator('#land-btn').click();
 if(id==='ocean')await frame.getByRole('button',{name:'加速',exact:true}).press('Space',{delay:300});
 if(id==='galaxy'){await frame.locator('[data-galaxy-band="1"]').click();await frame.locator('[data-galaxy-pause]').click();await frame.waitForFunction(()=>!window.galaxyExperiment.state.state.changing);}
}
async function remember(frame,id){return frame.evaluate(({name,id})=>{
 const e=window[name];window.qualityIdentity={renderer:e.renderer,model:e.model,canvas:e.renderer.domElement,root:e.model?.root};
 const hash=text=>{let n=2166136261;for(let i=0;i<text.length;i++)n=Math.imul(n^text.charCodeAt(i),16777619);return n>>>0;};
 window.qualityState=()=>{
  if(id==='fluid'){const s=e.model.snapshot();return{color:s.color,paused:s.paused,steps:s.field.steps,field:hash(JSON.stringify(s.field))};}
  if(['breakout','bullet'].includes(id))return{paused:e.state.state.paused,time:e.state.state.time,snapshot:hash(JSON.stringify(e.state.snapshot()))};
  if(id==='trails')return e.exposure.snapshot();
  const d=e.diagnostics();
  if(id==='partext')return{text:d.text};
  if(id==='galaxy')return{targetBand:e.state.state.targetBand,paused:e.state.state.paused};
  if(id==='moon')return{elapsed:d.elapsed,mode:d.mode};
  return{time:d.time,speed:d.speed,heading:d.heading};
 };return window.qualityState();
},{name:global(id),id});}
function verifyState(id,before,after){
 if(id==='moon'){assert.ok(after.elapsed>=before.elapsed);assert.notEqual(after.mode,'ready');}
 else if(id==='ocean'){assert.ok(before.speed>0&&after.time>before.time);assert.equal(after.speed,before.speed);assert.equal(after.heading,before.heading);}
 else assert.deepEqual(after,before,`${id}: quality changed the simulation`);
}
try{
 if(!process.env.QUALITY_SPECIAL_ONLY)for(const viewport of [{width:1440,height:1000},{width:390,height:844}])for(const [id,mobile,desktop,shadows=false] of specs){
  if(process.env.QUALITY_CASE&&process.env.QUALITY_CASE!==id)continue;
  const context=await browser.newContext({viewport,deviceScaleFactor:viewport.width<700?3:2}),page=await context.newPage(),log=observe(page);
  await open(page,id);const frame=await enter(page,id);await prepare(frame,id);const before=await remember(frame,id),cycles=[];
  await page.evaluate(()=>{const w=window.studio.world;window.qualityHost=[w.renderer,w.composer,w.model,w.camera];});
  for(let cycle=0;cycle<3;cycle++){
   for(const mode of ['low','high','auto']){
    await choose(page,mode);const ratio=mode==='low'?1:mode==='high'?2:viewport.width<700?mobile:desktop;
    const actual=await expectQuality(page,frame,id,ratio,shadows&&mode!=='low',mode==='auto'?(viewport.width<700?1.25:1.6):ratio);
    await page.waitForTimeout(100);cycles.push({cycle,mode,...actual});
    if(cycle===0&&['moon','fluid','breakout'].includes(id)&&mode!=='auto'){
     await page.locator('.sound-settings summary').click();await page.screenshot({path:`${output}/quality-${id}-${viewport.width}-${mode}.png`});
    }
   }
  }
  const after=await frame.evaluate(()=>window.qualityState());verifyState(id,before,after);
  assert.equal(await page.evaluate(()=>{const w=window.studio.world;return [w.renderer,w.composer,w.model,w.camera].every((object,i)=>object===window.qualityHost[i]);}),true);
  assert.equal(await frame.evaluate(name=>{const e=window[name],old=window.qualityIdentity;return e.renderer===old.renderer&&e.model===old.model&&e.renderer.domElement===old.canvas&&e.model?.root===old.root;},global(id)),true);
  for(let i=0;i<3;i++)for(const key of ['programs','geometries','textures'])assert.equal(cycles[6+i][key],cycles[3+i][key],`${id}: ${key} grows across cycles`);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({id,viewport,before,after,cycles});await context.close();console.log(`PASS quality/state/resources ${id} ${viewport.width}`);
 }
 if(!process.env.QUALITY_CASE){
  // Persistence, another real tab's storage event, clear, invalid stored mode,
  // and responsive auto caps all use the same visible controls and live frame.
  {
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3}),page=await context.newPage(),log=observe(page);
   await open(page,'breakout');await choose(page,'high');await page.reload();await ready(page);await settle(page);
   let frame=await enter(page,'breakout');await expectQuality(page,frame,'breakout',2,true,2);
   const tab=await context.newPage();await tab.goto(server.base+'/lab/?embedded');
   await tab.evaluate(()=>localStorage.setItem('visual-quality','low'));await expectQuality(page,frame,'breakout',1,false,1);
   assert.equal(await page.getByLabel('画面质量',{exact:true}).inputValue(),'low');
   await tab.evaluate(()=>localStorage.clear());await expectQuality(page,frame,'breakout',1.4,true,1.25);
   await page.setViewportSize({width:1440,height:1000});await expectQuality(page,frame,'breakout',1.7,true,1.6);
   await tab.evaluate(()=>localStorage.setItem('visual-quality','invalid'));await page.reload();await ready(page);await settle(page);frame=await enter(page,'breakout');await expectQuality(page,frame,'breakout',1.7,true,1.6);
   assert.equal(await page.getByLabel('画面质量',{exact:true}).inputValue(),'auto');
   assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'persistence, cross-tab, clear, invalid storage, auto resize'});await context.close();console.log('PASS quality persistence and responsive caps');
  }
  {
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,reducedMotion:'reduce'});
   await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage denied','SecurityError');}}));
   const page=await context.newPage(),log=observe(page);await open(page,'breakout');await choose(page,'low');
   let frame=await enter(page,'breakout',{gate:true});await expectQuality(page,frame,'breakout',1,false,1);
   await choose(page,'high');await expectQuality(page,frame,'breakout',2,true,2);
   await page.evaluate(()=>window.studio.router.navigate('/lab/moon.html'));await settle(page);frame=await enter(page,'moon',{gate:true});await expectQuality(page,frame,'moon',2,true,2);
   // A sibling frame, a mismatched origin, or malformed value cannot override
   // the host. These are deliberately synthetic adversarial protocol inputs.
   await frame.evaluate(()=>{
    dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{type:'visual-quality',value:'low'}}));
    dispatchEvent(new MessageEvent('message',{source:parent,origin:'https://invalid.example',data:{type:'visual-quality',value:'low'}}));
    dispatchEvent(new MessageEvent('message',{source:parent,origin:location.origin,data:{type:'visual-quality',value:'invalid'}}));
   });await page.waitForTimeout(120);await expectQuality(page,frame,'moon',2,true,2);
   await page.emulateMedia({reducedMotion:'no-preference'});await expectQuality(page,frame,'moon',2,true,2);
   await page.emulateMedia({reducedMotion:'reduce'});await expectQuality(page,frame,'moon',2,true,2);
   assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'storage denied, delayed reduced gate, SPA navigation, message validation'});await context.close();console.log('PASS quality denied storage and late experiment start');
  }
  {
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3});
   await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
   const page=await context.newPage(),log=observe(page);await open(page,'fluid');const frame=await enter(page,'fluid');
   await frame.locator('[data-fluid-drop]').click();await frame.waitForTimeout(650);await frame.locator('[data-fluid-pause]').click();
   const before=await frame.evaluate(()=>JSON.stringify(window.fluidExperiment.model.snapshot()));
   await choose(page,'low');await choose(page,'high');assert.equal(await frame.evaluate(()=>JSON.stringify(window.fluidExperiment.model.snapshot())),before);
   assert.equal(await frame.evaluate(()=>window.fluidExperiment.renderer),null);assert.deepEqual(log.failed,[]);
   assert.ok(log.errors.every(message=>message.includes('Error creating WebGL context')));report.cases.push({name:'no WebGL: CPU field and controls retained',expectedErrors:log.errors});await context.close();console.log('PASS quality without WebGL');
  }
  {
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3}),page=await context.newPage(),log=observe(page);
   await open(page,'glass');const frame=await enter(page,'glass');await frame.locator('.glass-note [data-glass-action="count"]').click();await frame.locator('[data-glass-freeze]').click();
   const before=await frame.evaluate(()=>({state:window.glassExperiment.state.snapshot(),maps:window.glassExperiment.diagnostics().maps}));
   for(const mode of ['low','high','auto'])await choose(page,mode);
   const after=await frame.evaluate(()=>({state:window.glassExperiment.state.snapshot(),maps:window.glassExperiment.diagnostics().maps}));assert.deepEqual(after,before);
   assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'glass retains live DOM and refraction maps'});await context.close();console.log('PASS quality with live glass DOM');
  }
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/quality-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
