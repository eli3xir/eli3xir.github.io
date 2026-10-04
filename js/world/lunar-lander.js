import * as THREE from 'three';
import {mesh} from './materials.js';
import {batchStatic} from './batch.js';
export function createLander(){
 const root=new THREE.Group();root.name='lunar-lander';
 const foil=new THREE.MeshStandardMaterial({color:0xc28b35,metalness:.78,roughness:.4,flatShading:true});
 const silver=new THREE.MeshStandardMaterial({color:0xc1c4be,metalness:.72,roughness:.33}),dark=new THREE.MeshStandardMaterial({color:0x191d1d,metalness:.4,roughness:.63}),white=new THREE.MeshStandardMaterial({color:0xc8c9be,metalness:.28,roughness:.6});
 foil.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 foilPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nfoilPosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   varying vec3 foilPosition;
   float foilHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float foilNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(foilHash(i),foilHash(i+vec3(1,0,0)),f.x),mix(foilHash(i+vec3(0,1,0)),foilHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(foilHash(i+vec3(0,0,1)),foilHash(i+vec3(1,0,1)),f.x),mix(foilHash(i+vec3(0,1,1)),foilHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float crease=foilNoise(foilPosition*25.);
   roughnessFactor=clamp(roughnessFactor+crease*.2-.08,.2,.85);
   diffuseColor.rgb*=.83+crease*.23;
  `);
 };foil.customProgramCacheKey=()=> 'lunar-foil-v1';
 function rod(a,b,r=.045,material=silver){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from);const part=mesh(new THREE.CylinderGeometry(r,r,delta.length(),8),material,root,from.add(to).multiplyScalar(.5).toArray());part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return part;}
 const body=mesh(new THREE.CylinderGeometry(1.86,1.86,1.05,96,24),foil,root,[0,1.9,0]);body.rotation.y=Math.PI/8;
 const p=body.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i),a=Math.atan2(x,z),sector=((a+Math.PI*4)%(Math.PI/4))-Math.PI/8,facet=Math.cos(Math.PI/8)/Math.cos(sector),ripple=Math.abs(y)<.51?Math.sin(x*81+y*97+z*53)*.007:0;p.setX(i,x*(facet+ripple));p.setZ(i,z*(facet+ripple));}body.geometry.computeVertexNormals();
 mesh(new THREE.CylinderGeometry(1.9,1.9,.09,8),dark,root,[0,2.47,0]).rotation.y=Math.PI/8;
 mesh(new THREE.CylinderGeometry(1.88,1.88,.06,8),silver,root,[0,1.34,0]).rotation.y=Math.PI/8;
 const profile=[[-1.03,0],[-1.20,.62],[-.72,1.46],[.61,1.54],[1.06,.86],[1.03,0]],shape=new THREE.Shape();profile.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
 const cabin=mesh(new THREE.ExtrudeGeometry(shape,{depth:1.65,bevelEnabled:false}),white,root,[0,2.52,-.82]);cabin.name='lunar-cabin';
 mesh(new THREE.BoxGeometry(1.23,1.0,.6),dark,root,[0,3.21,-1.06]);
 for(const sign of [-1,1]){
  const windowShape=new THREE.Shape();windowShape.moveTo(sign*.15,0);windowShape.lineTo(sign*.77,0);windowShape.lineTo(sign*.5,.5);windowShape.closePath();
  mesh(new THREE.ShapeGeometry(windowShape),dark,root,[0,3.22,.844]);
  rod([sign*.15,3.22,.86],[sign*.77,3.22,.86],.025,silver);rod([sign*.77,3.22,.86],[sign*.5,3.72,.86],.025,silver);rod([sign*.5,3.72,.86],[sign*.15,3.22,.86],.025,silver);
  mesh(new THREE.SphereGeometry(.40,16,10),foil,root,[sign*1.09,2.99,-.18]).scale.set(.6,1.2,1);
 }
 mesh(new THREE.BoxGeometry(.65,.53,.05),dark,root,[0,2.89,.86]);mesh(new THREE.BoxGeometry(.53,.42,.07),silver,root,[0,2.89,.89]);
 const footPositions=[];
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,dx=Math.sin(a),dz=Math.cos(a),sx=Math.cos(a),sz=-Math.sin(a),foot=[dx*3.35,.10,dz*3.35],hip=[dx*1.62,2.31,dz*1.62];footPositions.push([foot[0],0,foot[2]]);
  rod(hip,foot,.077,foil);rod([dx*2.6,.84,dz*2.6],foot,.048,silver);
  for(const sign of [-1,1])rod([dx*1.48+sx*.83*sign,1.44,dz*1.48+sz*.83*sign],[dx*2.82,.52,dz*2.82],.044,silver);
  mesh(new THREE.SphereGeometry(.12,10,8),silver,root,hip);
  mesh(new THREE.CylinderGeometry(.40,.48,.12,20),foil,root,[foot[0],.06,foot[2]]);
  mesh(new THREE.TorusGeometry(.39,.026,6,28),silver,root,[foot[0],.125,foot[2]]).rotation.x=Math.PI/2;
 }
 // Ladder follows the front primary leg; all rails terminate above the footpad.
 for(const x of [-.29,.29])rod([x,.29,3.12],[x,2.53,1.65],.035,silver);
 for(let i=0;i<9;i++){const p=i/8;rod([-.29,.34+p*2.11,3.09-p*1.38],[.29,.34+p*2.11,3.09-p*1.38],.025,silver);}
 const bellPoints=[[.37,0],[.36,.1],[.31,.3],[.23,.5],[.2,.66]].map(([r,y])=>new THREE.Vector2(r,y));
 mesh(new THREE.LatheGeometry(bellPoints,32),new THREE.MeshStandardMaterial({color:0x343838,metalness:.66,roughness:.4,side:THREE.DoubleSide}),root,[0,.54,0]);
 mesh(new THREE.TorusGeometry(.37,.025,8,32),silver,root,[0,.54,0]).rotation.x=Math.PI/2;
 rod([-.6,3.86,-.18],[-.9,4.87,-.22],.035);
 const dish=new THREE.Group();dish.position.set(-.92,4.78,-.22);dish.rotation.x=-.65;dish.rotation.z=.2;root.add(dish);
 const dishMesh=mesh(new THREE.SphereGeometry(.43,24,12,0,Math.PI*2,0,.85),new THREE.MeshStandardMaterial({color:0xc2c3b8,metalness:.65,roughness:.46,side:THREE.DoubleSide}),dish);dishMesh.rotation.x=Math.PI;
 rod([.66,4.0,.12],[.66,5.05,.12],.025);rod([.34,4.83,.12],[.98,4.83,.12],.015);
 for(const x of [-1,1])for(const z of [-1,1]){const jet=mesh(new THREE.CylinderGeometry(.09,.16,.19,10),dark,root,[x*1.25,3.08,z*.61]);jet.rotation.z=x*Math.PI/2;}
 batchStatic(root);
 const anchor=new THREE.Object3D();anchor.position.set(.72,2.74,1.25);anchor.rotation.y=.05;root.add(anchor);
 return{root,anchor,footPositions};
}
