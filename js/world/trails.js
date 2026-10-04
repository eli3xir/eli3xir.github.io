import * as THREE from 'three';
import {createExposure} from './star-exposure.js';
import {createStarField} from './star-field.js';
import {createObservatory} from './observatory.js';
export function createTrails(){
 const device=createObservatory(),field=createStarField(),exposure=createExposure(),root=device.root;device.sky.add(field.root);let active=true,last=null,lastStatus='',disposed=false;
 const model={root,device,field,exposure,displayScale:.82,actorAnchor:device.actorAnchor,actorScale:.45,actorPosition:[-1.13,-1.51,.91],actorMotion:{grounded:true},layoutBounds:new THREE.Box3(new THREE.Vector3(-1.8,-1.82,-.95),new THREE.Vector3(1.8,2.05,1.8)),
  select(hours){exposure.select(hours);model.onState?.(exposure.state);},launch(options){const done=exposure.launch(options);if(done){model.onState?.(exposure.state);if(options?.reduced)model.onComplete?.();}return done;},
  reset(){exposure.reset();model.onState?.(exposure.state);},pause(value){exposure.pause(value);model.onState?.(exposure.state);},aim(x,y){exposure.aim(x,y);},setActive(value){active=Boolean(value);last=null;},
  snapshot(){return exposure.snapshot();},restore(state){last=null;const restored=exposure.restore(state);if(restored)model.onState?.(exposure.state);return restored;},
  pick(ray){root.updateMatrixWorld(true);if(ray.intersectObject(device.cameraRig,true).length||ray.intersectObject(device.release).length)return{kind:'shutter'};const point=model.hitSky(ray);return point?{kind:'sky',point}:null;},
  hitSky(ray){root.updateMatrixWorld(true);const hit=ray.intersectObject(device.surface)[0];return hit?device.sky.worldToLocal(hit.point.clone()).toArray():null;},
  update(t,beat,scroll,now=0,reduced=false){if(disposed)return;const dt=last===null?0:Math.max(0,now-last);last=now;if(active&&exposure.update(dt,reduced))model.onComplete?.();const s=exposure.state;field.update(s);device.shutter.position.y=s.mode==='exposing'?.296:.31;device.led.material.color.setHex(s.mode==='exposing'?0xdfae65:0x819c76);device.lever.rotation.y=-s.progress*Math.PI*.7;const status=s.mode+':'+Math.floor(s.progress*100);if(status!==lastStatus){lastStatus=status;model.onState?.(s);}},
  diagnostics(){return{...exposure.state,active,count:field.stars.length};},dispose(){disposed=true;model.onState=model.onPick=model.onComplete=null;}
 };field.update(exposure.state);return model;
}
