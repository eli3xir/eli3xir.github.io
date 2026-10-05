import * as THREE from 'three';
import {mesh} from './materials.js';
import {createPoolWaves} from '../experience/pool-waves.js';

const sampling=`uniform sampler2D uPoolState;
 vec4 poolField(vec2 p){
  vec2 cell=clamp((p+vec2(.5,.33))/vec2(1.,.66),0.,1.)*vec2(64.,42.);
  vec2 base=floor(cell),f=fract(cell),size=vec2(65.,43.);
  vec4 a=texture2D(uPoolState,(base+.5)/size),b=texture2D(uPoolState,(base+vec2(1.5,.5))/size);
  vec4 c=texture2D(uPoolState,(base+vec2(.5,1.5))/size),d=texture2D(uPoolState,(base+1.5)/size);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
 }
`;
export function createLeisureWater(parent){
 const pixels=new Uint8Array(192*128*4);
 for(let y=0;y<128;y++)for(let x=0;x<192;x++){
  const i=(y*192+x)*4,line=x%16<1||y%16<1,tone=((Math.floor(x/16)*17+Math.floor(y/16)*13)%7)/7;
  const lane=x>29&&x<162&&y>61&&y<67;
  pixels.set(line?[105,148,142,255]:lane?[73,113,112,255]:[175+tone*14,207+tone*12,195+tone*12,255],i);
 }
 const tiles=new THREE.DataTexture(pixels,192,128);tiles.name='leisure-pool-tiles';tiles.colorSpace=THREE.SRGBColorSpace;tiles.needsUpdate=true;
 tiles.generateMipmaps=true;tiles.minFilter=THREE.LinearMipmapLinearFilter;tiles.magFilter=THREE.LinearFilter;tiles.anisotropy=4;
 const waves=createPoolWaves(),state=new THREE.DataTexture(waves.pixels,waves.width,waves.height,THREE.RGBAFormat,THREE.FloatType);
 state.name='leisure-pool-state';state.needsUpdate=true;
 const uniforms={uLeisureTime:{value:0},uWake:{value:new THREE.Vector3()},uPoolState:{value:state}};
 const floorMaterial=new THREE.MeshStandardMaterial({map:tiles,roughness:.48});floorMaterial.poolState=state;
 floorMaterial.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec2 vPoolPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPoolPoint=position.xz;');
  shader.fragmentShader='varying vec2 vPoolPoint;\n'+sampling+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float focusing=clamp(1.-poolField(vPoolPoint).a*.022,.58,1.7);diffuseColor.rgb*=focusing;`);
 };
 const floor=mesh(new THREE.PlaneGeometry(1.02,.68).rotateX(-Math.PI/2),floorMaterial,parent,[0,-.752,0]);floor.name='leisure-pool-floor';
 const material=new THREE.MeshPhysicalMaterial({color:0xe5fff3,roughness:.085,transmission:1,thickness:.089,ior:1.333,depthWrite:false,attenuationColor:0x65b6ab,attenuationDistance:.75});
 material.poolState=state;
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);shader.vertexShader=sampling+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   vec4 field=poolField(position.xz);objectNormal=normalize(vec3(-field.g,1.,-field.b));`);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=field.r;');
 };
 const water=mesh(new THREE.PlaneGeometry(1,.66,64,42).rotateX(-Math.PI/2),material,parent,[0,-.663,0]);
 water.name='leisure-water';water.castShadow=false;
 let reduced=false,revision=-1,hands=null;
 const points=[new THREE.Vector3(),new THREE.Vector3()];
 return{water,uniforms,
  update(time,x,z,strength,reduce=false){uniforms.uLeisureTime.value=time;uniforms.uWake.value.set(x,z,strength);reduced=reduce;},
  follow(actor){
   hands??=['mote-left-hand','mote-right-hand'].map(name=>actor.root.getObjectByName(name));
   actor.root.updateWorldMatrix(true,true);water.updateWorldMatrix(true,false);
   const positions=hands.map((hand,i)=>water.worldToLocal(hand.getWorldPosition(points[i])).toArray());
   waves.advance(uniforms.uLeisureTime.value,positions,uniforms.uWake.value.z,reduced);
   const next=waves.revision;if(revision!==next){state.needsUpdate=true;revision=next;}
  },
  diagnostics(){return waves.diagnostics();}
 };
}
