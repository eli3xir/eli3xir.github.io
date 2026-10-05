import * as THREE from 'three';
import {brass,ink,mesh} from './materials.js';
import {casing} from './hardware.js';
import {display} from './signal-hardware.js';
import {batchStatic} from './batch.js';
import {imageScales,MAX_CANDIDATES} from '../vision/mtcnn-geometry.js';

const ease=p=>{p=THREE.MathUtils.clamp(p,0,1);return p*p*(3-2*p);};
const CENTER=new THREE.Vector3(-.12,.31,.17),PHOTO_SIZE=1.88;
export function createVisionBench(vision){
  const root=new THREE.Group(),hardware=new THREE.Group();root.name='vision-workbench';root.add(hardware);
  const metal=brass(),dark=ink(),enamel=new THREE.MeshPhysicalMaterial({color:0x24443b,metalness:.38,roughness:.31,clearcoat:.6});
  mesh(casing(2.23,2.12,.13,.09),enamel,hardware,[CENTER.x,CENTER.y,.08]);
  mesh(casing(2.08,1.98,.024,.035),metal,hardware,[CENTER.x,CENTER.y,.157]);
  mesh(casing(2.02,1.92,.025,.02),dark,hardware,[CENTER.x,CENTER.y,.172]);
  for(const x of [-1.31,1.08]){
    mesh(new THREE.CylinderGeometry(.036,.036,.45,12),metal,hardware,[x,-.53,.12]);
    mesh(casing(.24,.075,.36,.025),dark,hardware,[x,-.68,.12]);
  }
  for(const x of [-1.26,1.04]){
    const rail=mesh(new THREE.CylinderGeometry(.023,.023,1.1,12),metal,hardware,[x,-.51,.6]);rail.rotation.x=Math.PI/2;
  }
  for(const x of [-1.16,.92])for(const y of [-.63,1.25]){const screw=mesh(new THREE.CylinderGeometry(.018,.018,.012,10),metal,hardware,[x,y,.18]);screw.rotation.x=Math.PI/2;}
  const wheel=new THREE.Group();root.add(wheel);wheel.position.set(1.33,.58,.42);
  const rim=mesh(new THREE.TorusGeometry(.18,.025,10,40),metal,wheel);rim.castShadow=true;
  mesh(new THREE.CylinderGeometry(.052,.052,.12,20),dark,wheel).rotation.x=Math.PI/2;
  for(let i=0;i<3;i++){const spoke=mesh(new THREE.BoxGeometry(.016,.31,.018),metal,wheel);spoke.rotation.z=i*Math.PI/3;}
  const handle=mesh(new THREE.CylinderGeometry(.032,.032,.12,16),enamel,wheel,[.12,.12,.075]);handle.rotation.x=Math.PI/2;
  const contact=new THREE.Object3D();contact.position.set(.12,.12,.145);wheel.add(contact);
  mesh(casing(.42,.74,.22,.055),enamel,hardware,[1.33,.08,.09]);
  const screen=display(720,160),readout=mesh(new THREE.PlaneGeometry(1.65,.34),new THREE.MeshBasicMaterial({map:screen.texture,toneMapped:false}),hardware,[-.12,-.48,1.07]);readout.rotation.x=-.18;readout.castShadow=false;
  screen.draw('MTCNN / OPTICAL BENCH','INSERT A PHOTOGRAPH','P-NET / R-NET / O-NET');batchStatic(hardware);

  // GPU texture storage keeps its dimensions after the first upload. Paint all
  // sources into one fixed canvas; the photo plane preserves their aspect ratio.
  const photoCanvas=document.createElement('canvas');photoCanvas.width=photoCanvas.height=512;
  const ctx=photoCanvas.getContext('2d');ctx.fillStyle='#10251f';ctx.fillRect(0,0,512,512);ctx.strokeStyle='#486856';ctx.strokeRect(120,120,272,272);
  const photo=new THREE.CanvasTexture(photoCanvas);photo.colorSpace=THREE.SRGBColorSpace;photo.anisotropy=4;
  const paper=new THREE.MeshBasicMaterial({map:photo,toneMapped:false});
  const plane=new THREE.PlaneGeometry(1,1),picture=mesh(plane,paper,root,CENTER.toArray());picture.position.z=.193;picture.scale.set(PHOTO_SIZE,PHOTO_SIZE,1);picture.castShadow=picture.receiveShadow=false;
  const atlasCanvas=document.createElement('canvas');atlasCanvas.width=1024;atlasCanvas.height=512;
  const atlasContext=atlasCanvas.getContext('2d'),atlas=new THREE.CanvasTexture(atlasCanvas);atlas.colorSpace=THREE.SRGBColorSpace;
  const labelMaterial=new THREE.MeshBasicMaterial({map:atlas,transparent:true,toneMapped:false,depthWrite:false});
  const levels=Array.from({length:12},(_,index)=>{
    const group=new THREE.Group();root.add(group);group.visible=false;
    const sheet=mesh(plane,new THREE.MeshBasicMaterial({map:photo,transparent:true,opacity:0,toneMapped:false,side:THREE.DoubleSide,depthWrite:false}),group);
    sheet.castShadow=sheet.receiveShadow=false;
    const outline=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.5,-.5,0),new THREE.Vector3(.5,-.5,0),new THREE.Vector3(.5,.5,0),new THREE.Vector3(-.5,.5,0)]),new THREE.LineBasicMaterial({color:0xccb885,transparent:true,opacity:0}));group.add(outline);
    const labelGeometry=new THREE.PlaneGeometry(.66,.165),uv=labelGeometry.attributes.uv,col=index%4,row=Math.floor(index/4);
    for(let i=0;i<uv.count;i++)uv.setXY(i,(col+uv.getX(i))/4,1-(row+1-uv.getY(i))/3);
    const label=mesh(labelGeometry,labelMaterial,group,[0,-.57,.009]);label.castShadow=false;
    return{root:group,sheet,outline,label};
  });
  const positions=new Float32Array(MAX_CANDIDATES*8*3),colors=new Float32Array(positions.length),geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));geometry.setDrawRange(0,0);
  const boxes=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({vertexColors:true,toneMapped:false,transparent:true,opacity:.82,depthWrite:false}));root.add(boxes);boxes.frustumCulled=false;
  const previousGeometry=geometry.clone();previousGeometry.setDrawRange(0,0);const previous=new THREE.LineSegments(previousGeometry,new THREE.LineBasicMaterial({color:0x90ccbb,transparent:true,opacity:.65,depthWrite:false}));previous.frustumCulled=false;root.add(previous);
  const marksGeometry=new THREE.BufferGeometry();marksGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(MAX_CANDIDATES*5*3),3).setUsage(THREE.DynamicDrawUsage));marksGeometry.setDrawRange(0,0);
  const dotCanvas=document.createElement('canvas');dotCanvas.width=dotCanvas.height=64;const dotContext=dotCanvas.getContext('2d');
  for(const [radius,color] of [[30,'#13231d'],[22,'#ffdf9d'],[8,'#13231d']]){dotContext.beginPath();dotContext.fillStyle=color;dotContext.arc(32,32,radius,0,Math.PI*2);dotContext.fill();}
  const dot=new THREE.CanvasTexture(dotCanvas);dot.colorSpace=THREE.SRGBColorSpace;
  // Annotations keep a readable pixel diameter even when the whole bench is
  // fitted to a narrow viewport. Positions still use the model's image pixels.
  const marks=new THREE.Points(marksGeometry,new THREE.PointsMaterial({map:dot,size:8,sizeAttenuation:false,transparent:true,opacity:1,toneMapped:false,depthWrite:false}));root.add(marks);marks.frustumCulled=false;
  const previousMarks=new THREE.Points(marksGeometry.clone(),marks.material.clone());root.add(previousMarks);previousMarks.frustumCulled=false;
  const carriage=new THREE.Group();root.add(carriage);
  for(const x of [-1.26,1.04]){mesh(new THREE.CylinderGeometry(.03,.03,1.88,12),metal,carriage,[x,.36,0]);mesh(casing(.12,.08,.18,.025),dark,carriage,[x,-.56,0]);}
  const top=mesh(new THREE.CylinderGeometry(.02,.02,2.3,12),metal,carriage,[-.11,1.32,0]);top.rotation.z=Math.PI/2;
  batchStatic(carriage);
  let imageRevision=-1,serial=-1,stamp='',pyramid=[],report=null,byR=new Map(),byO=new Map(),turnOrigin=0,previousCount=0,photoWidth=PHOTO_SIZE,photoHeight=PHOTO_SIZE;
  let zoom=1,origin=[0,0],resetZoom=1,resetOrigin=[0,0],focus={zoom:1,origin:[0,0]};
  const point=(x,y,z=.217)=>[CENTER.x+((x/vision.state.image.width-origin[0])*zoom-.5)*photoWidth,CENTER.y+(.5-(y/vision.state.image.height-origin[1])*zoom)*photoHeight,z];
  function writeBox(index,box,scale,color){
    const a=point(box[0],box[1]),b=point(box[2],box[3]),cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2;
    const left=cx+(a[0]-cx)*scale,right=cx+(b[0]-cx)*scale,top=cy+(a[1]-cy)*scale,bottom=cy+(b[1]-cy)*scale;
    const corners=[left,top,right,top,right,top,right,bottom,right,bottom,left,bottom,left,bottom,left,top];
    for(let i=0;i<8;i++){const offset=(index*8+i)*3;positions.set([corners[i*2],corners[i*2+1],.217],offset);colors.set(color,offset);}
  }
  const model={root,photo,boxes,marks,levels,contact,wheel,carriage,atlas,actorHome:new THREE.Vector3(1.23,.84,.74),
    diagnostics:()=>({serial,visibleBoxes:geometry.drawRange.count/8,landmarks:marksGeometry.drawRange.count,pyramid:pyramid.length,wheel:wheel.rotation.z,zoom,origin:[...origin]}),
    update(now,reduced){
      vision.advance(now,reduced);const state=vision.state;
      if(state.imageRevision!==imageRevision){
        imageRevision=state.imageRevision;report=null;geometry.setDrawRange(0,0);previousGeometry.setDrawRange(0,0);marksGeometry.setDrawRange(0,0);previousMarks.geometry.setDrawRange(0,0);previousCount=0;zoom=resetZoom=1;origin=resetOrigin=[0,0];photo.repeat.set(1,1);photo.offset.set(0,0);
        if(state.image){
          ctx.drawImage(state.image,0,0,512,512);photo.needsUpdate=true;photoWidth=PHOTO_SIZE*state.image.width/Math.max(state.image.width,state.image.height);photoHeight=PHOTO_SIZE*state.image.height/Math.max(state.image.width,state.image.height);picture.scale.set(photoWidth,photoHeight,1);
          pyramid=imageScales(state.image.width,state.image.height);atlasContext.clearRect(0,0,1024,512);
          pyramid.forEach((level,i)=>{const x=i%4*256,y=Math.floor(i/4)*512/3;atlasContext.fillStyle='#dfce9d';atlasContext.font='27px monospace';atlasContext.textAlign='center';atlasContext.fillText(`${level.width} × ${level.height}`,x+128,y+90);});atlas.needsUpdate=true;
        }
      }
      if(state.serial!==serial&&state.report){
        serial=state.serial;report=state.report;turnOrigin=wheel.rotation.z;previousCount=geometry.drawRange.count;resetZoom=zoom;resetOrigin=[...origin];
        previousGeometry.attributes.position.array.set(positions);previousGeometry.attributes.position.needsUpdate=true;previousGeometry.setDrawRange(0,previousCount);
        previousMarks.geometry.attributes.position.array.set(marksGeometry.attributes.position.array);previousMarks.geometry.attributes.position.needsUpdate=true;previousMarks.geometry.setDrawRange(0,marksGeometry.drawRange.count);
        byR=new Map(report.stages[1].boxes.map(box=>[box.id,box]));byO=new Map(report.stages[2].boxes.map(box=>[box.id,box]));
        const final=report.stages[2].boxes;focus={zoom:1,origin:[0,0]};
        if(final.length){
          const left=Math.min(...final.map(row=>row.box[0]))/report.width,top=Math.min(...final.map(row=>row.box[1]))/report.height,right=Math.max(...final.map(row=>row.box[2]))/report.width,bottom=Math.max(...final.map(row=>row.box[3]))/report.height;
          focus.zoom=THREE.MathUtils.clamp(.72/Math.max(right-left,bottom-top),1,3.4);const extent=1/focus.zoom;
          focus.origin=[THREE.MathUtils.clamp((left+right-extent)/2,0,1-extent),THREE.MathUtils.clamp((top+bottom-extent)/2,0,1-extent)];
        }
      }
      const p=state.progress,fan=report&&!reduced?ease(p)*(1-ease(p-2)):0;
      if(report){const reset=1-ease(p),close=ease(p-7);zoom=1+(resetZoom-1)*reset+(focus.zoom-1)*close;origin=origin.map((_,i)=>resetOrigin[i]*reset+focus.origin[i]*close);photo.repeat.set(1/zoom,1/zoom);photo.offset.set(origin[0],1-origin[1]-1/zoom);}
      levels.forEach((level,i)=>{
        const scale=pyramid[i];level.root.visible=!!scale&&fan>.001;if(!level.root.visible)return;
        const ratio=scale.scale/(pyramid[0].scale||1),size=THREE.MathUtils.lerp(1,.57*ratio,fan);
        level.root.position.copy(CENTER).lerp(new THREE.Vector3(-1.36+i*.075,.82-i*.08,.64+i*.05),fan);level.root.rotation.y=-fan*.22;
        level.root.scale.set(photoWidth*size,photoHeight*size,1);level.sheet.material.opacity=fan*.88;level.outline.material.opacity=fan;level.label.visible=fan>.8&&ratio>.2;
      });
      if(report){
        const r=ease(p-4),o=ease(p-6),grow=ease(p-2);let count=0;
        for(const candidate of report.stages[0].boxes){
          let box=candidate.box,scale=grow,color=[.36,.72,.6];const refined=byR.get(candidate.id),final=byO.get(candidate.id);
          if(refined){box=box.map((v,i)=>THREE.MathUtils.lerp(v,refined.box[i],r));if(final)box=box.map((v,i)=>THREE.MathUtils.lerp(v,final.box[i],o));else scale*=1-o;}
          else scale*=1-r;
          if(final&&o>.01)color=[.73,.85,.58];if(scale<.001)continue;writeBox(count++,box,scale,color);
        }
        geometry.setDrawRange(0,count*8);geometry.attributes.position.needsUpdate=geometry.attributes.color.needsUpdate=true;
        const reveal=ease(p-7),markPositions=marksGeometry.attributes.position;let markCount=0;
        if(reveal)for(const result of report.stages[2].boxes)for(let i=0;i<10;i+=2){markPositions.setXYZ(markCount++,...point(result.marks[i],result.marks[i+1],.229));}
        marksGeometry.setDrawRange(0,markCount);markPositions.needsUpdate=true;marks.material.opacity=reveal;marks.material.size=8*reveal;
        previous.visible=previousCount>0&&p<1;previous.scale.setScalar(1-ease(p));previous.position.copy(CENTER).multiplyScalar(ease(p));
        previousMarks.visible=p<1;previousMarks.scale.copy(previous.scale);previousMarks.position.copy(previous.position);previousMarks.material.opacity=1-ease(p);
        wheel.rotation.z=turnOrigin+p/8*Math.PI*2;
      }
      carriage.position.z=report?THREE.MathUtils.lerp(.83,.25,ease((p-2)/6)):.83;
      const next=[state.imageRevision,state.serial,state.phase,state.stage].join(':');
      if(next!==stamp){stamp=next;const counts=report?.stages.map(stage=>stage.boxes.length)||[];
        const title=state.phase==='playing'?['IMAGE PYRAMID','P-NET / PROPOSALS','R-NET / REFINEMENT','O-NET / LANDMARKS'][state.stage]:state.phase==='done'?'DETECTION COMPLETE':state.busy?'COMPUTING…':state.image?'READY TO OBSERVE':'INSERT A PHOTOGRAPH';
        const numbers=counts.map((value,i)=>state.phase==='done'||i<state.stage?value:'…');
        screen.draw('MTCNN / OPTICAL BENCH',title,report?state.stage?`${numbers.join(' → ')} / FIVE LANDMARKS`:`${pyramid.length} SCALES / IMAGE PYRAMID`:'LOCAL IMAGE / REAL INFERENCE');
      }
    }
  };
  model.update(0,true);return model;
}
