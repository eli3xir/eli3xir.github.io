import * as THREE from 'three';
import { mesh,brass,ink,glass,liquidMaterial,labelTexture,ring } from './materials.js';
import { randomSequence } from '../audio/synth.js';
import {createOcean} from './ocean.js';
import {createWordMachine} from './word-machine.js';
import {createMoon} from './moon.js';
import {createFluid} from './fluid.js';
import {createTrails} from './trails.js';

function starField(galaxy=false,bullet=false){
  const root=new THREE.Group();const count=galaxy?7000:bullet?1200:3200;
  const positions=new Float32Array(count*3),colors=new Float32Array(count*3);const random=randomSequence(431);
  const warm=new THREE.Color(0xddc497),cool=new THREE.Color(bullet?0xd197ad:0x92b9c9);
  for(let i=0;i<count;i++){
    const seed=random()*.5+.5;const a=random()*Math.PI;
    let radius,x,y,z;
    if(galaxy){radius=.06+seed*1.7;const angle=Math.floor((random()+1)*2)*Math.PI*.5+radius*2.5+(random()*.2);x=Math.cos(angle)*radius;y=random()*.08;z=Math.sin(angle)*radius;}
    else if(bullet){radius=.4+seed*1.2;const angle=a;const r=radius*(.72+Math.sin(angle*7)**2*.3);x=Math.cos(angle)*r;y=Math.sin(angle)*r;z=random()*.3;}
    else{radius=.25+seed*1.35;x=Math.cos(a)*radius;y=Math.sin(a)*radius;z=random()*.1;}
    positions.set([x,y,z],i*3);const color=warm.clone().lerp(cool,seed);colors.set([color.r,color.g,color.b],i*3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const field=new THREE.Points(geometry,new THREE.PointsMaterial({size:galaxy?.014:.019,vertexColors:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
  if(galaxy)field.rotation.x=.45;root.add(field);
  const core=mesh(new THREE.SphereGeometry(bullet?.09:.12,24,16),new THREE.MeshStandardMaterial({color:0xe6dcb2,emissive:0xd5bf88,emissiveIntensity:1.5}),root);
  if(!galaxy){const orbit=ring(root,1.65,.005,0);orbit.rotation.x=0;}
  return{root,actorPosition:[1.25,.8,.1],update(t,beat){field.rotation[galaxy?'y':'z']=t*(bullet?.12:.028);core.scale.setScalar(1+beat.pulse*.2);}};
}

function lens(){
  const root=new THREE.Group();
  const texture=labelTexture('Another way to see.','FIELD NOTES / ELI3XIR');
  mesh(new THREE.PlaneGeometry(2.5,1.3),new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,roughness:.8}),root,[0,0,-.3]);
  const group=new THREE.Group();root.add(group);group.position.set(.2,.1,.35);
  const lens=mesh(new THREE.SphereGeometry(.63,64,40),glass(0xe0e7cb),group);lens.scale.z=.3;
  const rim=mesh(new THREE.TorusGeometry(.65,.025,12,96),brass(),group);
  const handle=mesh(new THREE.CylinderGeometry(.038,.04,.7,16),brass(),group,[.45,-.67,0]);handle.rotation.z=.6;
  return{root,actorPosition:[-.95,.85,.2],update(t,beat){group.position.x=.2+Math.sin(t*.45)*.24;group.position.y=.1+Math.cos(t*.7)*.12;rim.rotation.z=t*.02;}};
}

function breakout(){
  const root=new THREE.Group();root.rotation.x=.1;
  const tiles=[];const palette=[0xdab878,0x99b7a0,0xb68e9b,0x8ea6bb];
  for(let row=0;row<4;row++)for(let col=0;col<6;col++){
    const tile=mesh(new THREE.BoxGeometry(.37,.16,.16),new THREE.MeshStandardMaterial({color:palette[row],metalness:.55,roughness:.3}),root,[(col-2.5)*.44,.75-row*.23,0]);
    tiles.push({tile,x:tile.position.x,y:tile.position.y,index:row*6+col});
  }
  const paddle=mesh(new THREE.BoxGeometry(.7,.08,.18),brass(),root,[0,-1,0]);
  const ball=mesh(new THREE.SphereGeometry(.07,24,16),glass(0xded6a7),root);
  return{root,actorPosition:[1.3,.75,.1],update(t,beat){paddle.position.x=Math.sin(t*.8)*.8;ball.position.set(Math.sin(t*.8)*.8,-.5+Math.abs(Math.sin(t*1.3))*.9,.2);tiles.forEach(({tile,x,y,index})=>{const p=Math.max(0,Math.sin(t*.65-index*.07)-.86)*5;tile.position.set(x+p*(x+.1),y+p*.8,p*.3);tile.rotation.z=p*x;});}};
}

export function createExperiment(id,renderer){
  return({moon:createMoon,ocean:createOcean,fluid:()=>createFluid(renderer),trails:createTrails,galaxy:()=>starField(true),glass:lens,breakout,partext:createWordMachine,bullet:()=>starField(false,true)}[id]||(()=>createFluid(renderer)))();
}
