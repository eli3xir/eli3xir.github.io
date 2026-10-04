import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const views=[{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:568,height:320},{width:1440,height:1000},{width:1280,height:540}];
const overlap=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
async function layout(page){return page.evaluate(async()=>{
 const T=await import('three'),w=window.studio.world;
 const rect=box=>{const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(w.camera);points.push({x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2});}return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};};
 const elements=['.object-preview','.studio-header','.sound-dock','.chapter-dock'].map(selector=>{const el=document.querySelector(selector);return{selector,visible:el&&getComputedStyle(el).display!=='none',rect:el?.getBoundingClientRect().toJSON()};}).filter(el=>el.visible);
 return{id:w.focused,actor:rect(new T.Box3().setFromObject(w.actor.root)),object:rect(w.model.focusBounds[w.focused]),elements,
  controls:[...document.querySelectorAll('.object-preview button,.object-preview a')].map(el=>({name:el.getAttribute('aria-label')||el.textContent,rect:el.getBoundingClientRect().toJSON(),hit:el.contains(document.elementFromPoint(el.getBoundingClientRect().x+el.offsetWidth/2,el.getBoundingClientRect().y+el.offsetHeight/2))})),
  overflow:document.documentElement.scrollWidth-innerWidth,scroll:scrollY,inert:document.querySelector('.hero-copy').inert,entry:document.querySelector('.object-preview a').getAttribute('href'),memory:{...w.renderer.info.memory,programs:w.renderer.info.programs.length}};
 });}
