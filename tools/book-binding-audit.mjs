import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
try{
 for(const width of [1440,390]){
  const viewport={width,height:width===390?844:1000},context=await browser.newContext({viewport,
   ...(process.env.BINDING_VIDEO?{recordVideo:{dir:output,size:viewport}}:{})}),page=await context.newPage(),log=observe(page),video=page.video();
  await page.goto(server.base+'/blog/');await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
  const construction=await page.evaluate(async()=>{
   const T=await import('three'),root=window.studio.world.model.root,blocks=[],boards=[],maps=new Map();
   root.traverse(object=>{
    for(const material of [object.material].flat().filter(Boolean))for(const value of Object.values(material))if(value?.isTexture&&value.name.startsWith('book-'))maps.set(value.uuid,value);
    if(object.name==='book-board'){
     const uv=object.geometry.attributes.uv;let min=Infinity,max=-Infinity;
     for(const value of uv.array){min=Math.min(min,value);max=Math.max(max,value);}boards.push({min,max});
    }
    if(object.name!=='book-text-block')return;
    const p=object.geometry.attributes.position,edges=new Map(),key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(6)).join(',');
    let volume=0;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    for(let i=0;i<p.count;i+=3){
     a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2);volume+=a.dot(b.cross(c))/6;
     for(const [u,v] of [[i,i+1],[i+1,i+2],[i+2,i]]){
      const x=key(u),y=key(v),id=x<y?x+'|'+y:y+'|'+x,item=edges.get(id)||{count:0,direction:0};
      item.count++;item.direction+=x<y?1:-1;edges.set(id,item);
     }
    }
    blocks.push({volume,triangles:p.count/3,closed:[...edges.values()].every(edge=>edge.count===2&&edge.direction===0),groups:object.geometry.groups.length});
   });
   window.bindingDisposals=[];
   for(const texture of maps.values()){const item={name:texture.name,count:0};window.bindingDisposals.push(item);texture.addEventListener('dispose',()=>item.count++);}
   return{blocks,boards,maps:[...maps.values()].map(map=>({name:map.name,width:map.image.width,height:map.image.height,colorSpace:map.colorSpace,mipmaps:map.generateMipmaps,uploaded:!!window.studio.world.renderer.properties.get(map).__webglTexture}))};
  });
  assert.equal(construction.blocks.length,2);assert.ok(construction.blocks.every(block=>block.closed&&block.volume>0&&block.groups===2));
  assert.equal(construction.boards.length,2);assert.ok(construction.boards.every(board=>board.min>=-1e-5&&board.max<=1.00001&&board.max-board.min>.95),JSON.stringify(construction.boards));
  assert.equal(construction.maps.length,4);assert.ok(construction.maps.every(map=>map.uploaded&&map.mipmaps));
  assert.ok(construction.maps.every(map=>map.colorSpace===(map.name==='book-edge-color'?'srgb':'')));
  await page.screenshot({path:`${output}/book-binding-${width}.png`});
  const next=page.getByRole('button',{name:'翻到下一篇'});await next.click();await page.waitForTimeout(250);
  await page.screenshot({path:`${output}/book-binding-turn-${width}.png`});await page.waitForFunction(()=>!window.studio.world.model.turning);
  await page.evaluate(()=>{
   const w=window.studio.world;w.stop();window.bindingPoseStart=performance.now()/1000;
   w.model.next({now:window.bindingPoseStart,delay:0,duration:1,reduced:false});w.frame((window.bindingPoseStart+.36)*1000);
  });
  await page.screenshot({path:`${output}/book-binding-fold-${width}.png`});
  await page.evaluate(()=>{const w=window.studio.world;w.frame((window.bindingPoseStart+1)*1000);w.last=performance.now();w.start();});
  const quality=[];
  for(const value of ['low','high','auto']){
   await page.evaluate(async value=>{const {setVisualQuality}=await import('/js/experience/visual-quality.js');setVisualQuality(value);},value);
   await page.waitForTimeout(160);await page.screenshot({path:`${output}/book-binding-${value}-${width}.png`});quality.push(await page.evaluate(()=>window.studio.diagnostics()));
  }
  // Recreate the book at the settled quality before comparing allocations;
  // the preceding material generation also cached the low-quality variant.
  await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
  assert.ok((await page.evaluate(()=>window.bindingDisposals)).every(item=>item.count===1));
  await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
  await next.click();await page.waitForFunction(()=>!window.studio.world.model.turning);
  const resources=[];
  for(let cycle=0;cycle<3;cycle++){
   const sample=await page.evaluate(()=>{const r=window.studio.world.renderer;return{...r.info.memory,programs:r.info.programs.length};});resources.push(sample);
   await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
   assert.ok((await page.evaluate(()=>window.bindingDisposals)).every(item=>item.count===1));
   await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
   await next.click();await page.waitForFunction(()=>!window.studio.world.model.turning);
  }
  assert.ok(resources.every(item=>JSON.stringify(item)===JSON.stringify(resources[0])),JSON.stringify(resources));
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.push({width,construction,quality,resources});
  await context.close();if(video)await video.saveAs(`${output}/book-binding-${width}.webm`);console.log('PASS bound book',width);
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/book-binding-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
