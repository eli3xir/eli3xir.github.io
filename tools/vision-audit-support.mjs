import fs from 'node:fs';import assert from 'node:assert/strict';
const reference=JSON.parse(fs.readFileSync('tools/fixtures/vision-reference.json','utf8'));
export function compareReference(report){
 const fixture=[reference,...reference.variants].find(r=>r.width===report.width&&r.height===report.height);assert.ok(fixture);
 assert.deepEqual(report.scales.map(s=>s.candidates),fixture.counts);const errors=[];
 for(let stage=0;stage<3;stage++){
  const expected=fixture.stages[stage].boxes,actual=report.stages[stage].boxes.map(row=>[...row.box,...(row.marks||[])]);assert.equal(actual.length,expected.length);
  // Near-equal scores can swap proposal order across BLAS/WASM kernels. Require
  // a unique geometry match for EVERY row, including confidence and landmarks.
  const matches=new Set();let error=0;
  for(const row of expected){let nearest=-1,distance=Infinity;actual.forEach((candidate,i)=>{const d=Math.max(...row.slice(0,4).map((v,j)=>Math.abs(v-candidate[j])));if(d<distance){nearest=i;distance=d;}});
   assert.ok(!matches.has(nearest));matches.add(nearest);assert.equal(row.length,actual[nearest].length);error=Math.max(error,...row.map((v,i)=>Math.abs(v-actual[nearest][i])));
  }
  assert.ok(error<.005,`stage ${stage} independent reference difference ${error}`);errors.push(error);
 }
 const ids=report.stages.map(stage=>stage.boxes.map(row=>row.id));assert.equal(new Set(ids[0]).size,ids[0].length);assert.ok(ids[1].every(id=>ids[0].includes(id)));assert.ok(ids[2].every(id=>ids[1].includes(id)));return errors;
}
export async function geometryFrame(page,progress){
 return page.evaluate(async progress=>{
  const T=await import('three'),w=window.studio.world,v=window.studio.route.vision,m=w.model.optical;
  w.moving=1;const at=(v.state.startedAt+progress*v.state.beat)*1000;w.frame(at);
  const atRequestedTime={progress:v.state.progress,phase:v.state.phase};
  // Floating-point division can put the constructed deadline just below eight
  // beats. Observe completion one microsecond after it, like the next RAF.
  if(progress===8){w.moving=1;w.frame(at+.001);}w.scene.updateMatrixWorld(true);
  const hand=w.actor.root.getObjectByName('mote-right-hand').getWorldPosition(new T.Vector3()),contact=m.contact.getWorldPosition(new T.Vector3());
  const marks=m.marks.geometry.attributes.position,points=[];for(let i=0;i<m.marks.geometry.drawRange.count;i++)points.push([marks.getX(i),marks.getY(i),marks.getZ(i)]);
  return{progress:v.state.progress,requestedProgress:progress,atRequestedTime,handError:hand.distanceTo(contact),...m.diagnostics(),points,photo:{repeat:m.photo.repeat.toArray(),offset:m.photo.offset.toArray()},levels:m.levels.map(l=>({visible:l.root.visible,position:l.root.position.toArray(),scale:l.root.scale.toArray()}))};
 },progress);
}
export async function layout(page){
 return page.evaluate(async()=>{
  const T=await import('three'),w=window.studio.world,copy=document.querySelector(document.querySelector('.project-scene').offsetHeight?'.project-instruments':'.hero-copy').getBoundingClientRect(),bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
  for(const root of [w.model.root,w.actor.root]){root.updateWorldMatrix(true,true);root.traverseVisible(obj=>{
   if(!obj.geometry||obj.geometry.drawRange.count===0)return;const positions=obj.geometry.attributes.position;
   // Dynamic line/point buffers contain unused zero slots; inspect drawRange.
   if(obj.isPoints||obj.isLine){for(let i=0;i<Math.min(positions.count,obj.geometry.drawRange.count);i++)project(new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(obj.matrixWorld));return;}
   obj.geometry.computeBoundingBox();const box=obj.geometry.boundingBox,matrix=new T.Matrix4();
   for(let i=0;i<(obj.isInstancedMesh?obj.count:1);i++){if(obj.isInstancedMesh){obj.getMatrixAt(i,matrix);matrix.premultiply(obj.matrixWorld);}else matrix.copy(obj.matrixWorld);
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])project(new T.Vector3(x,y,z).applyMatrix4(matrix));
   }
  });}
  function project(p){p.project(w.camera);bounds.left=Math.min(bounds.left,(p.x+1)*innerWidth/2);bounds.right=Math.max(bounds.right,(p.x+1)*innerWidth/2);bounds.top=Math.min(bounds.top,(1-p.y)*innerHeight/2+scrollY);bounds.bottom=Math.max(bounds.bottom,(1-p.y)*innerHeight/2+scrollY);}
  return{bounds,textBottom:copy.bottom+scrollY,panelTop:document.querySelector('.project-panels').getBoundingClientRect().top+scrollY,heroHeight:document.querySelector('.world-hero').offsetHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,targets:[...document.querySelectorAll('.project-workbench button,.vision-inputs label')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden').map(el=>{const b=el.getBoundingClientRect();return{width:b.width,height:b.height};})};
 });
}
