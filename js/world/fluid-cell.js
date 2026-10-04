import * as THREE from 'three';
import {mesh,brass,ink,glass} from './materials.js';
import {casing} from './hardware.js';
import {batchStatic} from './batch.js';
import {PIGMENTS} from './fluid-state.js';
export function createFluidCell(){
 const root=new THREE.Group(),metal=brass(),dark=ink(),glassMaterial=glass(0xe6dfc8);glassMaterial.roughness=.08;glassMaterial.transmission=.98;glassMaterial.opacity=.08;
 const frame=mesh(casing(3.11,2.09,.24,.15),metal,root,[0,.03,-.15]);
 mesh(casing(2.97,1.96,.06,.13),dark,root,[0,.03,-.007]);
 mesh(casing(2.78,1.76,.07,.1),new THREE.MeshStandardMaterial({color:0xe6dfc8,roughness:.55}),root,[0,.03,.026]);
 mesh(casing(3.45,.19,.88,.1),dark,root,[0,-1.20,0]);
 for(const x of [-1.30,1.30])mesh(new THREE.CylinderGeometry(.055,.085,.28,16),metal,root,[x,-1.07,0]);
 const screws=[];
 for(const x of [-1.46,1.46])for(const y of [-.91,.97]){const screw=mesh(new THREE.CylinderGeometry(.038,.038,.018,16),dark,root,[x,y,-.005]);screw.rotation.x=Math.PI/2;screws.push(screw);mesh(new THREE.BoxGeometry(.038,.005,.013),metal,root,[x,y,.012]);}
 for(let i=0;i<17;i++)mesh(new THREE.BoxGeometry(.007,i%4===0?.041:.022,.012),dark,root,[-1.30+i*.1625,-.942,-.004]);
 const controls=[];
 for(let i=0;i<5;i++){
  const knob=new THREE.Group();knob.position.set(-.84+i*.42,-1.064,.23);root.add(knob);const color=new THREE.MeshStandardMaterial({color:PIGMENTS[i].hex,roughness:.3,metalness:.08});
  mesh(new THREE.CylinderGeometry(.102,.102,.032,24),metal,knob);mesh(new THREE.CylinderGeometry(.084,.084,.04,24),color,knob,[0,.02,0]);controls.push(knob);
 }
 for(const x of [-1.48,1.48])mesh(new THREE.CylinderGeometry(.018,.018,.58,12),metal,root,[x,1.28,-.13]);
 mesh(new THREE.BoxGeometry(3.05,.026,.033),metal,root,[0,1.57,-.13]);
 const nozzle=new THREE.Group();nozzle.position.set(.55,1.33,.05);root.add(nozzle);mesh(casing(.18,.1,.21,.015),dark,nozzle,[0,.25,-.08]);
 mesh(new THREE.CylinderGeometry(.044,.044,.26,16),metal,nozzle);mesh(new THREE.CylinderGeometry(.036,.009,.14,12),dark,nozzle,[0,-.20,0]);
 const bulb=mesh(new THREE.SphereGeometry(.12,24,16),new THREE.MeshStandardMaterial({color:PIGMENTS[1].hex,roughness:.4}),nozzle,[0,.22,0]);bulb.scale.y=1.3;
 const drop=mesh(new THREE.SphereGeometry(.055,20,12),new THREE.MeshPhysicalMaterial({color:PIGMENTS[1].hex,roughness:.15,metalness:0,clearcoat:1}),root);drop.visible=false;
 const material=new THREE.MeshPhysicalMaterial({color:0xc6b99b,roughness:.26,clearcoat:.9,clearcoatRoughness:.13});
 const uniforms={dye:{value:null},resolution:{value:new THREE.Vector2(512,320)}};
 material.onBeforeCompile=shader=>{shader.uniforms.fluidDye=uniforms.dye;shader.uniforms.fluidSize=uniforms.resolution;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 fluidUV;').replace('#include <uv_vertex>','#include <uv_vertex>\nfluidUV=uv;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
   uniform sampler2D fluidDye;uniform vec2 fluidSize;varying vec2 fluidUV;
   vec4 dyeAt(vec2 uv){vec2 p=uv*fluidSize-.5,a=(floor(p)+.5)/fluidSize,f=fract(p),d=1./fluidSize;return mix(mix(texture2D(fluidDye,a),texture2D(fluidDye,a+vec2(d.x,0)),f.x),mix(texture2D(fluidDye,a+vec2(0,d.y)),texture2D(fluidDye,a+d),f.x),f.y);}
  `).replace('#include <color_fragment>',`#include <color_fragment>
   vec2 q=abs(fluidUV-.5)-vec2(.467,.447);float corner=length(max(q,0.))+min(max(q.x,q.y),0.)-.033;if(corner>0.)discard;
   vec4 pigment=dyeAt(fluidUV);diffuseColor.rgb*=exp(-pigment.rgb*.8);
  `);
 };material.customProgramCacheKey=()=> 'fluid-cell-v1';
 const surface=mesh(new THREE.PlaneGeometry(2.72,1.70,1,1),material,root,[0,.03,.074]);surface.name='fluid-window';surface.castShadow=false;
 const pane=mesh(casing(2.80,1.80,.045,.12),glassMaterial,root,[0,.03,.095]);pane.castShadow=false;
 const target=mesh(new THREE.RingGeometry(.052,.058,32),new THREE.MeshBasicMaterial({color:0xe8dfbd,depthTest:false,transparent:true,opacity:.9}),root,[0,0,.14]);target.visible=false;target.castShadow=false;target.renderOrder=4;
 const exclude=new Set([surface,pane,drop,target,...controls.flatMap(k=>k.children),...nozzle.children]);batchStatic(root,exclude);
 const actorAnchor=new THREE.Object3D();actorAnchor.position.set(-1.29,-1.00,.22);root.add(actorAnchor);
 return{root,surface,frame,uniforms,nozzle,bulb,drop,controls,target,actorAnchor};
}
