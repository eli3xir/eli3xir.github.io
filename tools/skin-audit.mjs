import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';

const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[]};
const previewReady=page=>page.waitForFunction(()=>window.studio.world.model.previewStatus==='ready',null,{timeout:150000});
const navigate=async(page,path)=>{await page.evaluate(path=>window.studio.router.navigate(path),path);await settle(page);};
const selected=page=>page.evaluate(()=>({id:window.studio.world?.model.selected,stored:localStorage.getItem('room-skin'),
  pressed:[...document.querySelectorAll('[aria-pressed="true"][data-preview-skin],[aria-pressed="true"][data-skin]')].map(el=>el.dataset.skin||el.dataset.previewSkin)}));
const colors=page=>page.evaluate(async()=>{
  const {ROOM_FINISH,roomSkinColor}=await import('/js/world/room-palette.js'),w=window.studio.world,result=[];
  (w.model.root.getObjectByName('same-room-preview')||w.model.asset).traverse(o=>{
    if(!o.isMesh)return;for(const m of [o.material].flat())if(m.color&&ROOM_FINISH.test(m.name)){
      const target=roomSkinColor(m,localStorage.getItem('room-skin'),m.color.clone());
      result.push({name:m.name,color:m.color.toArray(),error:m.color.clone().sub(target).toArray().reduce((s,x)=>s+Math.abs(x),0)});
    }
  });return result;
});
const finalColors=async page=>{const result=await colors(page);assert.ok(result.length>0);assert.ok(result.every(c=>c.error<1e-8));return result;};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+'/skin/');await ready(page);await previewReady(page);await settle(page);
  assert.equal(await page.locator('[data-preview-skin]').count(),5);assert.equal(await page.locator('.skin-option').count(),5);
  const layout=()=>page.evaluate(()=>{const r=document.querySelector('.hero-copy').getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height,padding:getComputedStyle(document.body).padding,overflow:document.documentElement.scrollWidth>innerWidth+2};});
  const direct=await layout();assert.equal(direct.padding,'0px');assert.equal(direct.overflow,false);
  const continuity=await page.evaluate(async()=>{
    const {ROOM_FINISH,roomSkinColor}=await import('/js/world/room-palette.js'),w=window.studio.world,m=w.model;w.stop();
    let material;m.root.getObjectByName('same-room-preview').traverse(o=>{if(o.isMesh&&ROOM_FINISH.test(o.material.name))material=o.material;});
    const read=()=>material.color.toArray(),initial=read();
    m.applySkin('forest',{now:100,delay:.1,duration:1});m.update(0,{},0,100.1);const start=read();
    m.update(0,{},0,100.6);const midpoint=read();
    m.applySkin('ocean',{now:100.6,delay:0,duration:1});m.update(0,{},0,100.6);const retarget=read();
    m.update(0,{},0,101.6);const end=read(),target=roomSkinColor(material,'ocean',material.color.clone()).toArray();
    m.applySkin('default');w.start();return{initial,start,midpoint,retarget,end,target};
  });
  assert.deepEqual(continuity.start,continuity.initial);assert.notDeepEqual(continuity.midpoint,continuity.initial);
  assert.deepEqual(continuity.retarget,continuity.midpoint);assert.deepEqual(continuity.end,continuity.target);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>!window.studio.score.audible);
  await page.evaluate(()=>{window.skinCues=[];const score=window.studio.score,cue=score.cue.bind(score);score.cue=(name,delay=0)=>{if(name==='hover')window.skinCues.push({time:score.time,delay});return cue(name,delay);};window.pausedAt=score.time;});
  const forest=page.locator('[data-preview-skin="forest"]');await forest.focus();await page.keyboard.press('Enter');await page.waitForTimeout(1350);
  assert.deepEqual(await selected(page),{id:'forest',stored:'forest',pressed:['forest','forest']});await finalColors(page);
  assert.equal(await page.evaluate(()=>window.studio.score.time===window.pausedAt),true);
  await forest.click();await page.mouse.click(viewport.width-12,140);assert.equal(await page.evaluate(()=>window.skinCues.length),1);
  const hitPoint=()=>page.evaluate(async()=>{const {Vector3}=await import('three'),w=window.studio.world,t=w.model.root.getObjectByName('finish-sample-ocean');const p=t.localToWorld(new Vector3(0,.08,0)).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};});
  let point=await hitPoint();if(point.y>viewport.height-120){await page.evaluate(y=>scrollBy(0,y),point.y-viewport.height+170);await page.waitForTimeout(220);point=await hitPoint();}
  await page.mouse.click(point.x,point.y);await page.waitForTimeout(1350);assert.equal((await selected(page)).id,'ocean');await finalColors(page);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await page.locator('[data-preview-skin="brick"]').click();const timing=await page.evaluate(()=>window.skinCues.at(-1)),phase=(timing.time+timing.delay)*112/60*2;
  assert.ok(Math.abs(phase-Math.round(phase))<.08);
  await page.evaluate(()=>window.studio.score.context.suspend());await page.waitForTimeout(1650);await finalColors(page);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-preview-skin="cream"]').click();await finalColors(page);
  // Borrow geometry/lightmaps, own only the cloned materials. Leaving must not
  // dispose anything belonging to the persistent homepage room.
  const ownership=await page.evaluate(async()=>{
    const {createRoom}=await import('/js/world/room.js'),source=createRoom(()=>{}),m=window.studio.world.model;
    const collect=root=>{const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});return meshes;};
    const original=collect(source.asset),copy=collect(m.root.getObjectByName('same-room-preview'));
    const shared=new Set(),owned=new Set();
    const matches=copy.length===original.length&&copy.every((o,i)=>{const src=original[i];shared.add(src.geometry);
      const a=[o.material].flat(),b=[src.material].flat();return o.geometry===src.geometry&&a.every((mat,j)=>{
        owned.add(mat);shared.add(b[j]);if(mat.lightMap)shared.add(mat.lightMap);
        return mat!==b[j]&&mat.map===b[j].map&&mat.lightMap===b[j].lightMap;
      });});
    window.skinDisposal={shared:0,owned:0};shared.forEach(r=>r.addEventListener('dispose',()=>window.skinDisposal.shared++));
    owned.forEach(r=>r.addEventListener('dispose',()=>window.skinDisposal.owned++));window.departingSkin=m;
    return{matches,meshes:copy.length,shared:shared.size,owned:owned.size};
  });assert.equal(ownership.matches,true);
  const preview=await finalColors(page);await navigate(page,'/');await ready(page);const home=await finalColors(page);
  const disposal=await page.evaluate(()=>({...window.skinDisposal,detached:!window.departingSkin.root.getObjectByName('same-room-preview'),callback:window.departingSkin.onPick}));
  assert.equal(disposal.shared,0);assert.equal(disposal.owned,ownership.owned);assert.equal(disposal.detached,true);assert.equal(disposal.callback,null);
  assert.deepEqual(home.map(c=>c.color),preview.map(c=>c.color));
  const memory=[];
  for(let i=0;i<4;i++){await navigate(page,'/skin/');await previewReady(page);await page.waitForTimeout(150);memory.push(await page.evaluate(()=>({...window.studio.world.renderer.info.memory})));if(i<3)await navigate(page,'/about/');}
  assert.ok(memory.every(sample=>JSON.stringify(sample)===JSON.stringify(memory[0])));
  const spa=await layout();assert.deepEqual(spa,direct);
  await page.screenshot({path:`${output}/skin-preview-${viewport.width}.png`});
  await page.reload();await ready(page);await previewReady(page);assert.equal((await selected(page)).id,'cream');await finalColors(page);
  // The original lower-page controls use the same action and selection state.
  await page.locator('.skin-option[data-skin="forest"]').click();assert.deepEqual(await selected(page),{id:'forest',stored:'forest',pressed:['forest','forest']});
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);await finalColors(page);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({viewport,direct,spa,continuity,point,timing,ownership,disposal,memory,pausedSwitch:true,errors:log.errors});console.log(`PASS skin interaction ${viewport.width}`);await context.close();
 }
 // A late result must not resurrect a departed preview, and the homepage must
 // subscribe to the same in-flight room's eventual ready status.
 {
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);let release,requests=0;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/room/room.glb',async route=>{requests++;await gate;await route.continue();});
  await page.goto(server.base+'/skin/');await page.waitForFunction(()=>window.studio);assert.equal(await page.evaluate(()=>window.studio.world.model.previewStatus),'loading');
  await page.locator('[data-preview-skin="forest"]').click();await page.evaluate(()=>{window.abandonedSkin=window.studio.world.model;});
  await navigate(page,'/');assert.equal(await page.evaluate(()=>window.__ready),false);release();await ready(page);
  assert.equal(await page.evaluate(()=>window.__ready&&window.studio.world.model.loaded),true);assert.equal(requests,1);
  assert.equal(await page.evaluate(()=>Boolean(window.abandonedSkin.root.getObjectByName('same-room-preview')||window.abandonedSkin.onStatus)),false);
  await finalColors(page);await navigate(page,'/skin/');await previewReady(page);await finalColors(page);assert.equal(requests,1);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'choose while loading, leave, same download completes on homepage',requests});console.log('PASS skin loading handoff');await context.close();
 }
 {
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);let requests=0;
  await page.route('**/assets/room/room.glb',route=>++requests===1?route.fulfill({status:503,body:'Temporarily unavailable'}):route.continue());
  await page.goto(server.base+'/skin/');await ready(page);await page.waitForFunction(()=>window.studio.world.model.previewStatus==='failed');
  await page.locator('[data-preview-skin="ocean"]').click();assert.equal((await selected(page)).id,'ocean');
  await page.locator('.finish-retry').click();await previewReady(page);await finalColors(page);assert.equal(requests,2);assert.equal(await page.locator('.finish-retry').isHidden(),true);
  assert.deepEqual(log.errors,[]);assert.equal(log.failed.length,1);assert.equal(log.failed[0].status,503);
  report.cases.push({name:'failed asset retains controls and retries',requests,expectedFailure:log.failed});console.log('PASS skin retry');await context.close();
 }
 {
  const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'}),page=await context.newPage();
  await page.addInitScript(()=>{localStorage.setItem('room-skin','invalid');});
  await page.goto(server.base+'/skin/');await ready(page);await previewReady(page);assert.equal((await selected(page)).id,'default');
  const widths=[];
  for(const viewport of [{width:320,height:568},{width:768,height:1024},{width:844,height:390}]){
    await page.setViewportSize(viewport);await page.waitForTimeout(150);
    const bounds=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,buttons:[...document.querySelectorAll('[data-preview-skin]')].map(b=>{const r=b.getBoundingClientRect();return{left:r.left,right:r.right,height:r.height};})}));
    assert.equal(bounds.overflow,false);assert.ok(bounds.buttons.every(b=>b.left>=0&&b.right<=viewport.width&&b.height>=44));
    widths.push({viewport,...bounds});await page.screenshot({path:`${output}/skin-layout-${viewport.width}.png`});
  }
  await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw new DOMException('Blocked','SecurityError');};});
  await page.locator('[data-preview-skin="brick"]').click();assert.equal((await selected(page)).id,'brick');assert.match(await page.locator('.studio-toast').textContent(),/无法保存/);
  report.cases.push({name:'invalid preference, blocked writes, compact layouts',widths});console.log('PASS skin compact layouts and storage');await context.close();
 }
 {
  const page=await browser.newPage();await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await page.goto(server.base+'/skin/');await ready(page);await settle(page);await page.locator('[data-preview-skin="ocean"]').click();
  assert.equal((await selected(page)).stored,'ocean');assert.deepEqual((await selected(page)).pressed,['ocean','ocean']);assert.equal(await page.locator('.skin-option').count(),5);
  report.cases.push({name:'no WebGL retains both semantic controls',selected:'ocean'});console.log('PASS skin no WebGL');await page.close();
 }
}finally{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(`${output}/skin-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
