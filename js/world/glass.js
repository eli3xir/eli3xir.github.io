import * as THREE from 'three';
import {casing} from './hardware.js';
import {brass,ink,mesh} from './materials.js';
import {createGlassState} from './glass-state.js';
import {createGlassPaper} from './glass-paper.js';
import {glassLensMaterial} from './glass-lens.js';
export function createGlass(){
 const root=new THREE.Group(),sheet=new THREE.Group(),state=createGlassState(),paper=createGlassPaper();root.add(sheet);sheet.rotation.set(-.09,-.10,-.045);
 mesh(casing(3.52,2.60,.13,.09),ink(),sheet,[0,0,-.13]);const page=mesh(new THREE.PlaneGeometry(3.3,2.3375),new THREE.MeshBasicMaterial({map:paper.texture}),sheet,[0,0,-.045]);
 for(const x of [-1.48,1.48]){const material=brass();material.roughness=.52;material.metalness=.72;mesh(casing(.26,.12,.08,.035),material,sheet,[x,1.16,.015]);const screw=mesh(new THREE.CylinderGeometry(.025,.025,.025,12),material,sheet,[x,1.16,.067]);screw.rotation.x=Math.PI/2;}
 const lenses=[];for(const radius of [.61,.34]){const group=new THREE.Group();sheet.add(group);const optics=glassLensMaterial(paper.texture,sheet),material=optics.material;
  const body=mesh(new THREE.SphereGeometry(radius,80,40),material,group);body.scale.z=.26;body.castShadow=false;body.receiveShadow=false;body.onBeforeRender=(renderer,scene,camera)=>optics.prepare(body,renderer,scene,camera);
  const rim=mesh(new THREE.TorusGeometry(radius+.016,.017,12,96),brass(),group);rim.castShadow=false;mesh(new THREE.TorusGeometry(radius+.035,.008,8,96),ink(),group,[0,0,-.015]);lenses.push({group,body,material});}
 const handle=mesh(new THREE.CylinderGeometry(.036,.041,.63,16),brass(),lenses[0].group,[-.61,-.60,.01]);handle.rotation.z=-.79;const grip=new THREE.Object3D();grip.position.set(-.80,-.79,.01);lenses[0].group.add(grip);const actorAnchor=new THREE.Object3D();actorAnchor.position.set(-1,-.87,.03);lenses[0].group.add(actorAnchor);
 const motion={grounded:true,reach:1,grip:new THREE.Vector3()},point=new THREE.Vector3(),origin=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();let active=true,last=null,key='',disposed=false;
 const model={root,sheet,page,paper,lenses,state,grip,actorAnchor,actorMotion:motion,actorPosition:[-1,-.87,.46],actorScale:.3,displayScale:.82,layoutBounds:new THREE.Box3(new THREE.Vector3(-2.1,-1.9,-.3),new THREE.Vector3(2.1,1.5,.85)),
  move:(x,y)=>state.move(x,y),focus:value=>state.focus(value),freeze:value=>state.freeze(value),press(kind,options){const done=state.press(kind,options);if(done)model.onComplete?.();model.onState?.(state.state);},snapshot:()=>state.snapshot(),restore(value){last=null;return state.restore(value);},setActive(value){active=Boolean(value);last=null;},
  pick(ray){root.updateMatrixWorld(true);const hit=ray.intersectObject(page)[0];if(!hit)return null;const uv=hit.uv;if(uv.y<.245&&uv.y>.15){const column=Math.floor((uv.x-.06)/.298);if(column>=0&&column<3)return{kind:['stamp','ink','count'][column]};}return{x:(uv.x-.5)*3.3/.95,y:(uv.y-.5)*2.3375/.58};},
  update(t,beat,scroll,now=0,reduced=false){if(disposed)return;const dt=last===null?0:Math.max(0,now-last);last=now;if(active&&state.update(dt,reduced))model.onComplete?.();const s=state.state;paper.draw(s);lenses[0].group.position.set(s.x*.95,s.y*.58,.28+s.power*.09);lenses[1].group.position.set(.92-s.x*.35,.63-s.y*.25,.23);for(const lens of lenses)lens.material.uniforms.power.value=s.power;
   const elastic=reduced||s.frozen?0:THREE.MathUtils.clamp((Math.abs(s.vx)-Math.abs(s.vy))*.018,-.035,.035);lenses[0].group.scale.set(1+elastic,1/(1+elastic),1);lenses[1].group.scale.set(1-elastic*.5,1/(1-elastic*.5),1);
   actorAnchor.updateWorldMatrix(true,false);grip.getWorldPosition(point);actorAnchor.getWorldPosition(origin);actorAnchor.getWorldQuaternion(rotation);root.getWorldScale(scale);motion.grip.copy(point).sub(origin).applyQuaternion(rotation.invert()).divideScalar(model.actorScale*scale.x/model.displayScale);const next=[s.stampCount,s.ink,s.count,s.frozen,Math.round(s.targetPower*100)].join(':');if(next!==key){key=next;model.onState?.(s);}
  },diagnostics:()=>({...state.state,active}),dispose(){disposed=true;model.onState=model.onComplete=model.onPick=null;}};model.update(0,{},0,0,true);return model;
}
