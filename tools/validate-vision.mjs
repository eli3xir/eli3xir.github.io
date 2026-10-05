import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('assets/vision/manifest.json','utf8'));
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const verify=entry=>{const bytes=fs.readFileSync('.'+entry.file);assert.equal(bytes.length,entry.bytes,entry.file);assert.equal(sha(bytes),entry.sha256,entry.file);return bytes;};
assert.equal(manifest.source.commit,'630512dacf9715d4bb5a798814bf6282b34a5417');
assert.equal(manifest.source.license,'MIT');assert.match(fs.readFileSync('.'+manifest.source.licenseFile,'utf8'),/Copyright.*2021/);
const bytes=verify(manifest.weights);let offset=0,tensors=0;
for(const model of Object.values(manifest.models)){
 const names=new Set();for(const entry of model.weights){
  assert.equal(entry.offset,offset);assert.equal(entry.offset%4,0);assert.equal(entry.shape.reduce((a,b)=>a*b,1),entry.length);assert.ok(!names.has(entry.name));names.add(entry.name);
  const data=bytes.subarray(offset,offset+entry.length*4);assert.equal(sha(data),entry.sha256);
  for(let i=0;i<data.length;i+=4)assert.ok(Number.isFinite(data.readFloatLE(i)));
  offset+=data.length;tensors++;
 }
}
assert.equal(offset,bytes.length);assert.equal(tensors,50);assert.equal(bytes.length,1983400);
for(const entry of manifest.runtime){assert.equal(entry.version,'4.22.0');verify(entry);}
assert.match(fs.readFileSync('vendor/tfjs/LICENSE.txt','utf8'),/Apache License/);
const sample=verify(manifest.sample);assert.equal(sample.readUInt32BE(16),512);assert.equal(sample.readUInt32BE(20),512);
assert.equal(manifest.sample.source,'https://www.flickr.com/photos/nasacommons/16504233985/');
console.log(JSON.stringify({tensors,weightsBytes:bytes.length,runtimeFiles:manifest.runtime.length,sampleBytes:sample.length,integrity:'all hashes and shapes verified'}));
