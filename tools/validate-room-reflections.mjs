import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {SKINS} from '../js/experience/domain.js';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(fs.readFileSync('assets/room/reflections/manifest.json','utf8')),packed=fs.readFileSync('assets/room/reflections/probes.bin'),bytes=gunzipSync(packed),pixels=bytes.length/4;
assert.equal(manifest.version,1);assert.equal(manifest.format,'rgbe8-planar-cubeuv-gzip');assert.equal(manifest.three,'185');
assert.equal(packed.length,manifest.bytes);assert.equal(sha(packed),manifest.sha256);assert.equal(bytes.length,manifest.decodedBytes);assert.equal(sha(bytes),manifest.decodedSha256);
assert.deepEqual(manifest.palettes,Object.fromEntries(Object.entries(SKINS).map(([id,skin])=>[id,skin.wall])));
for(const [path,expected] of Object.entries(manifest.inputs)){
 const source=fs.readFileSync(path);
 if(/\.(?:js|mjs|json|html)$/.test(path))assert.equal(source.includes(13),false,`${path}: reflection inputs must use repository LF line endings before building`);
 assert.equal(sha(source),expected,path);
}
assert.deepEqual(manifest.entries.map(entry=>entry.id),Object.keys(SKINS));
manifest.entries.forEach((entry,index)=>{assert.equal(entry.width,384);assert.equal(entry.height,512);assert.equal(entry.pixels,196608);assert.equal(entry.pixelOffset,index*entry.pixels);});
assert.equal(pixels,196608*5);assert.ok(manifest.error.maxRelativeToPixelPeak<.004);
for(let i=pixels*3;i<bytes.length;i++)assert.ok(bytes[i]<=143);
// Keep the exact labware/material association reviewable if the source GLB changes.
const glb=fs.readFileSync('assets/room/room.glb'),gltf=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12))),lab=gltf.nodes.find(node=>node.name==='labware'),materialIds=new Set();
function visit(index){const node=gltf.nodes[index];if(node.mesh!==undefined)gltf.meshes[node.mesh].primitives.forEach(primitive=>materialIds.add(primitive.material));node.children?.forEach(visit);}
lab.children.forEach(visit);assert.equal(gltf.materials[6].name,'Material_0');assert.equal(gltf.materials[6].alphaMode,'BLEND');assert.ok(materialIds.has(6));
for(const name of ['Material_1','Material_2','Material_3','Material_5','Material_6','Material_7'])assert.ok([...materialIds].some(index=>gltf.materials[index].name===name));
console.log(JSON.stringify({probes:5,downloadBytes:packed.length,decodedBytes:bytes.length,sourceHashes:'verified',error:manifest.error}));
