import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('assets/profile/manifest.json','utf8')),bytes=fs.readFileSync('assets/profile/github-avatar.png');
assert.equal(manifest.profile,'https://github.com/eli3xir');assert.equal(manifest.image,'https://avatars.githubusercontent.com/u/307186276?s=256&v=4');
assert.equal(manifest.file,'github-avatar.png');assert.equal(bytes.length,manifest.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),manifest.sha256);
assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),manifest.width);assert.equal(bytes.readUInt32BE(20),manifest.height);
assert.ok(fs.readFileSync('about/index.html','utf8').includes(`href="${manifest.profile}"`));
console.log(JSON.stringify({profile:manifest.profile,bytes:bytes.length,width:manifest.width,height:manifest.height,sourceHash:'verified'}));
