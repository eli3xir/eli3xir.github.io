import * as THREE from 'three';
import {brass,ink,mesh,ring} from './materials.js';
import {batchStatic} from './batch.js';
import {casing} from './hardware.js';
import {recordLabel,createMeters} from './phonograph-parts.js';

export function createPhonograph(playback){
  const root=new THREE.Group(),deck=new THREE.Group();root.add(deck);deck.rotation.set(.3,-.3,-.04);
  const metal=brass(),black=ink();
  mesh(casing(2.6,.4,1.8),new THREE.MeshPhysicalMaterial({color:0x21372d,metalness:.35,roughness:.3,clearcoat:.6}),deck,[0,-.46,0]);
  mesh(casing(2.63,.025,1.83),metal,deck,[0,-.247,0]);
  const record=mesh(new THREE.CylinderGeometry(.78,.78,.034,112),black,deck,[-.3,-.215,0]);record.userData.action='play';
  const grooves=new THREE.MeshStandardMaterial({color:0x394840,metalness:.6,roughness:.34});
  for(let i=0;i<28;i++)ring(record,.2+i*.02,.002,.019,grooves);
  const label=mesh(new THREE.CircleGeometry(.185,64),new THREE.MeshStandardMaterial({map:recordLabel(),roughness:.6}),record,[0,.021,0]);label.rotation.x=-Math.PI/2;
  mesh(new THREE.CylinderGeometry(.02,.02,.09,16),metal,record,[0,.055,0]);
  const arm=new THREE.Group();arm.position.set(.87,-.071,.55);deck.add(arm);
  const path=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-.12,.13,0),new THREE.Vector3(-.82,.13,0),new THREE.Vector3(-1.1,-.06,0)]);
  mesh(new THREE.TubeGeometry(path,48,.022,10,false),metal,arm);
  mesh(new THREE.BoxGeometry(.13,.035,.065),black,arm,[-1.1,-.076,0]);
  mesh(new THREE.CylinderGeometry(.006,.006,.037,8),metal,arm,[-1.1,-.109,0]);
  mesh(new THREE.CylinderGeometry(.074,.09,.16,24),metal,deck,[.87,-.15,.55]);
  mesh(new THREE.CylinderGeometry(.075,.09,.075,24),metal,deck,[.93,-.2,-.17]);
  const horn=new THREE.Group();deck.add(horn);horn.position.set(.93,-.17,-.17);horn.rotation.z=.24;
  const profile=[[.045,0],[.05,.3],[.075,.5],[.15,.7],[.28,.92],[.5,1.14],[.72,1.35],[.78,1.39]];
  mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),96),new THREE.MeshStandardMaterial({color:0xb88245,metalness:.9,roughness:.3,side:THREE.DoubleSide}),horn);
  ring(horn,.78,.017,1.39,metal);
  for(const x of [-1.03,1.03])for(const z of [-.65,.65])mesh(new THREE.CylinderGeometry(.06,.08,.09,16),black,deck,[x,-.695,z]);
  const meters=createMeters(deck,metal);
  const lamp=mesh(new THREE.SphereGeometry(.035,16,12),new THREE.MeshStandardMaterial({color:0x45654b,emissive:0x9bda80,emissiveIntensity:0}),deck,[1.08,-.225,.63]);
  const excluded=new Set([record,arm,lamp]);for(const group of [record,arm,...meters.map(m=>m.root)])group.traverse(object=>excluded.add(object));
  batchStatic(deck,excluded);batchStatic(record);batchStatic(arm);
  let lastUI=null,lastAudio=null,lastCycle=0,angle=0,offset=0,wasActive=false,lower=0,returnUntil=0,disposed=false;
  const idle={active:false,time:0,cycle:0,levels:[0,0,0,0]};
  const model={root,displayScale:.87,actorPosition:[-.85,.82,.2],onPick:null,
    pick(ray){root.updateMatrixWorld(true);const hit=ray.intersectObjects([record,...meters.map(m=>m.root)],true)[0];if(!hit)return null;
      let object=hit.object;while(object){if(object.userData.action)return object.userData.action;object=object.parent;}return null;},
    update(t,beat,scroll,now,reduced){
      if(disposed)return;const state=playback?.()||idle,dt=lastUI===null?0:Math.max(0,Math.min(.06,now-lastUI));lastUI=now;
      const active=state.active&&!reduced;
      if(active&&!wasActive)offset=angle+state.time*3.49;
      if(active)angle=offset-state.time*3.49;
      record.rotation.y=angle;wasActive=active;lastAudio=state.time;
      if(state.active&&lastCycle>.9&&state.cycle<.1)returnUntil=now+.65;lastCycle=state.cycle;
      const target=state.active&&now>=returnUntil?1:0;
      lower=reduced?target:THREE.MathUtils.damp(lower,target,11,dt);arm.rotation.z=-.18*(1-lower);
      const radius=.69-state.cycle*.43,distance=Math.hypot(1.17,.55);
      const yaw=state.active?Math.atan2(-.55,1.17)+Math.acos(THREE.MathUtils.clamp((distance*distance+1.21-radius*radius)/(2*distance*1.1),-1,1)):.46;
      arm.rotation.y=reduced?yaw:THREE.MathUtils.damp(arm.rotation.y,yaw,8,dt);
      meters.forEach((meter,i)=>{meter.level=reduced?0:THREE.MathUtils.damp(meter.level,state.levels[i]||0,13,dt);meter.pivot.rotation.z=.83-meter.level*1.66;});
      lamp.material.emissiveIntensity=state.active?1.2:0;
    },
    diagnostics(){return{recordAngle:angle,armLift:1-lower,armYaw:arm.rotation.y,levels:meters.map(m=>m.level),audioTime:lastAudio};},
    dispose(){disposed=true;model.onPick=null;}
  };return model;
}
