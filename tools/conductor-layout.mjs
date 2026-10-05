import assert from 'node:assert/strict';
import {output} from './browser-support.mjs';

export async function checkConductorLayout(page){
 const cases=[];
 for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024},{width:844,height:390},{width:851,height:900},{width:1024,height:768},{width:1440,height:1000}]){
  await page.setViewportSize(viewport);await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);
  const result=await page.evaluate(async()=>{
   const T=await import('three'),w=window.studio.world;
   const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity},start=performance.now();let gripError=0,frames=0;
   do{
    await new Promise(requestAnimationFrame);w.scene.updateMatrixWorld(true);
    const hand=w.actor.root.getObjectByName('mote-right-hand').getWorldPosition(new T.Vector3()),baton=w.model.root.getObjectByName('conductor-baton').getWorldPosition(new T.Vector3());gripError=Math.max(gripError,hand.distanceTo(baton));
    for(const root of [w.model.root,w.actor.root])root.traverseVisible(object=>{
     if(!object.geometry)return;object.geometry.computeBoundingBox();const box=object.geometry.boundingBox;
     for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new T.Vector3(x,y,z).applyMatrix4(object.matrixWorld).project(w.camera),px=(p.x+1)*innerWidth/2,py=(1-p.y)*innerHeight/2+scrollY;
      bounds.left=Math.min(bounds.left,px);bounds.right=Math.max(bounds.right,px);bounds.top=Math.min(bounds.top,py);bounds.bottom=Math.max(bounds.bottom,py);
     }
    });
    frames++;
   }while(performance.now()-start<1150);
   const slot=document.querySelector('.radio-scene').getBoundingClientRect();
   return{bounds,gripError,frames,sampleSeconds:(performance.now()-start)/1000,compact:w.compact,slot:slot.toJSON(),copyBottom:document.querySelector('.hero-copy').getBoundingClientRect().bottom+scrollY,
    heroHeight:document.querySelector('.world-hero').offsetHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  cases.push({viewport,...result});
  await page.screenshot({path:`${output}/conductor-layout-${viewport.width}.png`});
  assert.equal(result.overflow,false);assert.ok(result.gripError<1e-7);
  assert.ok(result.bounds.left>=12&&result.bounds.right<=viewport.width-12,JSON.stringify(cases.at(-1)));
  if(result.compact){
   assert.ok(result.bounds.top>result.slot.top+10&&result.bounds.bottom<result.slot.bottom-10,JSON.stringify(cases.at(-1)));
   assert.ok(result.bounds.left>result.slot.left+8&&result.bounds.right<result.slot.right-8,JSON.stringify(cases.at(-1)));
  }
  if([390,768,851,1024].includes(viewport.width))assert.ok(result.bounds.bottom<viewport.height-(viewport.width===390?90:60),JSON.stringify(cases.at(-1)));
  if(viewport.height<600){
   await page.evaluate(()=>{const b=document.querySelector('.radio-scene').getBoundingClientRect();scrollTo(0,b.top+scrollY-16);});await page.waitForTimeout(160);
   await page.screenshot({path:`${output}/conductor-layout-${viewport.width}-scrolled.png`});
  }
 }
 return cases;
}
