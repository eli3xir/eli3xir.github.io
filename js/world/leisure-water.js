import * as THREE from 'three';
import {mesh} from './materials.js';

export function createLeisureWater(parent){
  const pixels=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const i=(y*128+x)*4,line=x%16<1||y%16<1;
    pixels.set(line?[95,144,142,255]:[193,222,209,255],i);
  }
  const tiles=new THREE.DataTexture(pixels,128,128);tiles.colorSpace=THREE.SRGBColorSpace;tiles.needsUpdate=true;
  tiles.magFilter=tiles.minFilter=THREE.LinearFilter;
  mesh(new THREE.PlaneGeometry(1.02,.68).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({map:tiles,roughness:.62}),parent,[0,-.765,0]);
  const uniforms={uLeisureTime:{value:0},uWake:{value:new THREE.Vector3(0,0,0)}};
  const material=new THREE.MeshPhysicalMaterial({color:0x69a9a0,roughness:.13,transmission:.55,thickness:.08,ior:1.333,clearcoat:.7,depthWrite:false});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=`uniform float uLeisureTime;uniform vec3 uWake;
      float surface(vec2 p){float d=length(p-uWake.xy);return uWake.z*(.009*sin(p.x*13.-uLeisureTime*4.)*sin(p.y*17.+uLeisureTime*3.)+.016*exp(-d*4.)*sin(d*48.-uLeisureTime*13.));}
      `+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      float e=.003;objectNormal=normalize(vec3(surface(position.xz-vec2(e,0.))-surface(position.xz+vec2(e,0.)),2.*e,surface(position.xz-vec2(0.,e))-surface(position.xz+vec2(0.,e))));`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=surface(position.xz);');
  };
  const water=mesh(new THREE.PlaneGeometry(1,.66,48,28).rotateX(-Math.PI/2),material,parent,[0,-.663,0]);
  water.name='leisure-water';water.castShadow=false;
  return{water,uniforms,update(time,x,z,strength){uniforms.uLeisureTime.value=time;uniforms.uWake.value.set(x,z,strength);}};
}
