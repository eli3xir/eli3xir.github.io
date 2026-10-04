import * as THREE from 'three';
import {mesh,brass,ink} from './materials.js';
import {BULLET} from './bullet-state.js';
import {casing} from './hardware.js';
function ellipse(parent,x,y,r,material,z=0){const points=Array.from({length:161},(_,i)=>new THREE.Vector3(Math.cos(i/160*Math.PI*2)*x,Math.sin(i/160*Math.PI*2)*y,z));return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),160,r,8,false),material,parent);}
export function createBulletStage(){
 const root=new THREE.Group(),stage=new THREE.Group();root.add(stage);stage.rotation.set(-.11,.075,-.045);
 const shape=new THREE.Shape();shape.absellipse(0,0,2.04,2.5,0,Math.PI*2,false,0);mesh(new THREE.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:96}),ink(),stage,[0,0,-.19]);
 const face=mesh(new THREE.ShapeGeometry(shape,96),new THREE.MeshStandardMaterial({color:0x172c34,metalness:.23,roughness:.58}),stage,[0,0,-.04]);face.castShadow=false;
 const metal=brass();metal.color.setHex(0x8b987f);metal.roughness=.5;metal.metalness=.58;ellipse(stage,2.04,2.5,.022,metal,-.015);ellipse(stage,1.96,2.41,.008,metal,-.011);const limit=ellipse(stage,BULLET.width,BULLET.height,.006,new THREE.MeshBasicMaterial({color:0x63878a,transparent:true,opacity:.38}),-.005);limit.castShadow=false;
 const ticks=new THREE.InstancedMesh(new THREE.BoxGeometry(.025,.012,.012),metal,72),dummy=new THREE.Object3D();for(let i=0;i<72;i++){const a=i*Math.PI/36;dummy.position.set(Math.cos(a)*1.92,Math.sin(a)*2.36,.001);dummy.rotation.z=a;dummy.scale.x=i%6===0?2.3:1;dummy.updateMatrix();ticks.setMatrixAt(i,dummy.matrix);}stage.add(ticks);ticks.computeBoundingSphere();
 const emitter=new THREE.Group(),rotor=new THREE.Group();stage.add(emitter);emitter.add(rotor);const ceramic=new THREE.MeshPhysicalMaterial({color:0x664650,metalness:.2,roughness:.38,clearcoat:.45});mesh(new THREE.SphereGeometry(.14,32,20),ceramic,emitter,[0,0,.09]);
 const pupil=mesh(new THREE.SphereGeometry(.065,24,16),new THREE.MeshStandardMaterial({color:0xffc89c,emissive:0xdf8960,emissiveIntensity:.4,roughness:.3}),emitter,[0,0,.21]);
 mesh(new THREE.TorusGeometry(.17,.012,10,64),metal,emitter,[0,0,.16]);for(let i=0;i<3;i++){const petal=mesh(new THREE.TorusGeometry(.255,.034,12,40,Math.PI*.48),ceramic,rotor,[0,0,.065]);petal.rotation.z=i*Math.PI*2/3;const end=mesh(new THREE.SphereGeometry(.023,12,8),metal,rotor,[Math.cos(i*Math.PI*2/3)*.255,Math.sin(i*Math.PI*2/3)*.255,.07]);}
 const modes=[];for(let i=0;i<3;i++)modes.push(mesh(new THREE.SphereGeometry(.018,12,8),new THREE.MeshBasicMaterial({color:0x88a9ab}),emitter,[(i-1)*.08,-.34,.05]));
 const player=new THREE.Group();stage.add(player);const pod=mesh(casing(.21,.052,.075,.022),new THREE.MeshPhysicalMaterial({color:0x90b8ae,metalness:.3,roughness:.24,clearcoat:.65}),player,[0,.02,.12]);mesh(new THREE.ConeGeometry(.033,.1,3),metal,player,[0,-.055,.105]);
 const point=mesh(new THREE.CircleGeometry(.025,24),new THREE.MeshBasicMaterial({color:0xfff4cf,side:THREE.DoubleSide}),player,[0,0,.32]);point.castShadow=false;
 const graze=mesh(new THREE.RingGeometry(BULLET.grazeRadius-.006,BULLET.grazeRadius,64),new THREE.MeshBasicMaterial({color:0x7fcccc,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}),player,[0,0,.30]);graze.castShadow=false;
 const shield=mesh(new THREE.RingGeometry(.17,.183,64),new THREE.MeshBasicMaterial({color:0xf2bcaf,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}),player,[0,0,.29]);shield.castShadow=false;
 const anchor=new THREE.Object3D();anchor.position.set(0,.19,.08);player.add(anchor);
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=160;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const label=mesh(new THREE.PlaneGeometry(1.95,.305),new THREE.MeshBasicMaterial({map:texture,transparent:true}),stage,[0,-2.32,.015]);label.castShadow=false;let previous='';
 function draw(s,reduced){emitter.position.set(s.bx,s.by,0);const interval=s.mode===0?6:s.mode===1?52:60;rotor.rotation.z=s.mode===2?s.aim:s.angle+(s.status==='playing'?(s.modeTick%interval)/interval*(s.mode===0?.11:.3):0);pupil.scale.setScalar(1+(reduced||s.status!=='playing'?0:Math.exp(-(s.modeTick%interval)/5)*.08));modes.forEach((m,i)=>m.material.color.setHex(i===s.mode?0xe2d3aa:0x41616a));player.position.set(s.x,s.y,0);shield.visible=s.invincible>0;shield.material.opacity=reduced?.55:.35+.25*s.invincible/300;graze.material.opacity=.4+(reduced?0:Math.exp(-Math.max(0,s.tick-s.lastGraze)/16)*.5);pod.rotation.z=reduced?0:Math.max(-.16,Math.min(.16,(s.tx-s.x)*.18));
  const key=[s.mode,s.graze,s.lives,s.status].join(':');if(key!==previous){previous=key;ctx.clearRect(0,0,1024,160);ctx.fillStyle='#b4c8c4';ctx.textAlign='center';ctx.font='26px monospace';ctx.fillText('FIND THE QUIET / '+['SPIRAL','PETALS','AIMED'][s.mode],512,54);ctx.font='23px monospace';ctx.fillText('NEAR MISSES '+String(s.graze).padStart(3,'0')+'   /   '+s.lives+' CHANCES',512,101);texture.needsUpdate=true;}}
 return{root,stage,face,emitter,rotor,player,point,graze,shield,anchor,ticks,label,texture,draw};
}
