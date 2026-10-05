import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const mode=async(page,id)=>{await page.locator(`[data-instrument=${id}]`).click();await page.waitForFunction(id=>window.studio.world.model.instrumentLevels[id]===1,id);};
const done=page=>page.waitForFunction(()=>window.studio.route.compiler.state.phase==='done');
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,hasTouch:viewport.width<700}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+'/projects/');await ready(page);await settle(page);
  await page.evaluate(()=>{const w=window.studio.world;window.identities={root:w.model.root,bench:w.model.root.children[0],actor:w.actor,renderer:w.renderer,atlas:w.model.syntax.atlas};});
  await mode(page,'compiler');assert.equal(await page.locator('[data-instrument=compiler]').getAttribute('aria-pressed'),'true');
  const source=page.getByRole('textbox',{name:'把一个念头写成算式'});await source.fill('x := 2 + 3 * 4;');await source.press('Enter');
  assert.equal(await page.locator('.compiler-form button').isDisabled(),true);assert.equal(await source.getAttribute('readonly'),'');
  await page.waitForFunction(()=>window.studio.route.compiler.state.phase==='evaluating');
  if(viewport.width<700)await page.evaluate(()=>scrollTo(0,280));await page.screenshot({path:`${output}/compiler-flow-${viewport.width}.png`});await done(page);
  assert.equal(await page.evaluate(()=>window.studio.route.compiler.state.program.result),14);
  await page.locator('[data-source="x := (2 + 3) * 4;"]').click();await done(page);
  const grouped=await page.evaluate(()=>window.studio.route.compiler.state.program);assert.equal(grouped.result,20);assert.deepEqual(grouped.steps.map(s=>s.value),[5,20,20]);
  if(viewport.width<700)await page.evaluate(()=>scrollTo(0,280));await page.screenshot({path:`${output}/compiler-done-${viewport.width}.png`});
  const tree=await page.evaluate(()=>{const m=window.studio.world.model.syntax;return{nodes:m.chips.filter(c=>c.root.visible).map(c=>({at:c.root.position.toArray(),target:c.target.toArray()})),edges:m.rods.count,packets:m.packets.count};});
  assert.equal(tree.edges,grouped.nodes.length-1);assert.equal(tree.packets,0);assert.ok(tree.nodes.every(c=>c.at.every((v,i)=>Number.isFinite(v)&&Math.abs(v-c.target[i])<1e-7)));
  const serial=await page.evaluate(()=>window.studio.route.compiler.state.serial);await source.fill('x := 2 + ;');await source.press('Enter');
  assert.equal(await source.getAttribute('aria-invalid'),'true');assert.match(await page.locator('#compiler-status').textContent(),/第 10 列/);assert.equal(await page.evaluate(()=>document.activeElement.id),'compiler-source');
  assert.deepEqual(await source.evaluate(el=>[el.selectionStart,el.selectionEnd]),[9,10]);assert.equal(await page.evaluate(()=>window.studio.route.compiler.state.serial),serial);
  await source.fill('x := 2 +  ;');await source.press('Enter');assert.match(await page.locator('#compiler-status').textContent(),/第 11 列/);assert.deepEqual(await source.evaluate(el=>[el.selectionStart,el.selectionEnd]),[10,11]);
  // Launch on an audio beat, then suspend that clock. The UI clock still finishes the lesson.
  await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
  await source.fill('n := -(2 + 3) * -2;');await source.press('Enter');await page.evaluate(()=>window.studio.score.context.suspend());await done(page);
  assert.equal(await page.evaluate(()=>window.studio.route.compiler.state.program.result),10);
  // Synchronous diagnostics around real DOM handlers isolate retarget discontinuities from elapsed RAF time.
  const motion=await page.evaluate(async()=>{
   const w=window.studio.world,m=w.model,instant=[],frames=[];
   const pose=()=>[m.instrumentBlend,m.circuit.scale.y,m.circuit.position.y,m.syntax.root.scale.y,m.syntax.root.position.y,w.layoutScale,w.heroOffset];
   for(const id of ['signal','compiler','signal','compiler']){
    const before=pose();document.querySelector(`[data-instrument=${id}]`).click();instant.push(Math.max(...pose().map((v,i)=>Math.abs(v-before[i]))));
    const end=performance.now()+190;while(performance.now()<end){await new Promise(requestAnimationFrame);frames.push(pose());}
   }
   return{instant,frames,same:w.model.root===window.identities.root&&w.model.root.children[0]===window.identities.bench&&w.actor===window.identities.actor&&w.renderer===window.identities.renderer};
  });assert.deepEqual(motion.instant,[0,0,0,0]);assert.equal(motion.same,true);assert.ok(motion.frames.length>5&&motion.frames.flat().every(Number.isFinite));
  for(const index of [5,6]){const values=motion.frames.map(frame=>frame[index]);assert.ok(Math.max(...values)-Math.min(...values)<1e-7,'instrument switching changed responsive framing');}
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  const memory=await page.evaluate(()=>{
   const w=window.studio.world,c=window.studio.route.compiler,samples=[];for(let i=0;i<30;i++){
    c.run(i%2?'x := 2 + 3 * 4;':'x := (2 + 3) * 4;',{reduced:true});w.moving=1;w.frame(performance.now());samples.push({...w.renderer.info.memory});
   }return{samples,atlasSame:w.model.syntax.atlas===window.identities.atlas};
  });assert.equal(memory.atlasSame,true);assert.equal(new Set(memory.samples.map(v=>`${v.geometries}/${v.textures}`)).size,1);
  await page.evaluate(()=>{const m=window.studio.world.model.syntax;window.compilerOld=window.studio.route.compiler;window.releases={atlas:0,rods:0};m.atlas.addEventListener('dispose',()=>window.releases.atlas++);m.rods.geometry.addEventListener('dispose',()=>window.releases.rods++);});
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);assert.deepEqual(await page.evaluate(()=>window.releases),{atlas:1,rods:1});
  await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);assert.equal(await page.evaluate(()=>window.studio.route.compiler.state.serial),0);
  await page.locator('#pascal-s-compiler .compiler-entry').click();await page.waitForTimeout(100);assert.equal(await source.evaluate(el=>document.activeElement===el),true);assert.equal(await page.locator('[data-instrument=compiler]').getAttribute('aria-pressed'),'true');
  await source.fill('x := 7;');await source.press('Enter');assert.equal(await page.evaluate(()=>window.studio.route.compiler.state.phase),'done');
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'input, actual tree, errors, clock suspension, continuous switching, stable resources and cleanup',viewport,grouped,tree,motion,memory});await context.close();console.log(`PASS compiler behavior ${viewport.width}`);
 }
 {
  const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);const layouts=[];
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:568,height:320},{width:1280,height:540},{width:1440,height:1000}]){
   await page.setViewportSize(viewport);await page.goto(server.base+'/projects/');await ready(page);await settle(page);await mode(page,'compiler');
   await page.locator('.compiler-form button').click();await page.waitForTimeout(120);
   const layout=await page.evaluate(async()=>{
    const T=await import('three'),w=window.studio.world,hero=document.querySelector('.world-hero'),copy=document.querySelector('.hero-copy').getBoundingClientRect();
    const r={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
    for(const root of [w.model.root,w.actor.root]){root.updateWorldMatrix(true,true);root.traverseVisible(obj=>{
     if(!obj.geometry)return;obj.geometry.computeBoundingBox();const box=obj.geometry.boundingBox,matrix=new T.Matrix4();
     for(let i=0;i<(obj.isInstancedMesh?obj.count:1);i++){
      if(obj.isInstancedMesh){obj.getMatrixAt(i,matrix);matrix.premultiply(obj.matrixWorld);}else matrix.copy(obj.matrixWorld);
      for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).applyMatrix4(matrix).project(w.camera);r.left=Math.min(r.left,(p.x+1)*innerWidth/2);r.right=Math.max(r.right,(p.x+1)*innerWidth/2);r.top=Math.min(r.top,(1-p.y)*innerHeight/2+scrollY);r.bottom=Math.max(r.bottom,(1-p.y)*innerHeight/2+scrollY);}
     }
    });}
    const buttons=[...document.querySelectorAll('.project-workbench button')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>{const b=el.getBoundingClientRect();return{width:b.width,height:b.height};});
    return{overflow:document.documentElement.scrollWidth>innerWidth+1,model:r,textBottom:copy.bottom+scrollY,heroHeight:hero.offsetHeight,buttons};
   });assert.equal(layout.overflow,false);assert.ok(layout.model.left>=-1&&layout.model.right<=viewport.width+1,JSON.stringify({viewport,layout}));
   if(viewport.width<=850){assert.ok(layout.model.top>=layout.textBottom+12,JSON.stringify({viewport,layout}));assert.ok(layout.model.bottom<layout.heroHeight-25,JSON.stringify({viewport,layout}));}
   assert.ok(layout.buttons.every(b=>b.height>=44&&b.width>=44),JSON.stringify({viewport,layout}));layouts.push({viewport,...layout});
  }
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({name:'seven responsive compositions and target sizes',layouts});await context.close();console.log('PASS compiler layouts');
 }
 {
  const context=await browser.newContext(),page=await context.newPage();await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
  await page.goto(server.base+'/projects/');await ready(page);await settle(page);await page.locator('[data-instrument=compiler]').click();await page.locator('[data-source="x := (2 + 3) * 4;"]').click();
  assert.equal(await page.evaluate(()=>window.studio.route.compiler.state.program.result),20);assert.match(await page.locator('#compiler-status').textContent(),/x = 20/);
  assert.equal(await page.locator('.pcard').count(),4);assert.equal(await page.locator('.compiler-repository').getAttribute('href'),'https://gitee.com/buptsg2019/pascal-s-compiler');
  report.cases.push({name:'no WebGL keeps expression results and original projects'});await context.close();console.log('PASS compiler no WebGL');
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/compiler-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
