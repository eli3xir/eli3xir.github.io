import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const mode=async(page,id)=>{await page.locator(`[data-instrument=${id}]`).click();await page.waitForFunction(id=>window.studio.world.model.instrumentLevels[id]===1,id);};
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,recordVideo:process.env.LIFT_VIDEO?{dir:output,size:viewport}:undefined}),page=await context.newPage(),log=observe(page),marks=[],start=Date.now();
  const mark=name=>marks.push({name,seconds:(Date.now()-start)/1000});
  await page.goto(server.base+'/projects/');await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{const w=window.studio.world,m=w.model;window.liftIdentities=[w.renderer,w.actor,m.root,m.circuit,m.syntax.root,m.optical.root,m.optical.photo];});
  await mode(page,'vision');await page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready');mark('vision ready');
  if(viewport.width<700)await page.evaluate(()=>scrollTo(0,280));await page.screenshot({path:`${output}/lift-vision-${viewport.width}.png`});
  // Uninterrupted RAF motion driven by actual handlers, with rapid reversals.
  const motion=await page.evaluate(async()=>{
    const T=await import('three'),w=window.studio.world,m=w.model,frames=[],instant=[];
    const groups=[m.circuit,m.syntax.root,m.optical.root],pose=()=>[...Object.values(m.instrumentLevels),...groups.map(g=>g.position.y),...m.actorAnchor.position.toArray()];
    const sample=()=>{
      const points=[[-1,-.75,-.6],[1,-.75,.8],[0,-.75,.2]].map(p=>new T.Vector3(...p).applyMatrix4(m.root.children[0].matrixWorld));
      const shoulder=w.actor.root.children[0].children.find(o=>o.type==='Group'&&o.position.x>0);
      const hand=w.actor.root.getObjectByName('mote-right-hand'),a=new T.Vector3(),b=new T.Vector3();shoulder.getWorldPosition(a);hand.getWorldPosition(b);
      return{levels:m.instrumentLevels,scales:groups.map(g=>g.scale.toArray()),layout:[w.layoutScale,w.heroOffset],planeError:Math.max(...points.map(p=>Math.abs(m.clipPlane.distanceToPoint(p)))),armLength:a.distanceTo(b)/(w.layoutScale||1),reach:m.actorMotion.reach};
    };
    for(const [id,wait] of [['signal',160],['vision',185],['compiler',380],['signal',170],['vision',1450],['signal',1350],['compiler',1350],['vision',1350]]){
      const before=pose();document.querySelector(`[data-instrument=${id}]`).click();instant.push(Math.max(...pose().map((v,i)=>Math.abs(v-before[i]))));
      const end=performance.now()+wait;while(performance.now()<end){await new Promise(requestAnimationFrame);frames.push(sample());}
    }
    return{instant,frames,same:[w.renderer,w.actor,m.root,m.circuit,m.syntax.root,m.optical.root,m.optical.photo].every((value,i)=>value===window.liftIdentities[i])};
  });mark('continuous choices finished');
  assert.equal(motion.same,true);assert.ok(motion.instant.every(value=>value===0));assert.ok(motion.frames.length>30);
  for(const frame of motion.frames){
    assert.ok(Object.values(frame.levels).every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert.ok(Object.values(frame.levels).filter(v=>v>0).length<=1);
    assert.ok(frame.scales.flat().every(v=>v===1));assert.ok(frame.planeError<1e-7);assert.ok(frame.armLength<.25,JSON.stringify(frame));
    for(let i=0;i<2;i++)assert.ok(Math.abs(frame.layout[i]-motion.frames[0].layout[i])<1e-7);
  }
  await page.waitForFunction(()=>window.studio.world.model.instrumentLevels.vision===1);
  // Sample the actual exit at a known time for an independent pixel check.
  // These controlled frames are separate from the uninterrupted capture above.
  const partial=await page.evaluate(()=>{const w=window.studio.world,m=w.model;w.stop();const original=m.setInstrument;let options;m.setInstrument=(id,o)=>{options=o;original(id,o);};document.querySelector('[data-instrument=signal]').click();m.setInstrument=original;w.moving=1;w.frame((options.now+options.delay+options.duration*.22)*1000);return m.instrumentLevels;});
  assert.ok(partial.vision>0&&partial.vision<1);await page.screenshot({path:`${output}/lift-exit-${viewport.width}.png`});
  const pixels=await page.evaluate(async()=>{
    const T=await import('three'),w=window.studio.world,m=w.model,r=w.renderer,bench=m.root.children[0];
    const source=m.optical.root.children.find(o=>o.isMesh&&o.material.map===m.optical.photo),copy=source.clone();copy.matrixAutoUpdate=false;copy.matrix.copy(source.matrixWorld);
    const scene=new T.Scene();scene.add(copy);const scale=new T.Vector3();bench.getWorldScale(scale);
    const camera=new T.OrthographicCamera(-.94*scale.x,.94*scale.x,.94*scale.x,-.94*scale.x,.01,10),center=new T.Vector3();source.getWorldPosition(center);bench.getWorldQuaternion(camera.quaternion);
    camera.position.copy(center).add(new T.Vector3(0,0,3).applyQuaternion(camera.quaternion));camera.updateMatrixWorld(true);
    const target=new T.WebGLRenderTarget(128,128),savedTarget=r.getRenderTarget(),savedColor=r.getClearColor(new T.Color()),savedAlpha=r.getClearAlpha(),reference=source.material.clone();reference.clippingPlanes=null;
    const read=()=>{const pixels=new Uint8Array(128*128*4);r.setRenderTarget(target);r.setClearColor(0,0);r.clear();r.render(scene,camera);r.readRenderTargetPixels(target,0,0,128,128,pixels);return pixels;};
    const clipped=read();copy.material=reference;const full=read();
    const fraction=(-.75-(.31-.94+m.optical.root.position.y))/1.88;let below=0,above=0,leaks=0,maxDifference=0;
    for(let y=0;y<128;y++)for(let x=3;x<125;x++){
      const offset=(y*128+x)*4;
      if(y+2<128*fraction){below++;if(clipped[offset+3]!==0)leaks++;}
      if(y-2>128*fraction){above++;for(let c=0;c<4;c++)maxDifference=Math.max(maxDifference,Math.abs(clipped[offset+c]-full[offset+c]));}
    }
    const materials=new Set();for(const group of [m.circuit,m.syntax.root,m.optical.root])group.traverse(o=>{if(o.material)for(const mat of Array.isArray(o.material)?o.material:[o.material])materials.add(mat);});
    const flags=[...materials].every(mat=>mat.clippingPlanes?.[0]===m.clipPlane&&mat.clipShadows);
    r.setRenderTarget(savedTarget);r.setClearColor(savedColor,savedAlpha);reference.dispose();target.dispose();
    return{fraction,below,above,leaks,maxDifference,flags};
  });assert.ok(pixels.below>1000&&pixels.above>1000,JSON.stringify(pixels));assert.equal(pixels.leaks,0);assert.equal(pixels.maxDifference,0);assert.equal(pixels.flags,true);
  await page.emulateMedia({reducedMotion:'reduce'});
  const shaftEnds=await page.evaluate(async()=>{
    const T=await import('three'),w=window.studio.world,m=w.model,results=[];let now=performance.now()/1000;
    // Sample immediately before hiding each root. Even its highest visible
    // geometry must already be below the opening, otherwise it would pop out.
    for(const [id,group] of [['signal',m.circuit],['compiler',m.syntax.root],['vision',m.optical.root]]){
      m.setInstrument(id,{now,reduced:true});m.update(0,{},0,now,true);m.afterTransform();
      m.setInstrument(id==='signal'?'vision':'signal',{now:now+.01,duration:1});m.update(0,{},0,now+.4699,false);m.afterTransform();
      let max=-Infinity;group.traverseVisible(object=>{
        if(!object.geometry||object.geometry.drawRange.count===0)return;object.geometry.computeBoundingBox();const box=object.geometry.boundingBox,matrix=new T.Matrix4();
        for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){
          if(object.isInstancedMesh){object.getMatrixAt(i,matrix);matrix.premultiply(object.matrixWorld);}else matrix.copy(object.matrixWorld);
          for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])max=Math.max(max,m.clipPlane.distanceToPoint(new T.Vector3(x,y,z).applyMatrix4(matrix)));
        }
      });results.push({id,level:m.instrumentLevels[id],visible:group.visible,max});now+=2;
    }return results;
  });assert.ok(shaftEnds.every(s=>s.visible&&s.level>0&&Number.isFinite(s.max)&&s.max<0),JSON.stringify(shaftEnds));
  const memory=await page.evaluate(()=>{
    const w=window.studio.world,m=w.model,samples=[];let clock=performance.now();
    for(let i=0;i<24;i++)for(const id of ['signal','compiler','vision']){
      m.setInstrument(id,{now:clock/1000,reduced:true});w.moving=1;w.frame(clock++);
      if(i>0)samples.push({...w.renderer.info.memory,programs:w.renderer.info.programs.length});
    }
    const pallet=m.circuit.getObjectByName('instrument-pallet');window.liftReleased={geometry:0,material:0};pallet.geometry.addEventListener('dispose',()=>window.liftReleased.geometry++);pallet.material.addEventListener('dispose',()=>window.liftReleased.material++);
    return{samples,localClipping:w.renderer.localClippingEnabled};
  });assert.equal(new Set(memory.samples.map(s=>JSON.stringify(s))).size,1);assert.equal(memory.localClipping,true);
  await page.evaluate(()=>window.studio.world.start());await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
  assert.equal(await page.evaluate(()=>window.studio.world.renderer.localClippingEnabled),false);assert.deepEqual(await page.evaluate(()=>window.liftReleased),{geometry:1,material:1});
  await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);assert.equal(await page.evaluate(()=>window.studio.world.renderer.localClippingEnabled),true);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({viewport,motion,partial,pixels,shaftEnds,memory,marks});
  await context.close();if(process.env.LIFT_VIDEO)await page.video().saveAs(`${output}/lift-motion-${viewport.width}.webm`);console.log(`PASS instrument lift ${viewport.width}`);
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/instrument-lift-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
