import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output,publicRoutes} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,pages:[],cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const routes=publicRoutes().filter(route=>/^\/blog\/\d+/.test(route));
async function open(page,path='/blog/41604.html'){await page.goto(server.base+path);await ready(page);await settle(page);await page.waitForFunction(()=>getComputedStyle(document.querySelector('#content')).display==='grid');await page.evaluate(()=>document.fonts.ready);}
async function layout(page,advance=true){return page.evaluate(async advance=>{
 const T=await import('three'),w=window.studio.world;if(advance)w.frame(performance.now());w.model.root.updateMatrixWorld(true);w.actor.root.updateMatrixWorld(true);w.camera.updateMatrixWorld(true);
 const copy=document.querySelector('.hero-copy').getBoundingClientRect(),hero=document.querySelector('.world-hero').getBoundingClientRect(),point=new T.Vector3();
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity,overlap=0;
 for(const root of [w.model.root,w.actor.root])root.traverseVisible(object=>{if(!object.isMesh)return;const positions=object.geometry.attributes.position;for(let i=0;i<positions.count;i++){
  point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld).project(w.camera);const x=(point.x+1)*innerWidth/2,y=(1-point.y)*innerHeight/2;
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  if(x>copy.left-4&&x<copy.right+4&&y>copy.top-4&&y<copy.bottom+4)overlap++;
 }});
 return{left,right,top,bottom,overlap,copyBottom:copy.bottom,heroBottom:hero.bottom,overflow:document.documentElement.scrollWidth-innerWidth,
  font:parseFloat(getComputedStyle(document.querySelector('.post-content')).fontSize),title:document.querySelector('.hero-title').textContent,
  entries:w.route.readingEntries.length,headings:document.querySelectorAll('.post-content h1,.post-content h2,.post-content h3').length,
  validLinks:w.route.readingEntries.every(entry=>document.getElementById(decodeURIComponent(new URL(entry.href,location.href).hash.slice(1)))),book:w.model.diagnostics()};
},advance);}
try{
 for(const viewport of [{width:320,height:568},{width:360,height:740},{width:430,height:932},{width:1280,height:720}]){
  const context=await browser.newContext({viewport}),page=await context.newPage();await open(page,'/blog/59698.html');
  await page.evaluate(()=>{const w=window.studio.world;w.stop();window.turnStart=performance.now()/1000;w.model.next({now:window.turnStart,delay:0,duration:1,reduced:false});});
  const poses=[];
  for(let i=0;i<=20;i++){
   await page.evaluate(i=>window.studio.world.frame((window.turnStart+i/20)*1000),i);const result=await layout(page,false);
   assert.equal(result.overlap,0,JSON.stringify({viewport,i,result}));assert.ok(result.left>=-1&&result.right<=viewport.width+1,JSON.stringify({viewport,i,result}));assert.ok(result.bottom<result.heroBottom-60);
   poses.push({progress:i/20,left:result.left,right:result.right,top:result.top,bottom:result.bottom});
  }
  report.cases.push({name:'full page-turn geometry clears long title',viewport,poses});await context.close();console.log(`PASS continuous chapter composition ${viewport.width}`);
 }
 if(!process.env.ARTICLE_INTERACTION_ONLY)for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);await open(page,routes[0]);
  for(const path of routes){
   if(new URL(page.url()).pathname!==path){await page.evaluate(path=>window.studio.router.navigate(path),path);await settle(page);}
   const result=await layout(page);assert.equal(result.overflow,0,path);assert.equal(result.overlap,0,`${path}: book crosses copy ${JSON.stringify(result)}`);
   assert.ok(result.left>=-1&&result.right<=viewport.width+1,`${path}: book is cropped ${JSON.stringify(result)}`);
   assert.ok(result.bottom<result.heroBottom-60,path);assert.ok(result.font>=16);assert.equal(result.entries,Math.max(1,result.headings));assert.equal(result.validLinks,true);
   assert.equal(await page.locator('.hero-title').textContent(),await page.evaluate(()=>window.studio.route.contentTitle));
   if(result.headings){assert.equal(await page.locator('.studio-toc a').count(),result.headings);assert.equal(await page.locator('.reading-outline').evaluate(e=>e.open),viewport.width>1250);}
   report.pages.push({path,viewport,...result});
   if(['41604','59698','65374','39544'].some(id=>path.includes(id)))await page.screenshot({path:`${output}/article-hero-${path.split('/').pop()}-${viewport.width}.png`});
  }
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);await context.close();console.log(`PASS all 39 article titles, chapters and composed scenes ${viewport.width}`);
 }
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,recordVideo:process.env.RECORD_VIDEO?{dir:output,size:viewport}:undefined}),page=await context.newPage(),log=observe(page);await open(page);
  const motion=await page.evaluate(async()=>{
   const T=await import('three'),w=window.studio.world,model=w.model,start=performance.now()/1000,frames=[];w.stop();
   model.next({now:start,delay:0,duration:1,reduced:false});
   for(const progress of [...Array.from({length:20},(_,i)=>i/20),.999,1]){
    w.frame((start+progress)*1000);w.actor.root.updateMatrixWorld(true);model.root.updateMatrixWorld(true);
    const hand=w.actor.root.getObjectByName('mote-right-hand'),arm=hand.parent,tube=arm.children.find(o=>o.geometry?.type==='CapsuleGeometry'),p=new T.Vector3(),q=new T.Vector3(),params=tube.geometry.parameters;
    const half=params.height/2+params.radius,shoulder=arm.getWorldPosition(new T.Vector3()),palm=hand.getWorldPosition(new T.Vector3());
    const joints=[p.set(0,-half,0).applyMatrix4(tube.matrixWorld).distanceTo(shoulder),q.set(0,half,0).applyMatrix4(tube.matrixWorld).distanceTo(palm)];
    const grip=new T.Vector3().fromArray(model.diagnostics().grip),reach=model.actorMotion.reach;
    frames.push({progress,reach,palm:palm.toArray(),contact:palm.distanceTo(grip),joints,radius:hand.getWorldScale(new T.Vector3()).x});
   }
   w.last=performance.now();w.start();return frames;
  });
  assert.ok(motion.filter(f=>f.reach===1).every(f=>f.contact<1e-5),JSON.stringify(motion));
  assert.ok(motion.every(f=>f.joints.every(error=>error<1e-5)),JSON.stringify(motion));
  assert.ok(Math.max(...motion.map(f=>f.radius))-Math.min(...motion.map(f=>f.radius))<1e-5);
  assert.ok(Math.hypot(...motion.at(-1).palm.map((value,i)=>value-motion.at(-2).palm[i]))<.003,'grasp finishes continuously');
  await page.getByRole('button',{name:'翻到下一节'}).focus();await page.keyboard.press('Enter');await page.waitForTimeout(220);await page.screenshot({path:`${output}/article-turn-${viewport.width}.png`});
  await page.waitForFunction(()=>!window.studio.world.model.turning);const chosen=await page.locator('.reading-title').getAttribute('href');await page.locator('.reading-title').click();
  await page.waitForFunction(href=>location.hash===new URL(href,location.href).hash&&document.activeElement.id===decodeURIComponent(location.hash.slice(1)),chosen);await page.waitForTimeout(800);
  const selected=await page.evaluate(()=>window.studio.world.model.index);assert.ok(selected>=1);
  assert.equal(await page.locator('.studio-toc [aria-current="location"]').getAttribute('href'),new URL(chosen,server.base).hash);
  const frames=await page.evaluate(()=>window.studio.world.renderedFrames);await page.waitForTimeout(160);assert.equal(await page.evaluate(()=>window.studio.world.renderedFrames),frames);
  await page.screenshot({path:`${output}/article-read-${viewport.width}.png`});
  await page.locator('.reading-outline summary').scrollIntoViewIfNeeded();
  if(!await page.locator('.reading-outline').evaluate(e=>e.open))await page.locator('.reading-outline summary').click();
  await page.screenshot({path:`${output}/article-outline-${viewport.width}.png`});const last=page.locator('.studio-toc a').last(),hash=await last.getAttribute('href');await last.click();
  await page.waitForFunction(hash=>location.hash===hash&&document.activeElement.id===decodeURIComponent(hash.slice(1)),hash);
  await page.waitForFunction(()=>window.studio.world.model.index===window.studio.route.readingEntries.length-1,null,{timeout:5000});
  const lastIndex=await page.evaluate(()=>window.studio.route.readingEntries.length-1);assert.equal(await page.evaluate(()=>window.studio.world.model.index),lastIndex);
  if(viewport.width<1251)assert.equal(await page.locator('.reading-outline').evaluate(e=>e.open),false);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(180);assert.equal(await page.evaluate(()=>window.studio.world.model.index),lastIndex);
  await page.screenshot({path:`${output}/article-bookmark-${viewport.width}.png`});
  const memory=await page.evaluate(()=>{const w=window.studio.world,samples=[];for(let i=0;i<60;i++){w.model.select(i%w.route.readingEntries.length);w.frame(performance.now());samples.push({...w.renderer.info.memory});}return samples;});
  assert.ok(Math.max(...memory.map(m=>m.textures))-Math.min(...memory.map(m=>m.textures))<=1);
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'翻到下一节'}).click();assert.equal(await page.evaluate(()=>window.studio.world.model.turning),false);
  await page.waitForFunction(()=>window.renderMathInElement);await page.evaluate(()=>window.studio.router.navigate('/blog/27716.html'));await settle(page);
  await page.waitForFunction(()=>document.querySelector('.post-content .katex'));assert.equal(await page.locator('.studio-toc a').count(),1);
  await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);assert.equal(await page.locator('.reading-outline').count(),0);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({viewport,motion,selected,lastIndex,memory});await context.close();console.log(`PASS book grip, outline, focus and bookmark ${viewport.width}`);
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
  await open(page);await page.getByRole('button',{name:'翻到下一节'}).click();const href=await page.locator('.reading-title').getAttribute('href');await page.locator('.reading-title').click();
  assert.equal(new URL(page.url()).hash,new URL(href,server.base).hash);assert.equal(await page.evaluate(()=>document.activeElement.id),decodeURIComponent(new URL(page.url()).hash.slice(1)));assert.equal(await page.evaluate(()=>window.studio.world),null);
  assert.ok(log.errors.every(error=>error.includes('Error creating WebGL context')));assert.deepEqual(log.failed,[]);report.cases.push({name:'no WebGL chapter selection and focused article'});await context.close();console.log('PASS article navigation without WebGL');
 }
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/blog/transport/*.png',async route=>{await gate;await route.continue();});
  let delayedStyle=false;
  await page.route('**/css/experience.css',async route=>{delayedStyle=true;await new Promise(resolve=>setTimeout(resolve,1200));await route.continue();});
  try{
   await open(page,'/blog/41604.html#section-12');
   await page.waitForFunction(()=>document.activeElement.id==='section-12');
   const positions=()=>page.locator('.post-content h1,.post-content h2,.post-content h3').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top+scrollY));
   assert.equal(delayedStyle,true);const before=await positions(),reserved=await page.locator('.post-content img').evaluateAll(images=>images.map(img=>({height:img.getBoundingClientRect().height,width:img.width,naturalWidth:img.naturalWidth})));
   assert.ok(reserved.every(img=>img.height>0&&img.naturalWidth===0),JSON.stringify(reserved));
   await page.locator('.post-content img').evaluateAll(images=>images.forEach(img=>{img.loading='eager';}));release();
   await page.locator('.post-content img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));await page.waitForTimeout(150);
   const after=await positions();assert.ok(after.every((top,i)=>Math.abs(top-before[i])<1),JSON.stringify({before,after}));
   assert.equal(await page.evaluate(()=>window.studio.world.model.index),12);
   assert.ok(await page.locator('#section-12').evaluate(node=>Math.abs(node.getBoundingClientRect().top-62)<1));
   assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'late images preserve deep link and chapter offsets',viewport,reserved,before,after});
  }finally{release();await context.close();}
  console.log(`PASS delayed image layout and direct deep link ${viewport.width}`);
 }
 {
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();await open(page);
  const images=routes.flatMap(route=>[...fs.readFileSync(new URL('..'+route,import.meta.url),'utf8').matchAll(/<img width="(\d+)" height="(\d+)" loading="lazy" src="([^"]+)"/g)].map(([,width,height,src])=>({src,width:Number(width),height:Number(height)})));
  const dimensions=await page.evaluate(images=>Promise.all(images.map(async expected=>{const img=new Image();img.src=expected.src;await img.decode();return{...expected,decoded:[img.naturalWidth,img.naturalHeight]};})),images);
  assert.equal(dimensions.length,135);assert.ok(dimensions.every(img=>img.width===img.decoded[0]&&img.height===img.decoded[1]));
  report.cases.push({name:'all 135 local dimensions match browser decoders',dimensions});await context.close();console.log('PASS 135 native image dimensions');
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/article-reading-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({pages:report.pages.length,cases:report.cases.length,failures:report.failures}));
