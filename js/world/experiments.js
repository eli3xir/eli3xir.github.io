import * as THREE from 'three';
import { mesh,ring } from './materials.js';
import { randomSequence } from '../audio/synth.js';
import {createOcean} from './ocean.js';
import {createWordMachine} from './word-machine.js';
import {createMoon} from './moon.js';
import {createFluid} from './fluid.js';
import {createTrails} from './trails.js';
import {createGalaxy} from './galaxy.js';
import {createGlass} from './glass.js';
import {createBreakout} from './breakout.js';

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

export function createExperiment(id,renderer){
  return({moon:createMoon,ocean:createOcean,fluid:()=>createFluid(renderer),trails:createTrails,galaxy:createGalaxy,glass:createGlass,breakout:createBreakout,partext:createWordMachine,bullet:()=>starField(false,true)}[id]||(()=>createFluid(renderer)))();
}
