import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[],failures:[]};
fs.mkdirSync(output,{recursive:true});
async function open(){
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
 await page.addInitScript(()=>{const Native=Worker;window.workerCounts={created:0,terminated:0};window.Worker=class extends Native{constructor(url,...args){super(url,...args);this.isVision=String(url).includes('/vision/worker');if(this.isVision){window.workerCounts.created++;window.lastVisionWorker=this;}}terminate(){if(this.isVision)window.workerCounts.terminated++;super.terminate();}};});
 await page.goto(server.base+'/projects/');await ready(page);await settle(page);return{context,page,log};
}
const done=page=>page.waitForFunction(()=>window.studio.route.vision.state.phase==='done',null,{timeout:60000});
async function select(page){await page.locator('[data-instrument=vision]').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready');}
try{
 for(const kind of ['missing','corrupt']){
  const {context,page,log}=await open();await select(page);
  const bytes=fs.readFileSync('assets/vision/weights.bin');bytes[0]^=1;
  await context.route('**/assets/vision/weights.bin',route=>route.fulfill(kind==='missing'?{status:404,body:'missing'}:{contentType:'application/octet-stream',body:bytes}));
  await page.locator('.vision-run').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='error');
  assert.match(await page.locator('#vision-status').textContent(),kind==='missing'?/模型文件暂时无法读取/:/模型文件未完整下载/);assert.deepEqual(await page.evaluate(()=>window.workerCounts),{created:1,terminated:1});
  await context.unroute('**/assets/vision/weights.bin');await page.locator('.vision-run').click();await done(page);assert.equal(await page.evaluate(()=>window.studio.route.vision.state.report.stages[2].boxes.length),1);
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);assert.deepEqual(await page.evaluate(()=>window.workerCounts),{created:2,terminated:2});assert.deepEqual(log.errors,[]);assert.ok(log.failed.every(f=>f.status===404&&f.url.endsWith('/weights.bin')));
  report.cases.push({name:`${kind} model rejected, then genuine retry and worker disposal`,expectedFailures:log.failed});await context.close();console.log(`PASS vision ${kind} recovery`);
 }
 {
  const {context,page,log}=await open();await select(page);let release,arrived;const gate=new Promise(resolve=>release=resolve),waiting=new Promise(resolve=>arrived=resolve);
  await context.route('**/assets/vision/weights.bin',async route=>{arrived();await gate;try{await route.fulfill({contentType:'application/octet-stream',body:fs.readFileSync('assets/vision/weights.bin')});}catch{/* Terminated Worker may already have aborted its request. */}});
  await page.locator('.vision-run').click();await waiting;await page.locator('.vision-run').click();assert.equal(await page.evaluate(()=>window.studio.route.vision.state.phase),'ready');
  // Deliver a stale Worker event deliberately to exercise the controller guard.
  await page.evaluate(()=>window.lastVisionWorker.onmessage({data:{type:'error',job:1,message:'STALE RESULT MUST NOT APPEAR'}}));release();await context.unroute('**/assets/vision/weights.bin');
  await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.studio.route.vision.state.serial),0);assert.deepEqual(await page.evaluate(()=>window.workerCounts),{created:1,terminated:1});assert.equal(await page.evaluate(()=>window.studio.route.vision.state.error),null);
  await page.locator('.vision-run').click();await done(page);assert.equal(await page.evaluate(()=>window.studio.route.vision.state.serial),1);
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);assert.deepEqual(await page.evaluate(()=>window.workerCounts),{created:2,terminated:2});assert.deepEqual(log.errors,[]);assert.ok(log.failed.every(f=>f.error==='net::ERR_ABORTED'&&f.url.endsWith('/weights.bin')));
  report.cases.push({name:'cancel during held model download, injected stale event ignored, retry succeeds',expectedFailures:log.failed});await context.close();console.log('PASS vision cancellation');
 }
 {
  const {context,page,log}=await open();let release,arrived;const gate=new Promise(resolve=>release=resolve),waiting=new Promise(resolve=>arrived=resolve);
  await context.route('**/assets/vision/astronaut.png',async route=>{arrived();await gate;await route.fulfill({contentType:'image/png',body:fs.readFileSync('assets/vision/astronaut.png')});});
  await page.locator('[data-instrument=vision]').click();await waiting;await page.locator('[data-vision=blank]').click();release();await page.waitForResponse(r=>r.url().endsWith('/astronaut.png'));await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>window.studio.route.vision.state.source.id),'blank');assert.equal(await page.evaluate(()=>window.studio.route.vision.state.phase),'ready');await context.unroute('**/assets/vision/astronaut.png');
  const rejects=await page.evaluate(async()=>{const v=window.studio.route.vision,results=[];
   const check=async file=>{const revision=v.state.imageRevision;await v.loadFile(file);results.push({error:v.state.error,sameImage:revision===v.state.imageRevision});};
   await check(new File(['broken PNG'],'broken.png',{type:'image/png'}));
   await check(new File([new Uint8Array(21*1024*1024)],'large.png',{type:'image/png'}));
   for(const [width,height] of [[12,12],[2048,32]]){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;await check(await new Promise(resolve=>canvas.toBlob(resolve)));}
   return results;});
  assert.ok(rejects.every(r=>r.error&&r.sameImage));assert.match(rejects[1].error,/20 MB/);assert.match(rejects[2].error,/24×24/);assert.match(rejects[3].error,/过窄/);
  await page.locator('[data-vision=sample]').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready');await page.locator('.vision-run').click();await done(page);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'late sample cannot replace newer input; malformed, oversized, tiny and narrow files rejected',rejects});await context.close();console.log('PASS vision image guards');
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/vision-failure-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