function assertLayout(data,viewport){
 assert.equal(data.overflow,0);assert.equal(data.scroll,0);assert.equal(data.inert,true);
 for(const name of ['actor','object']){
  const bounds=data[name];assert.ok(bounds.left>=-1&&bounds.right<=viewport.width+1&&bounds.top>=-1&&bounds.bottom<=viewport.height+1,JSON.stringify({viewport,name,bounds}));
  for(const element of data.elements)assert.equal(overlap(bounds,element.rect),false,JSON.stringify({viewport,id:data.id,name,element,bounds}));
 }
 for(const control of data.controls){assert.ok(control.rect.width>=44&&control.rect.height>=44,JSON.stringify(control));assert.equal(control.hit,true,JSON.stringify(control));}
 assert.equal(data.entry,`/${data.id}/`);
}
try{
 for(const viewport of process.env.ROOM_EXPLORER_MENU_ONLY?[]:views){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);await page.goto(server.base);await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-explore]').focus();const scroll=await page.evaluate(()=>scrollY);await page.keyboard.press('Enter');await page.waitForTimeout(150);
  assert.equal(await page.locator('#room-corner-title').evaluate(el=>el===document.activeElement),true);
  const corners=[];for(const id of ['lab','blog','radio','projects','about','skin']){
   await page.waitForTimeout(100);const data=await layout(page);assert.equal(data.id,id);assertLayout(data,viewport);corners.push(data);
   if(['lab','radio','about'].includes(id))await page.screenshot({path:`${output}/room-explorer-${id}-${viewport.width}.png`});
   await page.locator('[data-step="1"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-step="1"]').evaluate(el=>el===document.activeElement),true);
  }
  await page.keyboard.press('Escape');assert.equal(await page.locator('.object-preview').isHidden(),true);assert.equal(await page.locator('[data-explore]').evaluate(el=>el===document.activeElement&&!el.closest('.hero-copy').inert),true);assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<1);
  await page.keyboard.press('Enter');await page.waitForTimeout(100);await page.locator('[data-step="-1"]').click();assert.equal(await page.evaluate(()=>window.studio.world.focused),'skin');await page.locator('.object-preview a').click();await settle(page);
  assert.equal(new URL(page.url()).pathname,'/skin/');assert.equal(await page.locator('.object-preview').isHidden(),true);assert.equal(await page.evaluate(()=>document.body.classList.contains('room-focused')),false);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'six corners, keyboard, controls and route cleanup',viewport,corners,scroll});await context.close();console.log(`PASS room exploration layout and keyboard ${viewport.width}x${viewport.height}`);
 }
 if(!process.env.ROOM_EXPLORER_MENU_ONLY){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),log=observe(page);await page.goto(server.base);await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.evaluate(async()=>{const T=await import('three'),w=window.studio.world;window.originalActor=w.actor.root;window.originalRenderer=w.renderer;window.flightFrames=[];window.flightMargins=[];const original=w.focus.bind(w),frame=w.frame.bind(w);w.focus=id=>{const position=w.actor.root.position.clone(),projection=w.camera.projectionMatrix.clone();original(id);window.flightFrames.push({id,distance:position.distanceTo(w.actor.root.position),projection:Math.max(...projection.elements.map((v,i)=>Math.abs(v-w.camera.projectionMatrix.elements[i])))});};w.frame=now=>{const moving=!!w.focusJourney;frame(now);if(moving){const box=new T.Box3().setFromObject(w.actor.root);let margin=Infinity;for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(w.camera);margin=Math.min(margin,(1-Math.abs(p.x))*innerWidth/2,(1-Math.abs(p.y))*innerHeight/2);}window.flightMargins.push(margin);}};});
  await page.locator('[data-explore]').click();await page.waitForTimeout(350);await page.locator('[data-step="1"]').click();await page.waitForTimeout(180);await page.locator('[data-step="1"]').click();await page.evaluate(()=>window.studio.score.context.suspend());
  await page.waitForFunction(()=>!window.studio.world.focusJourney);await page.waitForTimeout(900);
  const continuous=await page.evaluate(()=>({samples:window.flightFrames,frameCount:window.flightMargins.length,minimumViewportMargin:Math.min(...window.flightMargins),sameActor:window.studio.world.actor.root===window.originalActor,sameRenderer:window.studio.world.renderer===window.originalRenderer}));
  assert.ok(continuous.frameCount>30);assert.ok(continuous.minimumViewportMargin>=0,JSON.stringify(continuous));
  assert.ok(continuous.samples.length===3);assert.ok(continuous.samples.every(s=>s.distance===0&&s.projection<1e-8),JSON.stringify(continuous));assert.equal(continuous.sameActor,true);assert.equal(continuous.sameRenderer,true);assertLayout(await layout(page),{width:390,height:844});
  const resize=[];for(const viewport of [{width:568,height:320},{width:1440,height:1000},{width:320,height:568}]){await page.setViewportSize(viewport);await page.waitForTimeout(1000);const data=await layout(page);assertLayout(data,viewport);resize.push({viewport,data});}
  await page.locator('.preview-close').click();await page.waitForFunction(()=>!window.studio.world.focusJourney);assert.equal(await page.locator('.object-preview').isHidden(),true);assert.equal(await page.evaluate(()=>window.studio.world.actor.root.scale.x),1);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'rapid continuous journey, suspended audio and responsive framing',continuous,resize});await context.close();console.log('PASS continuous room journey, audio and resize');
 }
 for(const viewport of [{width:390,height:844},{width:568,height:320}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);await page.goto(server.base);await ready(page);await settle(page);await page.locator('[data-explore]').click();await page.locator('.menu-toggle').click();
  const links=await page.locator('.studio-nav a').evaluateAll(links=>links.map(a=>{const r=a.getBoundingClientRect();return{text:a.textContent,hit:a.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}));assert.equal(links.length,6);assert.ok(links.every(link=>link.hit),JSON.stringify(links));
  await page.locator('.studio-nav a[href="/about/"]').click();await settle(page);assert.equal(new URL(page.url()).pathname,'/about/');assert.equal(await page.locator('.object-preview').isHidden(),true);assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({name:'expanded navigation clears the focus and sound panels',viewport,links});await context.close();console.log(`PASS focused menu ${viewport.width}`);
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/room-explorer-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
