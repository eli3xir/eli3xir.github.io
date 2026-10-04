import * as THREE from 'three';
import {mesh,brass,ink} from './materials.js';
import {createLander} from './lunar-lander.js';
import {createLunarTerrain} from './lunar-terrain.js';
import {createLunarEffects} from './lunar-effects.js';
import {createFlight} from './lunar-flight.js';
export function createMoon(){
 const root=new THREE.Group(),display=new THREE.Group(),terrain=createLunarTerrain({miniature:true}),lander=createLander(),flight=createFlight();
 display.scale.setScalar(.24);display.position.y=-1.0;display.rotation.y=-.42;root.add(display);display.add(terrain.root,lander.root);
 mesh(new THREE.CylinderGeometry(6.72,6.72,.24,128),ink(),display,[0,-.96,0]);mesh(new THREE.TorusGeometry(6.72,.035,8,128),brass(),display,[0,-.83,0]).rotation.x=Math.PI/2;
 const effects=createLunarEffects(display,lander.root);let last=null,active=true,disposed=false,lastMode='ready';
 const model={root,lander,terrain,flight,effects,actorAnchor:lander.anchor,actorScale:.3,actorMotion:{grounded:true},actorPosition:[0,0,0],
  layoutBounds:new THREE.Box3(new THREE.Vector3(-1.68,-1.3,-1.68),new THREE.Vector3(1.68,1.2,1.68)),
  hitTest(ray){root.updateMatrixWorld(true);return ray.intersectObjects(lander.root.children,true).length>0;},
  setActive(value){active=value;last=null;},snapshot:()=>flight.snapshot(),restore(value){const accepted=flight.restore(value);if(accepted){lastMode=flight.sample().mode;model.onState?.(flight.sample());}return accepted;},
  launch({delay=0,reduced=false}={}){if(disposed||!active)return false;if(flight.sample().mode==='landed')flight.reset();else if(!flight.start(delay))return false;if(reduced&&flight.sample().mode==='descending')flight.finish();model.onState?.(flight.sample());return true;},
  update(t,beat,scroll,now=0,reduced=false){if(disposed)return;const dt=last===null?0:Math.max(0,now-last);last=now;
   if(active){if(reduced&&flight.sample().mode==='descending')flight.finish();else flight.step(dt);}
   const state=flight.sample();lander.root.position.y=state.altitude;effects.update(state,document.querySelector('#world-stage canvas')?.height||innerHeight*devicePixelRatio,reduced);
   if(state.mode!==lastMode){if(state.mode==='landed'&&active)model.onLand?.();lastMode=state.mode;model.onState?.(state);}
  },diagnostics(){return{...flight.sample(),active,...effects.diagnostics()};},dispose(){disposed=true;model.onLand=model.onState=model.onPick=null;terrain.dispose();}
 };model.update(0,{},0,0,true);return model;
}
