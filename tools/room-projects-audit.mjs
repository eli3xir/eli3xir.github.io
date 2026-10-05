import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {ROOM_PROJECTS} from '../js/world/room-projects.js';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),bytes=fs.readFileSync('assets/room/room.glb'),length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
const original=Object.fromEntries(Array.from({length:10},(_,i)=>{
 const name=`note${i}`,node=gltf.nodes.find(n=>n.name===name),attributes=gltf.meshes[node.mesh].primitives[0].attributes,hashes={};
 for(const [attribute,key,size] of [['position','POSITION',3],['uv','TEXCOORD_0',2],['uv1','TEXCOORD_1',2]]){
  const accessor=gltf.accessors[attributes[key]],view=gltf.bufferViews[accessor.bufferView],values=Buffer.alloc(accessor.count*size*4);assert.equal(accessor.componentType,5126);
  for(let j=0;j<accessor.count;j++){const start=(view.byteOffset||0)+(accessor.byteOffset||0)+j*(view.byteStride||size*4);bin.copy(values,j*size*4,start,start+size*4);}hashes[attribute]=sha(values);
 }
 return[name,{hashes,position:node.translation,quaternion:node.rotation||[0,0,0,1]}];
}));
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const navigate=async(page,path)=>{await page.evaluate(path=>window.studio.router.navigate(path),path);await settle(page);};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<700,reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);await page.goto(server.base);await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  const source=await page.evaluate(async()=>{
   const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''),m=window.studio.world.model;
   window.originalNotes=m.notes;const meshes=[];for(const obj of m.notes.meshes){const hashes={};for(const key of ['position','uv','uv1'])hashes[key]=await digest(obj.geometry.attributes[key].array.buffer);
    meshes.push({name:obj.name,hashes,position:obj.position.toArray(),quaternion:obj.quaternion.toArray(),channel:obj.material.map.channel,lightMapChannel:obj.material.lightMap.channel,project:obj.userData.roomProject});}
   return{meshes,maps:new Set(m.notes.meshes.map(obj=>obj.material.map)).size,atlas:[m.notes.map.image.width,m.notes.map.image.height],version:m.notes.map.version};
  });
  assert.equal(source.meshes.length,10);assert.equal(source.maps,1);assert.deepEqual(source.atlas,[1024,1024]);
  for(const mesh of source.meshes){assert.deepEqual(mesh.hashes,original[mesh.name].hashes);assert.deepEqual(mesh.position,original[mesh.name].position);assert.ok(mesh.quaternion.every((v,i)=>Math.abs(v-original[mesh.name].quaternion[i])<1e-7));assert.equal(mesh.channel,2);assert.equal(mesh.lightMapChannel,1);}
  const entries=[];
  for(const project of ROOM_PROJECTS){
   await page.evaluate(()=>window.studio.world.focus('projects'));await page.waitForTimeout(120);
   const point=await page.evaluate(async name=>{const T=await import('three'),w=window.studio.world,p=w.model.asset.getObjectByName(name).getWorldPosition(new T.Vector3()).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};},project.note);
   if(viewport.width<700)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);await page.waitForFunction(id=>window.studio.world.focused===id,project.id);await page.waitForTimeout(120);
   assert.equal(await page.locator('#room-corner-title').textContent(),project.label);assert.equal(await page.locator(`[data-room-project="${project.id}"]`).getAttribute('aria-pressed'),'true');
   await page.screenshot({path:`${output}/room-project-${project.anchor}-${viewport.width}.png`});
   await page.locator('.object-preview a').click();await settle(page);
   assert.equal(new URL(page.url()).pathname,'/projects/');assert.equal(new URL(page.url()).hash,'#'+project.anchor);
   const entry=await page.locator('#'+project.anchor).evaluate(el=>{const title=el.querySelector('h3'),r=title.getBoundingClientRect();return{id:el.id,focused:document.activeElement===el,title:title.textContent,href:el.querySelector('a').href,top:r.top,bottom:r.bottom,header:document.querySelector('.studio-header').getBoundingClientRect().bottom};});
   assert.equal(entry.focused,true);assert.ok(entry.title.includes(project.label));assert.ok(entry.top>=entry.header-1&&entry.bottom<=viewport.height,JSON.stringify(entry));assert.ok(entry.href.startsWith('https://gitee.com/buptsg2019/'));entries.push(entry);
   await navigate(page,'/');await ready(page);
  }
  await navigate(page,'/skin/');await page.waitForFunction(()=>window.studio.world.model.previewStatus==='ready');
  const shared=await page.evaluate(()=>{const m=window.studio.world.model,notes=window.originalNotes;return notes.meshes.every(source=>{const clone=m.root.getObjectByName(source.name);return clone?.material.map===notes.map&&clone.geometry===source.geometry;});});assert.equal(shared,true);
  await page.locator('[data-preview-skin="forest"]').click();await page.waitForTimeout(100);await navigate(page,'/');await ready(page);
  const identity=await page.evaluate(()=>({same:window.studio.world.model.notes===window.originalNotes,version:window.originalNotes.map.version}));assert.equal(identity.same,true);assert.equal(identity.version,source.version);
  await page.evaluate(()=>window.studio.world.focus('project-compiler'));await page.waitForTimeout(100);await page.locator('.preview-close').click();assert.equal(await page.locator('.object-label').isHidden(),true);
  const label=await page.evaluate(()=>{const w=window.studio.world;w.hovered='project-compiler';w.onHover(w.hovered,{clientX:innerWidth-1,clientY:1});const label=document.querySelector('.object-label'),r=label.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,text:label.textContent,whiteSpace:getComputedStyle(label).whiteSpace};});
  assert.ok(label.left>=7&&label.right<=viewport.width-7&&label.top>=7,JSON.stringify(label));assert.equal(label.whiteSpace,'nowrap');assert.equal(label.text,'Pascal-S 编译器');await page.locator('[data-explore]').hover();assert.equal(await page.locator('.object-label').isHidden(),true);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'original notes, one shared atlas, physical picks, actual project anchors and bounded hover',viewport,source,entries,shared,identity,label});await context.close();console.log(`PASS physical project notes ${viewport.width}`);
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  for(const project of ROOM_PROJECTS){await page.goto(`${server.base}/projects/#${project.anchor}`);await ready(page);await settle(page);await page.waitForFunction(id=>document.activeElement.id===id,project.anchor);assert.equal(await page.locator('#'+project.anchor).count(),1);}
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);await context.close();report.cases.push({name:'all three project anchors work on direct entry'});console.log('PASS direct project anchors');
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/room-projects-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
