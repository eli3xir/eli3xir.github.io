import * as THREE from 'three';
import {createGalaxyField} from './galaxy-field.js';
import {createGalaxyState} from './galaxy-state.js';
import {createGalaxySelector} from './galaxy-selector.js';
export function createGalaxy(){
 const root=new THREE.Group(),view=new THREE.Group(),field=createGalaxyField(),state=createGalaxyState(),selector=createGalaxySelector();root.add(view,selector.root);view.add(field.root);let active=true,last=null,disposed=false,status='';
 const motion={grounded:true,reach:1,grip:new THREE.Vector3()},target=new THREE.Vector3(),inverse=new THREE.Matrix4();
 const model={root,field,view,state,selector,background:[.008,.014,.020],floor:false,actorAnchor:selector.actorAnchor,actorMotion:motion,actorPosition:[1.07,-1.455,.37],actorScale:.35,displayScale:.63,layoutBounds:new THREE.Box3(new THREE.Vector3(-3.2,-3.2,-3.2),new THREE.Vector3(3.2,3.2,3.2)),
  selectBand(value,options){const changed=state.selectBand(value,options);if(changed)model.onState?.(state.state);return changed;},setBand(value){return model.selectBand(value);},setView(tilt){state.orbit(0,tilt);},
  orbit(yaw,tilt){state.orbit(yaw,tilt);},zoom(value){state.zoom(value);},preset(name){state.view(name);},push(options){state.push(options);model.onState?.(state.state);},pause(value){state.pause(value);model.onState?.(state.state);},
  setActive(value){active=Boolean(value);last=null;},snapshot(){return state.snapshot();},restore(value){last=null;const restored=state.restore(value);if(restored)model.onState?.(state.state);return restored;},
  pick(ray){root.updateMatrixWorld(true);if(ray.intersectObject(selector.wheel,true).length)return{kind:'band'};const local=ray.ray.clone().applyMatrix4(inverse.copy(view.matrixWorld).invert());return local.intersectsSphere(new THREE.Sphere(new THREE.Vector3(),2.1))?{kind:'spin'}:null;},
  update(t,beat,scroll,now=0,reduced=false){if(disposed)return;const dt=last===null?0:Math.max(0,now-last);last=now;if(active&&state.update(dt,reduced))model.onComplete?.();const s=state.state;field.setBand(s.band);field.root.rotation.y=s.angle;view.rotation.set(s.tilt,s.yaw,-.15,'YXZ');view.scale.setScalar(s.zoom);selector.wheel.rotation.z=-s.band*Math.PI;
   selector.root.updateWorldMatrix(true,true);selector.handle.getWorldPosition(target);selector.actorAnchor.worldToLocal(target);motion.grip.copy(target).divideScalar(model.actorScale/model.displayScale);
   const next=[s.targetBand,s.changing,Math.floor(s.progress*100),s.paused,Math.round(s.zoom*100),Math.round(s.tilt*100)].join(':');if(next!==status){status=next;model.onState?.(s);}
  },diagnostics(){return{...state.state,active,count:field.data.count};},dispose(){disposed=true;field.dispose();model.onState=model.onPick=model.onComplete=null;}};
 model.update(0,{},0,0,true);
 return model;
}
