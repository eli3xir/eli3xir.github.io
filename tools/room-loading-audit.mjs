import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';

// Serve only the model through a real slow HTTP stream; other assets use the
// normal preview server. This exercises browser abort and body-reading behavior.
const bytes=fs.readFileSync(new URL('../assets/room/room.glb',import.meta.url));
let mode='slow',requests=0;
const streamServer=http.createServer((request,response)=>{
  requests++;response.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':bytes.length,'Access-Control-Allow-Origin':'*'});
  let offset=0;
  const send=()=>{const end=Math.min(bytes.length,offset+65536);response.write(bytes.subarray(offset,end));offset=end;if(offset===bytes.length)response.end();};
  send();
  const timer=mode==='slow'?setInterval(send,220):null;
  response.on('close',()=>clearInterval(timer));
});
await new Promise(resolve=>streamServer.listen(0,'127.0.0.1',resolve));
const streamUrl=`http://127.0.0.1:${streamServer.address().port}/room.glb`;
const server=await startServer(),browser=await launchBrowser(),results=[];
try{
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  await page.route('**/assets/room/room.glb',route=>route.continue({url:streamUrl}));
  const started=Date.now();await page.goto(server.base);await page.waitForFunction(()=>window.studio);
  await page.waitForFunction(()=>document.querySelector('.scene-status').textContent.includes('%'));
  const initial=await page.locator('.scene-status').textContent();
  await page.locator('.chapter-dock a[href="/blog/"]').click();await page.waitForFunction(()=>window.studio.route.id==='blog');await settle(page);
  await page.waitForTimeout(1000);assert.equal(await page.locator('.scene-status').textContent(),'世界已就绪');
  await page.locator('.room-link').click();await page.waitForFunction(()=>window.studio.route.id==='home');await ready(page);
  assert.equal(await page.evaluate(()=>window.studio.world.model.loaded),true);assert.equal(requests,1);
  assert.ok(Date.now()-started>18000);assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  results.push({case:'slow continuous transfer and navigation',elapsed:Date.now()-started,initial,requests,loaded:true});
  console.log('PASS slow continuous transfer and navigation');
  mode='stalled';const stalledAt=Date.now();await page.reload();await ready(page);
  assert.equal(await page.evaluate(()=>window.studio.world.model.loaded),false);assert.ok(await page.evaluate(()=>window.__error));
  assert.ok(Date.now()-stalledAt>=29000);assert.ok(Date.now()-stalledAt<45000);
  assert.equal(await page.locator('.scene-status.loading').count(),0);
  await page.locator('.chapter-dock a[href="/projects/"]').click();await page.waitForFunction(()=>window.studio.route.id==='projects');await settle(page);
  results.push({case:'stalled transfer aborts and navigation remains usable',elapsed:Date.now()-stalledAt,requests,route:'projects'});
  console.log('PASS stalled transfer aborts and navigation remains usable');
  await context.close();
}finally{
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/room-loading-audit.json',JSON.stringify({date:new Date().toISOString(),results},null,2));
  await browser.close();await server.close();streamServer.closeAllConnections();await new Promise(resolve=>streamServer.close(resolve));
}
