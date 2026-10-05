import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
import {checkTitleClipping} from './title-clipping.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
async function capture(page,path,options={}){
 await page.evaluate(path=>{
  window.titleFrames=[];window.titleRecording=true;
  window.oldTitleAnimations=[...document.querySelectorAll('.hero-word')].flatMap(word=>word.getAnimations());
  const sample=()=>{
   if(!window.titleRecording)return;
   if(window.studio.route.pathname===path){
    const title=document.querySelector('.hero-title'),rect=title.getBoundingClientRect(),curtain=document.querySelector('.portal-layer');
    // Ask actual CSS hit testing, independently of the runtime circle calculation.
    curtain.style.pointerEvents='auto';let covered=false;
    for(const x of [rect.left+1,(rect.left+rect.right)/2,rect.right-1])for(const y of [rect.top+1,(rect.top+rect.bottom)/2,rect.bottom-1]){
     if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;
     if(document.elementsFromPoint(x,y).some(element=>element.classList.contains('portal-surface')))covered=true;
    }
    curtain.style.removeProperty('pointer-events');
    const a=title.querySelector('.hero-word').getAnimations()[0],score=window.studio.score;
    window.titleFrames.push({now:performance.now(),covered,cover:+curtain.style.getPropertyValue('--portal'),
     progress:a?.effect.getComputedTiming().progress??1,state:a?.playState||'none',start:a?.startTime,
     timeline:document.timeline.currentTime,audio:score.time,audible:score.audible});
   }
   requestAnimationFrame(sample);
  };requestAnimationFrame(sample);
  window.titleNavigation=window.studio.router.navigate(path);
 },path);
 if(options.interrupt||options.reduce||options.resize){
  await page.waitForFunction(path=>window.studio.route.pathname===path,path);
  if(options.interrupt)await page.evaluate(()=>window.studio.score.context.suspend());
  if(options.reduce)await page.emulateMedia({reducedMotion:'reduce'});
  if(options.resize)await page.setViewportSize(options.resize);
 }
 await page.evaluate(()=>window.titleNavigation);await settle(page);
 const result=await page.evaluate(()=>{
  window.titleRecording=false;
  const words=[...document.querySelectorAll('.hero-word')];
  return{frames:window.titleFrames,visible:words.every(word=>getComputedStyle(word).opacity==='1'),
   oldCancelled:window.oldTitleAnimations.every(a=>a.playState==='idle'),
   text:document.querySelector('.hero-title').textContent,activeTitleAnimations:words.flatMap(w=>w.getAnimations()).filter(a=>a.playState==='running'||a.playState==='paused').length,
   focused:document.activeElement===document.querySelector('.hero-title')};
 });
 report.current={path,options,...result};
 assert.ok(result.visible&&result.oldCancelled&&result.focused);assert.equal(result.activeTitleAnimations,0);
 assert.ok(result.frames.length>8);
 if(!options.reduce){
  const first=result.frames.find(frame=>!frame.covered),lastCovered=result.frames.filter(frame=>frame.covered&&frame.now<first?.now).at(-1);
  assert.ok(first&&lastCovered,'record both sides of the curtain edge');
  // A sampled frame can be late. Check the actual scheduled start against the
  // preceding covered sample rather than requiring an arbitrary first opacity.
  assert.ok(first.start===null||first.start>=lastCovered.timeline-1,'title started behind the curtain');
  assert.ok(result.frames.filter(frame=>!frame.covered&&frame.progress>.05&&frame.progress<.95).length>5,'visible title movement');
  assert.ok(result.frames.filter(frame=>frame.covered).every(frame=>frame.progress===0),'title spent animation while covered');
  const start=result.frames.find(frame=>frame.start!==null&&frame.start!==undefined&&frame.state!=='paused');
  if(start?.audible){
   const beat=(start.audio+(start.start-start.timeline)/1000)*112/60;
   const error=Math.abs(beat*2-Math.round(beat*2))/2*60/112;
   assert.ok(error<.035,JSON.stringify({beat,error}));result.beatError=error;
  }
 }
 delete report.current;
 return result;
}
try{
 for(const width of [1440,390]){
  const viewport={width,height:width===390?844:1000},context=await browser.newContext({viewport,
   ...(process.env.TITLE_VIDEO?{recordVideo:{dir:output,size:viewport}}:{})}),page=await context.newPage(),log=observe(page);
  const video=page.video();await page.goto(server.base+'/radio/');await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  report.cases.push({width,name:'silent',...await capture(page,'/blog/')});
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  report.cases.push({width,name:'musical article',...await capture(page,'/blog/65374.html')});
  report.cases.push({width,name:'article title clipping',...await checkTitleClipping(page,output,width)});
  report.cases.push({width,name:'musical experiment',...await capture(page,'/lab/partext.html')});
  report.cases.push({width,name:'audio interruption',...await capture(page,'/radio/',{interrupt:true})});
  if(width===390){
   report.cases.push({width,name:'resize while covered',...await capture(page,'/about/',{resize:{width:851,height:900}})});
   await page.setViewportSize(viewport);
  }
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/projects/',async route=>{await gate;await route.continue();});
  const slow=capture(page,'/projects/');
  await page.waitForFunction(()=>window.studio.world.transition===1);
  await page.waitForTimeout(550);assert.notEqual(await page.evaluate(()=>window.studio.route.id),'projects');release();
  report.cases.push({width,name:'slow destination',...await slow});await page.unroute('**/projects/');
  report.cases.push({width,name:'reduce during reveal',...await capture(page,'/about/',{reduce:true})});
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
  assert.equal(await page.locator('.hero-word').evaluateAll(words=>words.flatMap(word=>word.getAnimations()).length),0);
  await page.screenshot({path:`${output}/title-reduced-${width}.png`});
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);await context.close();
  if(video)await video.saveAs(`${output}/title-reveal-${width}.webm`);
  console.log('PASS title reveal',width);
 }
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),log=observe(page);
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 await page.goto(server.base+'/radio/');await ready(page);await settle(page);
 report.cases.push({name:'no WebGL',...await capture(page,'/blog/')});
 assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);await context.close();
 const negativeContext=await browser.newContext({viewport:{width:390,height:844}}),negativePage=await negativeContext.newPage();
 const source=fs.readFileSync(new URL('../js/experience/title-reveal.js',import.meta.url),'utf8').replace('const reduced=','held=false;const reduced=');
 await negativePage.route('**/js/experience/title-reveal.js',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await negativePage.goto(server.base+'/radio/');await ready(negativePage);await settle(negativePage);
 await assert.rejects(capture(negativePage,'/blog/'),/title started behind the curtain|title spent animation while covered/);
 const coveredMotionFrames=report.current.frames.filter(frame=>frame.covered&&frame.progress>0).length;
 assert.ok(coveredMotionFrames>5);report.cases.push({name:'disabled hold negative control',coveredMotionFrames});delete report.current;
 await negativeContext.close();
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/title-reveal-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
