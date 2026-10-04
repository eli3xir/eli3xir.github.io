import * as THREE from 'three';
import {mesh,brass,ink} from './materials.js';
import {casing} from './hardware.js';
import {createSailboat} from './sailboat.js';
import {createOceanWater} from './ocean-water.js';
import {floatBoat} from './ocean-waves.js';

export function createOcean(){
  const root=new THREE.Group(),water=createOceanWater(3.28,2.20,{bounded:true}),boat=createSailboat();
  const metal=brass(),base=ink();mesh(casing(3.40,.16,2.32,.055),base,root,[0,-.92,0]);
  for(const sign of [-1,1]){
    mesh(new THREE.BoxGeometry(.04,.24,2.28),base,root,[sign*1.66,-.73,0]);mesh(new THREE.BoxGeometry(.025,.018,2.28),metal,root,[sign*1.66,-.60,0]);
    mesh(new THREE.BoxGeometry(3.36,.24,.04),base,root,[0,-.73,sign*1.12]);mesh(new THREE.BoxGeometry(3.36,.018,.025),metal,root,[0,-.60,sign*1.12]);
  }
  root.add(water.water,boat.root);water.water.position.y=-.61;
  const actorAnchor=new THREE.Object3D();actorAnchor.position.set(.145,.33,-.60);boat.root.add(actorAnchor);
  let change=null,last=null,time=0,strength=.8,disposed=false;
  const model={root,actorAnchor,actorScale:.58,actorPosition:[0,-.3,0],actorMotion:{grounded:true},wind:.8,
    layoutBounds:new THREE.Box3(new THREE.Vector3(-1.74,-1.04,-1.22),new THREE.Vector3(1.74,1.34,1.22)),
    hitTest(ray){root.updateMatrixWorld(true);return ray.intersectObjects([boat.root.getObjectByName('sailboat-hull'),boat.root.getObjectByName('sailboat-deck')],false).length>0;},
    setWind(value,{now,delay=0,duration=1,reduced=false}={}){
      if(disposed||!Number.isFinite(value))return;model.wind=THREE.MathUtils.clamp(value,0,1.6);
      change={from:strength,to:model.wind,start:now+delay,duration};if(reduced){strength=model.wind;change=null;}
    },
    update(t,beat,scroll,now=0,reduced=false){
      if(disposed)return;const dt=last===null?0:Math.min(.06,Math.max(0,now-last));last=now;
      if(change){const p=reduced?1:THREE.MathUtils.clamp((now-change.start)/change.duration,0,1);strength=THREE.MathUtils.lerp(change.from,change.to,p*p*(3-2*p));if(p===1)change=null;}
      if(!reduced)time+=dt;
      water.update(reduced?0:time,strength);boat.update(reduced?0:time,reduced?0:strength);
      model.samples=floatBoat(boat.root,0,0,-.72,reduced?0:time,strength,1,-.61);
    },
    diagnostics(){return{time,strength,target:model.wind,position:boat.root.position.toArray(),rotation:boat.root.rotation.toArray(),samples:model.samples};},
    dispose(){disposed=true;change=null;model.onPick=null;boat.dispose();}
  };model.update(0,{},0,0,true);return model;
}
