import * as THREE from 'three';
import {mesh} from './materials.js';
import {randomSequence} from '../audio/synth.js';
import {APPROACH_DURATION,flightSample,LUNAR_GRAVITY} from './lunar-flight.js';
import {lunarHeight} from './lunar-terrain.js';
export function createLunarEffects(parent,lander){
 const count=720,positions=new Float32Array(count*3),alpha=new Float32Array(count),seeds=[],random=randomSequence(321);
 for(let i=0;i<count;i++){const angle=(random()+1)*Math.PI;seeds.push({birth:2.3+i/count*(APPROACH_DURATION-2.3),angle,speed:3.8+(random()+1)*2.3,up:.25+(random()+1)*.27,r:.35+(random()+1)*.3});}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('alpha',new THREE.BufferAttribute(alpha,1).setUsage(THREE.DynamicDrawUsage));
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{viewport:{value:1000}},
  vertexShader:`attribute float alpha;varying float opacity;uniform float viewport;
   void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;opacity=alpha;
   gl_PointSize=clamp(.045*length(modelViewMatrix[0].xyz)*viewport*projectionMatrix[1][1]/max(.1,-p.z),.6,8.);}`,
  fragmentShader:`varying float opacity;void main(){float d=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.15,1.,d))*opacity;if(a<.01)discard;gl_FragColor=vec4(.53,.49,.40,a*.42);#include <tonemapping_fragment>
   #include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const dust=new THREE.Points(geometry,material);dust.name='lunar-dust';dust.frustumCulled=false;parent.add(dust);
 // Exhaust is faint in vacuum; visible dust carries the near-ground cue.
 const plume=mesh(new THREE.CylinderGeometry(.18,.55,1,20,1,true),new THREE.MeshBasicMaterial({color:0xbac2d0,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false}),lander,[0,.16,0]);plume.castShadow=plume.receiveShadow=false;
 const flag=new THREE.Group();flag.name='lunar-flag';flag.position.set(1.56,2.4,-.35);lander.add(flag);
 const metal=new THREE.MeshStandardMaterial({color:0xaeb3ae,metalness:.7,roughness:.32});
 mesh(new THREE.CylinderGeometry(.025,.032,1.7,8),metal,flag,[0,.85,0]);
 const cross=mesh(new THREE.CylinderGeometry(.019,.019,.89,8),metal,flag,[.42,1.66,0]);cross.rotation.z=Math.PI/2;
 const clothGeometry=new THREE.PlaneGeometry(.82,.51,24,8),clothPosition=clothGeometry.attributes.position;
 for(let i=0;i<clothPosition.count;i++)clothPosition.setZ(i,Math.sin(clothPosition.getX(i)*28)*.026*(.26-clothPosition.getY(i))/.51);clothGeometry.computeVertexNormals();
 mesh(clothGeometry,new THREE.MeshStandardMaterial({color:0xa03830,roughness:1,side:THREE.DoubleSide}),flag,[.42,1.40,0]);
 let alive=0,last=-1;
 return{dust,flag,plume,update(state,height=1000,reduced=false){
  material.uniforms.viewport.value=height;plume.visible=state.mode==='descending'&&state.delay===0;plume.scale.y=Math.min(1.1,state.altitude+.4);plume.material.opacity=reduced?0:.023+state.thrust*.009;
  const deploy=state.mode==='landed'?Math.min(1,(state.elapsed-APPROACH_DURATION)/.8):0;flag.scale.y=reduced&&state.mode==='landed'?1:Math.max(.001,deploy*deploy*(3-2*deploy));flag.visible=state.mode==='landed';
  if(last===state.elapsed&&!reduced)return;last=state.elapsed;alive=0;
  for(let i=0;i<count;i++){
   const s=seeds[i],age=state.elapsed-s.birth,atBirth=flightSample(s.birth),r=s.r+age*s.speed,x=Math.cos(s.angle)*r,z=Math.sin(s.angle)*r,y=.04+s.up*age-.5*LUNAR_GRAVITY*age*age;
   const active=!reduced&&state.mode!=='ready'&&age>=0&&age<1.5&&atBirth.altitude<2.3&&y>lunarHeight(x,z);
   positions.set(active?[x,Math.max(0,y),z]:[0,0,0],i*3);alpha[i]=active?Math.min(1,age*16)*Math.max(0,1-age/1.5):0;if(active)alive++;
  }dust.visible=alive>0;geometry.attributes.position.needsUpdate=true;geometry.attributes.alpha.needsUpdate=true;
 },diagnostics(){return{alive,flag:flag.visible,plume:plume.visible};}};
}
