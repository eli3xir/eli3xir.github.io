import * as THREE from 'three';
import {createLeisureProps} from './leisure-props.js';

const ease=p=>p*p*(3-2*p),clamp=THREE.MathUtils.clamp;
const HOME=new THREE.Vector3(0,-.425,.76),UP=new THREE.Vector3(0,1,0);
const ENTER=1/8,ACTIVE=6/8,LEAVE=7/8;
export function createLeisure(){
  const root=new THREE.Group(),stage=new THREE.Group();root.add(stage);stage.rotation.x=.40;stage.position.y=.65;
  const props=createLeisureProps(stage),actorAnchor=new THREE.Object3D();stage.add(actorAnchor);actorAnchor.position.copy(HOME);
  actorAnchor.name='leisure-actor-anchor';
  const motion={grounded:true,run:0,swim:0,reach:0,phase:0,grip:new THREE.Vector3()},target=new THREE.Vector3(),targetQuaternion=new THREE.Quaternion(),inverse=new THREE.Quaternion();
  stage.updateMatrix();const layoutBounds=new THREE.Box3(new THREE.Vector3(-1.84,-1,-1.1),new THREE.Vector3(1.84,.5,1.1)).applyMatrix4(stage.matrix);
  let flight=null,disposed=false,pawnFlight=null,pawnSide=0;
  const model={root,layoutBounds,actorAnchor,actorMotion:motion,actorPosition:HOME.toArray(),actorScale:1.35,activity:null,progress:0,
    pick(ray){root.updateMatrixWorld(true);return ray.intersectObjects([props.track,props.water.water,props.board],false)[0]?.object.userData.activity??null;},
    select(id,{now,delay=0,duration,reduced=false}={}){
      if(disposed||!['run','swim','chess'].includes(id))return false;
      if(pawnFlight){pawnFlight={from:props.pawn.position.clone(),to:pawnFlight.to.clone(),start:now+delay,duration:duration/8};}
      flight={id,start:now+delay,duration,from:actorAnchor.position.clone(),rotation:actorAnchor.quaternion.clone(),motion:{run:motion.run,swim:motion.swim,reach:motion.reach,phase:motion.phase,grip:motion.grip.clone()}};
      if(id==='chess'){
        pawnSide=1-pawnSide;flight.pieceFrom=props.pawn.position.clone();flight.pieceTo=new THREE.Vector3(pawnSide?.115:-.115,-.628,pawnSide?-.115:.115);
        pawnFlight={from:flight.pieceFrom,to:flight.pieceTo,start:flight.start+duration*.25,duration:duration*.5};
      }
      model.activity=id;model.progress=0;model.onState?.(id,false);
      if(reduced){finish();model.onState?.(id,true);}return true;
    },
    update(t,beat,scroll,now=0,reduced=false){
      if(disposed)return;
      motion.run=motion.swim=motion.reach=0;motion.phase=0;
      if(flight){
        const f=flight,p=clamp((now-f.start)/f.duration,0,1),q=clamp((p-ENTER)/ACTIVE,0,1);model.progress=p;
        if(reduced){const id=f.id;finish();model.onState?.(id,true);}
        else{
          pose(f,q,target,targetQuaternion);
          if(p<ENTER){
            const a=ease(p/ENTER),lift=Math.max(0,Math.min(.4,-.05-Math.max(f.from.y,target.y)));
            actorAnchor.position.lerpVectors(f.from,target,a);actorAnchor.position.y+=Math.sin(a*Math.PI)*lift;actorAnchor.quaternion.slerpQuaternions(f.rotation,targetQuaternion,a);
            motion.run=f.motion.run*(1-a);motion.swim=f.motion.swim*(1-a);motion.reach=f.motion.reach*(1-a);motion.phase=f.motion.phase;
          }
          else if(p<LEAVE){
            actorAnchor.position.copy(target);actorAnchor.quaternion.copy(targetQuaternion);
            const weight=Math.sin(q*Math.PI)**.5;motion.phase=q*Math.PI*(f.id==='swim'?6:12);
            motion.run=f.id==='run'?weight:0;motion.swim=f.id==='swim'?weight:0;motion.reach=f.id==='chess'?ease(clamp(Math.min(q*6,(1-q)*6),0,1)):0;
          }else{
            const a=ease((p-LEAVE)/ENTER);actorAnchor.position.lerpVectors(target,HOME,a);actorAnchor.position.y+=Math.sin(a*Math.PI)*.3;actorAnchor.quaternion.slerpQuaternions(targetQuaternion,new THREE.Quaternion(),a);
          }
          if(p===1){const id=f.id;finish();model.onState?.(id,true);}
        }
      }
      if(pawnFlight){
        const p=clamp((now-pawnFlight.start)/pawnFlight.duration,0,1),a=ease(p);
        props.pawn.position.lerpVectors(pawnFlight.from,pawnFlight.to,a);props.pawn.position.y+=Math.sin(p*Math.PI)*.12;
        if(p===1)pawnFlight=null;
      }
      if(flight&&model.progress<ENTER&&flight.motion.reach>0)motion.grip.copy(flight.motion.grip);
      else motion.grip.copy(props.pawn.position).add(new THREE.Vector3(.63,.235,0)).sub(actorAnchor.position).applyQuaternion(inverse.copy(actorAnchor.quaternion).invert()).divideScalar(model.actorScale);
      props.water.update(now,actorAnchor.position.x+.52,actorAnchor.position.z,reduced?0:motion.swim);
    },
    dispose(){disposed=true;flight=pawnFlight=null;props.squares.dispose();model.onState=model.onPick=null;}
  };
  function finish(){flight=null;actorAnchor.position.copy(HOME);actorAnchor.quaternion.identity();motion.run=motion.swim=motion.reach=0;model.progress=1;if(pawnFlight){props.pawn.position.copy(pawnFlight.to);pawnFlight=null;}}
  function pose(f,q,position,rotation){
    const id=f.id;
    if(id==='run'){
      const a=q*Math.PI*2;position.set(Math.sin(a)*1.38,-.425+Math.sin(q*Math.PI*12)**2*.025,Math.cos(a)*.75);
      rotation.setFromAxisAngle(UP,Math.atan2(1.38*Math.cos(a),-.75*Math.sin(a)));
    }else if(id==='swim'){
      const x=-.77+(1-Math.cos(q*Math.PI*2))*.25;position.set(x,-.60,0);
      // Turn continuously at the far end of the lane.
      const yaw=Math.PI/2-Math.PI*ease(clamp((q-.44)/.12,0,1));rotation.setFromEuler(new THREE.Euler(-.22,yaw,Math.sin(q*Math.PI*12)*.07));
    }else{
      const p=clamp((q*ACTIVE-ENTER)/.5,0,1),a=ease(p);
      position.lerpVectors(f.pieceFrom,f.pieceTo,a).add(new THREE.Vector3(.95,.308+Math.sin(p*Math.PI)*.12,.15));
      rotation.setFromAxisAngle(UP,Math.PI);
    }
  }
  return model;
}
