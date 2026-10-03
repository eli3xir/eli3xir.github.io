import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const source=fs.readFileSync(new URL('../assets/room/lightmaps.bin',import.meta.url));
const indexLength=source.readUInt32LE(8),index=JSON.parse(source.subarray(12,12+indexLength));
const server=await startServer(),browser=await launchBrowser(),results=[];
try{
  for(const mode of ['bundle','missing','corrupt-index','corrupt-image']){
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page),requests=[];
    page.on('request',request=>requests.push(request.url()));
    if(mode==='missing')await page.route('**/assets/room/lightmaps.bin',route=>route.fulfill({status:404,body:'Unavailable'}));
    if(mode.startsWith('corrupt')){
      const bytes=Buffer.from(source);
      if(mode==='corrupt-index')bytes[0]=0;
      else bytes[12+indexLength+index.files['wall_back.jpg'].offset+100]^=255;
      await page.route('**/assets/room/lightmaps.bin',route=>route.fulfill({contentType:'application/octet-stream',body:bytes}));
    }
    await page.goto(server.base);await ready(page);await settle(page);
    const evidence=await page.evaluate(async()=>{
      const model=window.studio.world.model,manifest=await fetch('/assets/room/lightmaps/manifest.json').then(r=>r.json()),files=new Set(),maps=[];
      model.room.traverse(object=>{
        for(const material of [object.material].flat().filter(Boolean)){
          const texture=material.lightMap,file=texture?.userData.lightmapFile;if(!file||files.has(file))continue;files.add(file);
          const entry=Object.values(manifest).find(entry=>entry.file===file);
          maps.push({file,correct:!!entry&&texture.image.width===entry.size&&texture.image.height===entry.size&&texture.channel===1&&Math.abs(material.lightMapIntensity-entry.scale*1.05)<1e-6});
        }
      });
      return{loaded:model.loaded,source:model.lightmapSource,maps};
    });
    assert.equal(evidence.loaded,true);assert.equal(evidence.maps.length,122);assert.ok(evidence.maps.every(map=>map.correct));assert.deepEqual(log.errors,[]);
    const images=requests.filter(url=>url.includes('/assets/room/lightmaps/')&&url.endsWith('.jpg'));
    const expected=mode==='bundle'?0:mode==='corrupt-image'?1:122;
    assert.equal(images.length,expected);assert.equal(evidence.source.fallback,expected);assert.equal(evidence.source.packed,122-expected);
    assert.deepEqual(log.failed,mode==='missing'?[{status:404,url:server.base+'/assets/room/lightmaps.bin'}]:[]);
    results.push({mode,maps:evidence.maps.length,source:evidence.source,jpegRequests:images.length});
    console.log(`PASS lightmaps ${mode}: ${evidence.source.packed} packed / ${images.length} originals`);await context.close();
  }
}finally{
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/lightmap-audit.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
  await browser.close();await server.close();
}
