import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const glb=fs.readFileSync('assets/room/room.glb'),length=glb.readUInt32LE(12),gltf=JSON.parse(glb.subarray(20,20+length)),bin=glb.subarray(28+length);
const names=['photo_card','photo_img','painting_canvas'],sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const original=Object.fromEntries(names.map(name=>{
 const node=gltf.nodes.find(node=>node.name===name),attributes=gltf.meshes[node.mesh].primitives[0].attributes,hashes={};
 for(const [attribute,key,size] of [['position','POSITION',3],['uv','TEXCOORD_0',2],['uv1','TEXCOORD_1',2]]){
  if(attributes[key]===undefined)continue;const accessor=gltf.accessors[attributes[key]],view=gltf.bufferViews[accessor.bufferView],bytes=Buffer.alloc(accessor.count*size*4);assert.equal(accessor.componentType,5126);
  for(let i=0;i<accessor.count;i++)bin.copy(bytes,i*size*4,(view.byteOffset||0)+(accessor.byteOffset||0)+i*(view.byteStride||size*4),(view.byteOffset||0)+(accessor.byteOffset||0)+i*(view.byteStride||size*4)+size*4);hashes[attribute]=sha(bytes);
 }
 return[name,{hashes,position:node.translation,quaternion:node.rotation||[0,0,0,1]}];
}));
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const navigate=async(page,path)=>{await page.evaluate(path=>window.studio.router.navigate(path),path);await settle(page);};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page),requests=[];page.on('request',r=>{if(r.url().endsWith('/assets/profile/github-avatar.png'))requests.push(r.url());});
  await page.goto(server.base);await ready(page);await settle(page);
  const source=await page.evaluate(async names=>{
   const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join(''),w=window.studio.world,meshes=[];
   for(const name of names){const object=w.model.asset.getObjectByName(name),hashes={};for(const key of ['position','uv','uv1']){const a=object.geometry.attributes[key];if(a)hashes[key]=await digest(a.array.buffer);}meshes.push({name,hashes,position:object.position.toArray(),quaternion:object.quaternion.toArray(),channel:object.material.map.channel,uv2:object.geometry.attributes.uv2.count,map:object.material.map.name});}
   const image=await createImageBitmap(await (await fetch('/assets/profile/github-avatar.png')).blob()),canvas=document.createElement('canvas');canvas.width=512;canvas.height=460;const ctx=canvas.getContext('2d');ctx.drawImage(image,58,32,396,396);image.close();
   const expected=ctx.getImageData(58,32,396,396).data,actual=w.model.asset.getObjectByName('photo_img').material.map.image.getContext('2d').getImageData(58,32,396,396).data;
   window.artSource=w.model;window.artResources=names.map(name=>{const mesh=w.model.asset.getObjectByName(name);return{map:mesh.material.map,geometry:mesh.geometry,version:mesh.material.map.version};});
   return{meshes,profile:w.model.artwork.profile,avatarPixelsEqual:expected.every((value,i)=>value===actual[i]),emissive:w.model.asset.getObjectByName('painting_canvas').material.emissiveIntensity};
  },names);
  assert.equal(source.profile,'github');assert.equal(source.avatarPixelsEqual,true);assert.equal(source.emissive,.07);
  source.meshes.forEach(mesh=>{assert.deepEqual(mesh.hashes,original[mesh.name].hashes,mesh.name);assert.deepEqual(mesh.position,original[mesh.name].position);assert.ok(mesh.quaternion.every((v,i)=>Math.abs(v-original[mesh.name].quaternion[i])<1e-7));assert.equal(mesh.channel,2);assert.ok(mesh.uv2>0);});
  for(const id of ['about','skin']){await page.evaluate(id=>window.studio.world.focus(id),id);await page.waitForFunction(()=>!window.studio.world.focusJourney);await page.screenshot({path:`${output}/room-artwork-${id}-${viewport.width}.png`});}
  await navigate(page,'/skin/');await page.waitForFunction(()=>window.studio.world.model.previewStatus==='ready');
  const motion=await page.evaluate(names=>{
   const w=window.studio.world,m=w.model;w.stop();const clone=m.root.getObjectByName('same-room-preview');
   const shared=names.every((name,i)=>{const mesh=clone.getObjectByName(name);return mesh.geometry===window.artResources[i].geometry&&mesh.material.map===window.artResources[i].map;});
   m.applySkin('default');const from=m.artworkCursor.position.x;m.applySkin('forest',{now:100,delay:0,duration:2});m.update(0,{},0,101);const midpoint=m.artworkCursor.position.x;
   m.applySkin('ocean',{now:101,delay:0,duration:2});m.update(0,{},0,101);const retarget=m.artworkCursor.position.x;m.update(0,{},0,103);const end=m.artworkCursor.position.x;
   const memory=[];for(let i=0;i<20;i++){m.applySkin(['default','brick','forest','ocean','cream'][i%5]);w.frame(performance.now());memory.push({...w.renderer.info.memory,programs:w.renderer.info.programs.length});}
   m.applySkin('default');w.last=performance.now();w.start();return{shared,from,midpoint,retarget,end,memory,versionsStable:window.artResources.every(r=>r.map.version===r.version)};
  },names);
  assert.equal(motion.shared,true);assert.equal(motion.versionsStable,true);assert.ok(Math.abs(motion.from-.38349609375)<1e-9);assert.ok(Math.abs(motion.midpoint-.195849609375)<1e-9);assert.equal(motion.midpoint,motion.retarget);assert.ok(Math.abs(motion.end-(-.179443359375))<1e-9);
  for(const key of ['textures','geometries','programs'])assert.equal(Math.max(...motion.memory.slice(3).map(m=>m[key])),Math.min(...motion.memory.slice(3).map(m=>m[key])),key);
  await page.locator('[data-preview-skin="forest"]').click();await page.waitForFunction(()=>Math.abs(window.studio.world.model.artworkCursor.position.x-.008203125)<1e-8);
  await navigate(page,'/');await ready(page);assert.equal(await page.evaluate(()=>window.studio.world.model.artwork.cursor.position.x),.008203125);assert.equal(requests.length,2);assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({name:'original geometry, published avatar, shared print and continuous palette marker',viewport,source,motion});await context.close();console.log(`PASS room artwork ${viewport.width}`);
 }
 for(const failure of ['missing','corrupt']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  await page.route('**/assets/profile/github-avatar.png',route=>route.fulfill({status:failure==='missing'?404:200,contentType:'image/png',body:'Unavailable'}));await page.goto(server.base);await ready(page);await settle(page);
  assert.equal(await page.evaluate(()=>window.studio.world.model.artwork.profile),'monogram');await page.evaluate(()=>window.studio.world.focus('about'));await page.locator('.object-preview a').click();await settle(page);assert.equal(new URL(page.url()).pathname,'/about/');assert.deepEqual(log.errors,[]);assert.ok(log.failed.every(r=>failure==='missing'&&r.status===404&&r.url.endsWith('/assets/profile/github-avatar.png')));
  report.cases.push({name:`profile ${failure} keeps a signed monogram and navigation`});await context.close();console.log(`PASS artwork fallback ${failure}`);
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),log=observe(page);let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/profile/github-avatar.png',async route=>{await gate;await route.continue();});
  try{const requested=page.waitForRequest('**/assets/profile/github-avatar.png');await page.goto(server.base+'/skin/',{waitUntil:'domcontentloaded'});await requested;await ready(page);assert.equal(await page.evaluate(()=>window.studio.world.model.previewStatus),'loading');
   await page.locator('[data-preview-skin="ocean"]').click();await page.evaluate(()=>window.studio.world.applySkin('ocean',{now:performance.now()/1000,delay:0,duration:30}));release();await page.waitForFunction(()=>window.studio.world.model.previewStatus==='ready');
   const samples=await page.evaluate(()=>new Promise(resolve=>{const samples=[];function tick(){samples.push(window.studio.world.model.artworkCursor.position.x);if(samples.length<40)requestAnimationFrame(tick);else resolve(samples);}requestAnimationFrame(tick);}));assert.ok(samples.every(Number.isFinite));assert.ok(samples.every(x=>Math.abs(x-(-.179443359375))<1e-8));assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
   report.cases.push({name:'late portrait joins an in-flight choice',deliberatelyExtendedDuration:30,samples});console.log('PASS late artwork and active choice');
  }finally{release();await context.close();}
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/room-artwork-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
