import * as THREE from 'three';
import {brass,ink,mesh,ring} from './materials.js';
import {createPotionFluid} from './potion-fluid.js';

export function createPotion(){
  const root=new THREE.Group();
  let flight=null,queued=null,disposed=false;
  const shape=new THREE.Path();
  shape.moveTo(0,-.85);shape.lineTo(.35,-.85);
  shape.bezierCurveTo(.57,-.85,.64,-.63,.64,-.32);
  shape.bezierCurveTo(.64,-.10,.60,.03,.55,.13);
  shape.bezierCurveTo(.48,.30,.17,.40,.17,.70);
  shape.lineTo(.17,1.04);shape.quadraticCurveTo(.17,1.08,.21,1.08);
  const vessel=mesh(new THREE.LatheGeometry(shape.getPoints(10),96),new THREE.MeshPhysicalMaterial({
    color:0xffffff,roughness:.075,transmission:1,thickness:.045,ior:1.47,depthWrite:false,
    attenuationColor:new THREE.Color(0xd4e9d8),attenuationDistance:3
  }),root);
  vessel.name='potion-vessel';vessel.castShadow=false;vessel.receiveShadow=false;
  const fluid=createPotionFluid(root);
  // An open collar leaves a real aperture for the escaping reaction.
  mesh(new THREE.CylinderGeometry(.19,.18,.055,64,1,true),brass(),root,[0,1.085,0]);
  ring(root,.191,.009,1.113);ring(root,.182,.007,1.058);
  const cap=mesh(new THREE.CylinderGeometry(.22,.2,.15,64),ink(),root,[0,1.27,0]);
  cap.name='potion-cap';ring(cap,.204,.006,-.062);
  ring(root,.629,.013,-.48);
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3;
    const leg=mesh(new THREE.CylinderGeometry(.025,.04,.55,12),brass(),root,[Math.cos(a)*.59,-.9,Math.sin(a)*.59]);
    leg.rotation.z=Math.cos(a)*-.2;leg.rotation.x=Math.sin(a)*.2;
  }
  mesh(new THREE.CylinderGeometry(.87,.9048,.14,96),ink(),root,[0,-1.16,0]);ring(root,.8787,.012,-1.09);
  function begin(options){flight={start:options.now+options.delay,duration:options.duration};options.onStart?.(options.delay);}
  return{root,actorPosition:[.72,1.33,.1],
    hitTest(ray){root.updateMatrixWorld(true);return ray.intersectObjects([vessel,cap],false).length>0;},
    next(options){if(disposed)return false;if(flight){queued=options;return false;}begin(options);return true;},
    update(t,beat,scroll,now=0,reduced=false){
      if(disposed)return;
      const p=flight?(reduced?1:THREE.MathUtils.clamp((now-flight.start)/flight.duration,0,1)):0;
      const reaction=Math.sin(p*Math.PI)**2;
      fluid.update(t,p,reaction,Boolean(flight)&&!reduced&&p>0&&p<1);
      cap.position.y=1.27+Math.sin(t*.7)*.05+reaction*.29;
      cap.rotation.z=Math.sin(p*Math.PI*6)*reaction*.13;
      if(flight&&p===1){flight=null;if(queued&&!reduced){const next=queued;queued=null;begin({...next,now,delay:0});}else queued=null;}
    },
    dispose(){disposed=true;flight=queued=null;}
  };
}
