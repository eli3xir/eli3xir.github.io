import fs from 'node:fs';
import crypto from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {startServer,launchBrowser,ready,settle,observe} from './browser-support.mjs';
import {encodeReflections} from './reflection-encoding.mjs';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const inputs=['assets/room/room.glb','assets/room/lightmaps/manifest.json','assets/room/lightmaps.bin','assets/profile/github-avatar.png','assets/profile/manifest.json','js/world/room-lighting.js','js/world/room-artwork.js','js/world/room-print.js','js/world/room.js','js/world/room-views.js','js/world/room-notes.js','js/world/room-projects.js','js/experience/domain.js','projects/index.html','tools/build-room-reflections.mjs','tools/reflection-encoding.mjs'];
for(const path of inputs)if(/\.(?:js|mjs|json|html)$/.test(path)&&fs.readFileSync(path).includes(13))throw Error(`${path}: use repository LF line endings before capture`);
const server=await startServer(),browser=await launchBrowser();
const output=process.env.REFLECTION_OUTPUT||'assets/room/reflections';fs.mkdirSync(output,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),log=observe(page);
 await page.goto(server.base);await ready(page);await settle(page);
 const metadata=await page.evaluate(async()=>{
  const T=await import('three'),{SKINS}=await import('/js/experience/domain.js'),w=window.studio.world;w.stop();
  w.model.focus(null);w.actor.root.visible=false;w.particles.visible=false;w.floor.visible=false;
  w.model.root.traverse(node=>{if(node.isPoints)node.visible=false;});
  w.scene.environment=w.environment;w.scene.environmentIntensity=.12;
  w.scene.updateMatrixWorld(true);
  const materials=new Set();w.model.asset.traverse(node=>{for(const m of [node.material].flat().filter(Boolean))materials.add(m);});
  for(const mat of materials){
   mat.envMap=null;mat.onBeforeCompile=mat.lightMap?shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',T.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );',''));}:()=>{};
   mat.customProgramCacheKey=()=>mat.lightMap?'reflection-capture-baked':'reflection-capture-unbaked';mat.needsUpdate=true;
  }
  window.reflectionBake={T,w,pmrem:new T.PMREMGenerator(w.renderer),buffers:[]};
  return{three:T.REVISION,position:[.1,.45,-1.2],size:128,sigma:.02,near:.05,far:25,palettes:Object.fromEntries(Object.entries(SKINS).map(([id,skin])=>[id,skin.wall]))};
 });
 const chunks=[],entries=[];
 for(const id of Object.keys(metadata.palettes)){
  const capture=await page.evaluate(id=>{
   const {T,w,pmrem}=window.reflectionBake;w.model.applySkin(id);w.scene.updateMatrixWorld(true);
   const target=pmrem.fromScene(w.scene,.02,.05,25,{size:128,position:new T.Vector3(.1,.45,-1.2)});
   const pixels=new Uint16Array(target.width*target.height*4);w.renderer.readRenderTargetPixels(target,0,0,target.width,target.height,pixels);
   const result={width:target.width,height:target.height};window.reflectionBake.buffers.push(pixels);target.dispose();return result;
  },id);
  // Transfer in chunks to avoid oversized argument lists during byte encoding.
  const bytes=await page.evaluate(()=>{
   const pixels=window.reflectionBake.buffers.at(-1),bytes=new Uint8Array(pixels.buffer);let text='';
   for(let i=0;i<bytes.length;i+=16384)text+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(text);
  });
  const data=Buffer.from(bytes,'base64');entries.push({id,...capture,pixelOffset:chunks.reduce((n,c)=>n+c.length/8,0),pixels:data.length/8,capturedSha256:sha(data)});chunks.push(data);console.log(`Captured ${id}: ${capture.width}x${capture.height}, ${data.length} bytes`);
 }
 const errors=log.drain();if(errors.errors.length||errors.failed.length)throw new Error(JSON.stringify(errors));
 await page.evaluate(()=>window.reflectionBake.pmrem.dispose());
 const {packed:raw,error}=encodeReflections(chunks),compressed=gzipSync(raw,{level:9});
 const manifest={version:1,format:'rgbe8-planar-cubeuv-gzip',...metadata,file:'probes.bin',bytes:compressed.length,decodedBytes:raw.length,sha256:sha(compressed),decodedSha256:sha(raw),entries,error,
  inputs:Object.fromEntries(inputs.map(file=>[file,sha(fs.readFileSync(file))])),notes:'One static room probe per palette; excludes the character and particles. Baked diffuse is not added twice. No parallax correction or live-object reflection.'};
 fs.writeFileSync(`${output}/probes.bin`,compressed);fs.writeFileSync(`${output}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({output,bytes:compressed.length,decodedBytes:raw.length,entries:entries.length}));
}finally{await browser.close();await server.close();}
