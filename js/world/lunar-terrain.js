import * as THREE from 'three';
import {randomSequence} from '../audio/synth.js';
const random=randomSequence(2134),craters=[];
for(let i=0;i<100;i++){const a=(random()+1)*Math.PI,size=.25+(random()+1)**2*.65,r=6+size+(random()+1)*40;craters.push({x:Math.cos(a)*r,z:Math.sin(a)*r,r:size});}
craters.push({x:-4.8,z:2.9,r:1.12},{x:4.3,z:-3.6,r:1.35},{x:-1.2,z:-5.5,r:.83});
export function lunarHeight(x,z){
 const radius=Math.hypot(x,z);if(radius<=4.15)return 0;
 let height=(Math.sin(x*.29)*Math.cos(z*.33)*.13+Math.sin(x*2.1+z*.8)*Math.sin(z*1.8)*.026);
 for(const c of craters){const q=Math.hypot(x-c.x,z-c.z)/c.r;if(q>1.5)continue;height+=c.r*(-.23*Math.max(0,1-q*q)**2+.07*Math.exp(-(((q-.98)/.16)**2)));}
 const blend=Math.min(1,(radius-4.15)/1.1);return height*blend*blend*(3-2*blend);
}
export function createLunarTerrain({miniature=false}={}){
 const root=new THREE.Group();let geometry;
 if(miniature){
  const rings=64,sectors=192,positions=[],indices=[];positions.push(0,0,0);
  for(let r=1;r<=rings;r++)for(let s=0;s<sectors;s++){const a=s/sectors*Math.PI*2,x=Math.cos(a)*6.7*r/rings,z=Math.sin(a)*6.7*r/rings;positions.push(x,lunarHeight(x,z),z);}
  for(let s=0;s<sectors;s++)indices.push(0,1+(s+1)%sectors,1+s);
  for(let r=1;r<rings;r++)for(let s=0;s<sectors;s++){const a=1+(r-1)*sectors+s,b=1+(r-1)*sectors+(s+1)%sectors,c=a+sectors,d=b+sectors;indices.push(a,b,c,b,d,c);}
  geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
 }else{
  geometry=new THREE.PlaneGeometry(180,180,180,180);geometry.rotateX(-Math.PI/2);const pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++){const x=Math.sign(pos.getX(i))*(pos.getX(i)/90)**2*90,z=Math.sign(pos.getZ(i))*(pos.getZ(i)/90)**2*90;pos.setXYZ(i,x,lunarHeight(x,z),z);}
 }
 geometry.computeVertexNormals();
 const ground=new THREE.MeshStandardMaterial({color:0x9b9990,roughness:1,metalness:0});
 ground.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 lunarPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nlunarPosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 lunarPosition;
   float lunarHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   float grain=lunarHash(floor(lunarPosition*90.));
   float fade=1.-smoothstep(.3,1.4,length(fwidth(lunarPosition*90.)));
   float broad=sin(lunarPosition.x*5.2+sin(lunarPosition.z*4.7))*sin(lunarPosition.z*3.5)*.035;
   diffuseColor.rgb*=.93+broad+(grain-.5)*.24*fade;
  `);
 };ground.customProgramCacheKey=()=> 'lunar-ground-v1';
 const surface=new THREE.Mesh(geometry,ground);surface.name='lunar-surface';surface.receiveShadow=true;root.add(surface);
 if(miniature){
  const points=[],indices=[];
  for(let i=0;i<=192;i++){const a=i/192*Math.PI*2,x=Math.cos(a)*6.7,z=Math.sin(a)*6.7;points.push(x,lunarHeight(x,z),z,x,-.85,z);if(i<192){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}}
  const skirt=new THREE.BufferGeometry();skirt.setAttribute('position',new THREE.Float32BufferAttribute(points,3));skirt.setIndex(indices);skirt.computeVertexNormals();root.add(new THREE.Mesh(skirt,new THREE.MeshStandardMaterial({color:0x464740,roughness:1})));
 }
 const count=miniature?35:170,stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),ground,count),pose=new THREE.Object3D(),rng=randomSequence(922),color=new THREE.Color();
 for(let i=0;i<count;i++){
  const a=(rng()+1)*Math.PI,r=4.55+(rng()+1)*(miniature?.75:24),x=Math.cos(a)*r,z=Math.sin(a)*r,size=.07+(rng()+1)*.055;
  pose.position.set(x,lunarHeight(x,z)+size*.3,z);pose.scale.set(size*1.3,size*.65,size);pose.rotation.set(rng()*2,rng()*3,rng()*2);pose.updateMatrix();stones.setMatrixAt(i,pose.matrix);stones.setColorAt(i,color.setScalar(.64+(rng()+1)*.14));
 }stones.castShadow=stones.receiveShadow=true;root.add(stones);
 return{root,surface,stones,dispose(){stones.dispose();}};
}
