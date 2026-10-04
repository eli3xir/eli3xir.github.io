import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[]};
const navigate=async(page,path)=>{await page.evaluate(path=>window.studio.router.navigate(path),path);await settle(page);};
const state=page=>page.evaluate(()=>{const w=window.studio.world,m=w.model;return{activity:m.activity,progress:m.progress,position:m.actorAnchor.position.toArray(),rotation:m.actorAnchor.quaternion.toArray(),motion:{...m.actorMotion,grip:undefined},time:window.studio.score.time,wake:window.aboutWater.uWake.value.toArray()};});
const source=fs.readFileSync(new URL('../about/index.html',import.meta.url),'utf8').match(/<p class="about-lead">([\s\S]*?)<\/p>/)[1].replace(/\s+/g,' ').trim();
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+'/about/');await ready(page);await settle(page);
  await page.evaluate(()=>{const material=window.studio.world.model.root.getObjectByName('leisure-water').material,compile=material.onBeforeCompile;material.onBeforeCompile=shader=>{compile(shader);window.aboutWater=shader.uniforms;};material.needsUpdate=true;});
  await page.waitForFunction(()=>window.aboutWater);
  assert.equal((await page.locator('.about-lead').textContent()).replace(/\s+/g,' ').trim(),source);assert.equal(await page.locator('.about-contact a').count(),3);
  assert.equal(await page.locator('[data-activity]').count(),3);
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);await page.locator('.sound-toggle').click();await page.waitForFunction(()=>!window.studio.score.audible);
  await page.evaluate(()=>{window.aboutCues=[];const s=window.studio.score,cue=s.cue.bind(s);s.cue=(name,delay=0)=>{if(name==='hover')window.aboutCues.push({time:s.time,delay});return cue(name,delay);};});
  const before=await state(page),button=page.locator('[data-activity="run"]');await button.focus();await page.keyboard.press('Enter');await page.waitForTimeout(1450);
  const running=await state(page);assert.equal(running.activity,'run');assert.ok(running.motion.run>.2);assert.notDeepEqual(running.position,before.position);
  await page.screenshot({path:`${output}/about-running-${viewport.width}.png`});
  await page.locator('[data-activity="swim"]').click();await page.waitForTimeout(1450);const swimming=await state(page);
  assert.equal(swimming.activity,'swim');assert.ok(swimming.motion.swim>.2);assert.equal(swimming.time,before.time);assert.equal(swimming.wake[2],swimming.motion.swim);assert.ok(Math.abs(swimming.wake[0]-swimming.position[0]-.52)<1e-8);
  await page.screenshot({path:`${output}/about-swimming-${viewport.width}.png`});
  await page.waitForTimeout(3100);const returned=await state(page);assert.equal(returned.progress,1);assert.deepEqual(returned.position,before.position);assert.equal(returned.motion.swim,0);
  const picks=[];
  for(const id of ['run','swim']){
    const hit=await page.evaluate(async id=>{const {Vector3}=await import('three'),w=window.studio.world,o=w.model.root.getObjectByName(id==='run'?'leisure-track':'leisure-water'),p=o.localToWorld(id==='run'?new Vector3(-1.36,0,0):new Vector3(0,0,.1)).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};},id);
    await page.mouse.click(hit.x,hit.y);assert.equal((await state(page)).activity,id);picks.push({id,...hit});
  }
  const cueCount=await page.evaluate(()=>window.aboutCues.length);await page.mouse.click(viewport.width-12,140);assert.equal(await page.evaluate(()=>window.aboutCues.length),cueCount);
  // The board's physical frame is the hit target, away from a pawn or the mascot.
  const boardPoint=()=>page.evaluate(async()=>{const {Vector3}=await import('three'),w=window.studio.world,b=w.model.root.getObjectByName('leisure-board'),p=b.localToWorld(new Vector3(.34,.04,.32)).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};});
  let point=await boardPoint();if(point.y>viewport.height-120){await page.evaluate(y=>scrollBy(0,y),point.y-viewport.height+170);await page.waitForTimeout(220);point=await boardPoint();}
  await page.mouse.click(point.x,point.y);await page.waitForTimeout(1500);assert.equal((await state(page)).activity,'chess');
  const grip=await page.evaluate(async()=>{const {Vector3}=await import('three'),w=window.studio.world,p=w.model.root.getObjectByName('leisure-pawn').localToWorld(new Vector3(0,.235,0)),hand=w.actor.root.getObjectByName('mote-right-hand').getWorldPosition(new Vector3());return{distance:p.distanceTo(hand),reach:w.model.actorMotion.reach};});
  assert.ok(grip.reach>.999);assert.ok(grip.distance<1e-5,JSON.stringify(grip));await page.screenshot({path:`${output}/about-chess-${viewport.width}.png`});
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);await button.click();
  const timing=await page.evaluate(()=>window.aboutCues.at(-1)),phase=(timing.time+timing.delay)*112/60*2;assert.ok(Math.abs(phase-Math.round(phase))<.08);
  await page.evaluate(()=>window.studio.score.context.suspend());await page.waitForTimeout(4800);assert.equal((await state(page)).progress,1);
  await page.locator('[data-activity="swim"]').click();await page.waitForTimeout(1300);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(180);
  assert.equal((await state(page)).progress,1);assert.equal((await state(page)).motion.swim,0);assert.equal((await state(page)).wake[2],0);assert.deepEqual((await state(page)).position,before.position);
  const pawnBefore=await page.evaluate(()=>window.studio.world.model.root.getObjectByName('leisure-pawn').position.toArray());await page.locator('[data-activity="chess"]').click();
  const pawnAfter=await page.evaluate(()=>window.studio.world.model.root.getObjectByName('leisure-pawn').position.toArray());assert.notDeepEqual(pawnAfter,pawnBefore);assert.equal((await state(page)).progress,1);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
  const continuous=await page.evaluate(()=>{
    const w=window.studio.world,m=w.model;w.stop();m.select('run',{now:100,delay:0,duration:4});m.update(0,{},0,101.5);
    const read=()=>({position:m.actorAnchor.position.toArray(),rotation:m.actorAnchor.quaternion.toArray(),motion:{...m.actorMotion,grip:undefined}}),before=read();
    m.select('swim',{now:101.5,delay:.1,duration:4});m.update(0,{},0,101.5);const after=read();m.update(0,{},0,110);w.start();return{before,after};
  });assert.deepEqual(continuous.after.position,continuous.before.position);assert.deepEqual(continuous.after.motion,continuous.before.motion);assert.ok(continuous.after.rotation.every((value,i)=>Math.abs(value-continuous.before.rotation[i])<1e-12));
  const retargets=await page.evaluate(()=>{
    const w=window.studio.world,m=w.model;w.stop();const results=[];let clock=200;
    for(const from of ['run','swim','chess'])for(const to of ['run','swim','chess']){
      m.select(from,{now:clock,delay:0,duration:4});w.frame((clock+1.7)*1000);const before=m.actorAnchor.position.clone();
      m.select(to,{now:clock+1.7,delay:0,duration:4});w.frame((clock+1.7)*1000);const jump=before.distanceTo(m.actorAnchor.position);let maxArm=0;
      for(let i=0;i<=20;i++){w.frame((clock+1.7+i*.025)*1000);maxArm=Math.max(maxArm,w.actor.root.getObjectByName('mote-right-hand').parent.scale.x);}
      results.push({from,to,jump,maxArm});m.update(0,{},0,clock+7);clock+=10;
    }w.start();return results;
  });assert.ok(retargets.every(r=>r.jump<1e-10&&r.maxArm<1.5),JSON.stringify(retargets));
  // Repeated actual GPU rendering must reuse the same water/grid resources.
  const resources=await page.evaluate(()=>{
    const w=window.studio.world,m=w.model;w.stop();const initial={...w.renderer.info.memory};
    for(let i=0;i<24;i++){m.select(['run','swim','chess'][i%3],{now:100+i*6,delay:0,duration:4});w.frame((101.7+i*6)*1000);w.frame((105+i*6)*1000);}
    const after={...w.renderer.info.memory};let grid,texture;m.root.traverse(o=>{if(o.isInstancedMesh)grid=o;if(o.material?.map)texture=o.material.map;});
    window.aboutDisposed=[0,0,0,0];const water=m.root.getObjectByName('leisure-water');[water.geometry,water.material,texture,grid].forEach((r,i)=>r.addEventListener('dispose',()=>window.aboutDisposed[i]++));
    window.oldLeisure=m;w.start();return{initial,after};
  });assert.deepEqual(resources.after,resources.initial);
  await navigate(page,'/lab/');const reset=await page.evaluate(()=>{const a=window.studio.world.actor.root;return{rotation:a.rotation.toArray().slice(0,2),halo:a.children[1].visible,disposed:window.aboutDisposed,callbacks:[window.oldLeisure.onPick,window.oldLeisure.onState]};});
  assert.deepEqual(reset.rotation,[0,0]);assert.equal(reset.halo,true);assert.deepEqual(reset.disposed,[1,1,1,1]);assert.deepEqual(reset.callbacks,[null,null]);
  await navigate(page,'/about/');await page.locator('.hero-copy .explore-button').click();await page.waitForFunction(()=>document.querySelector('#content').getBoundingClientRect().top<150);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({viewport,before,running,swimming,returned,picks,point,grip,timing,continuous,retargets,resources,reset,errors:log.errors});console.log(`PASS about activity ${viewport.width}`);await context.close();
 }
 {
  const context=await browser.newContext(),page=await context.newPage(),log=observe(page);await page.goto(server.base+'/about/');await ready(page);await settle(page);
  const layouts=[];
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390}]){
    await page.setViewportSize(viewport);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
    const samples=await page.evaluate(async()=>{
      const {Box3,Vector3}=await import('three'),w=window.studio.world,m=w.model;w.stop();const samples=[];
      for(const activity of ['run','swim','chess']){
        m.select(activity,{now:100,delay:0,duration:4});
        for(let i=0;i<=40;i++){
          w.frame((100+i*.1)*1000);const box=new Box3().setFromObject(w.actor.root),bound={top:Infinity,left:Infinity,right:-Infinity};
          for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new Vector3(x,y,z).project(w.camera);bound.top=Math.min(bound.top,(1-p.y)*innerHeight/2);bound.left=Math.min(bound.left,(1+p.x)*innerWidth/2);bound.right=Math.max(bound.right,(1+p.x)*innerWidth/2);}
          samples.push({activity,progress:i/40,...bound,copyBottom:document.querySelector('.hero-copy').getBoundingClientRect().bottom,anchorError:w.actor.root.position.distanceTo(m.actorAnchor.getWorldPosition(new Vector3()))});
        }
      }w.start();return samples;
    });
    assert.ok(samples.every(s=>s.top>s.copyBottom+5),JSON.stringify(samples.filter(s=>s.top<=s.copyBottom+5)));assert.ok(samples.every(s=>s.left>=0&&s.right<=viewport.width));assert.ok(samples.every(s=>s.anchorError<1e-8));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);layouts.push({viewport,topGap:Math.min(...samples.map(s=>s.top-s.copyBottom)),anchorError:Math.max(...samples.map(s=>s.anchorError))});
    await page.screenshot({path:`${output}/about-layout-${viewport.width}.png`});
  }
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'full movement envelope at compact sizes',layouts});console.log('PASS about movement layout');await context.close();
 }
 {
  const page=await browser.newPage();await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await page.goto(server.base+'/about/');await ready(page);await settle(page);assert.equal(await page.locator('[data-activity]').count(),0);
  assert.equal((await page.locator('.about-lead').textContent()).replace(/\s+/g,' ').trim(),source);assert.equal(await page.locator('.about-contact a').count(),3);
  report.cases.push({name:'no WebGL keeps biography and contacts'});console.log('PASS about no WebGL');await page.close();
 }
}finally{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(`${output}/about-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
