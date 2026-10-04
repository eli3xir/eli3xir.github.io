import * as THREE from 'three';
import {mesh,brass,ink} from './materials.js';
import {casing} from './hardware.js';
import {createGlyphCloud} from './glyph-cloud.js';

export function createWordMachine({count=7200}={}){
 const root=new THREE.Group(),cloud=createGlyphCloud(count),dark=ink(),metal=brass();
 const base=mesh(casing(3.28,.24,.83,.09),dark,root,[0,-.77,0]);base.name='word-machine-base';
 const panel=mesh(casing(3.14,1.39,.10,.08),metal,root,[0,.09,-.19]);
 mesh(casing(3.04,1.29,.04,.05),new THREE.MeshStandardMaterial({color:0x091d1c,roughness:.42,metalness:.28}),root,[0,.09,-.12]);
 for(const x of [-1,1])mesh(new THREE.CylinderGeometry(.035,.035,.27,12),metal,root,[x*1.26,-.60,-.16]);
 const ticks=new THREE.InstancedMesh(new THREE.BoxGeometry(.006,.05,.009),metal,25),tick=new THREE.Object3D();ticks.castShadow=ticks.receiveShadow=true;root.add(ticks);
 for(let i=0;i<25;i++){tick.position.set((i-12)*.116,-.53,-.08);tick.scale.y=i%4===0?1:.44;tick.updateMatrix();ticks.setMatrixAt(i,tick.matrix);}ticks.instanceMatrix.needsUpdate=true;
 const key=mesh(casing(.29,.045,.25,.025),metal,root,[1.18,-.617,.17]);key.name='word-scatter-key';
 for(let i=0;i<3;i++)mesh(new THREE.SphereGeometry(.016,8,6),new THREE.MeshStandardMaterial({color:i?0x526c60:0xcadaae,emissive:i?0x000000:0x77965c,emissiveIntensity:.8}),root,[.77+i*.06,-.64,.27]);
 root.add(cloud.points);cloud.points.position.set(0,.10,0);
 const actorAnchor=new THREE.Object3D();actorAnchor.position.set(-1.15,-.505,.23);root.add(actorAnchor);
 let last=null,pending=null,disposed=false,press=0;
 const model={root,cloud,actorAnchor,actorScale:.62,actorPosition:[-1.15,-.505,.23],actorMotion:{grounded:true},
  layoutBounds:new THREE.Box3(new THREE.Vector3(-1.7,-.95,-.55),new THREE.Vector3(1.7,.87,.76)),
  hitTest(ray){root.updateMatrixWorld(true);return ray.intersectObjects([key,panel,base],false).length>0;},
  setText(text,{now=performance.now()/1000,delay=0,reduced=false}={}){if(disposed)return false;if(reduced){pending=null;return cloud.setText(text,{immediate:true});}pending={text,start:now+delay};return true;},
  scatter({now=performance.now()/1000,delay=0,reduced=false}={}){if(disposed||reduced)return;pending={...pending,scatter:true,start:now+delay};},
  update(t,beat,scroll,now=0,reduced=false){if(disposed)return;const dt=last===null?0:Math.min(.05,Math.max(0,now-last));last=now;
   if(pending&&(reduced||now>=pending.start)){if(pending.text)cloud.setText(pending.text,{immediate:reduced});if(pending.scatter&&!reduced){cloud.scatter();press=1;}pending=null;}
   cloud.step(dt,model.pointer,reduced);press*=Math.exp(-dt*10);key.position.y=-.617-(reduced?0:press*.023);
  },
  diagnostics(){return{...cloud.diagnostics(),pending:pending?{...pending}:null};},
  dispose(){disposed=true;pending=null;model.onPick=null;cloud.dispose();ticks.dispose();}
 };return model;
}
