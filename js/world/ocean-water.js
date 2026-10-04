import * as THREE from 'three';
import {waveGLSL} from './ocean-waves.js';

export function createOceanWater(width,depth,{segments=100,scale=1,bounded=false,concentrate=false}={}){
  const uniforms={uOceanTime:{value:0},uOceanStrength:{value:1},uOceanScale:{value:scale},uOceanOrigin:{value:new THREE.Vector2()},uOceanExtent:{value:new THREE.Vector2(bounded?width/2:0,bounded?depth/2:0)}};
  const common=`uniform float uOceanTime,uOceanStrength,uOceanScale;uniform vec2 uOceanOrigin,uOceanExtent;${waveGLSL}
    float oceanHeight(vec2 p){float h=oceanWave((p+uOceanOrigin)/uOceanScale,uOceanTime,uOceanStrength).x*uOceanScale;
      if(uOceanExtent.x>0.)h*=smoothstep(0.,.2,uOceanExtent.x-abs(p.x))*smoothstep(0.,.2,uOceanExtent.y-abs(p.y));return h;}`;
  const material=new THREE.MeshPhysicalMaterial({color:0x256266,roughness:.25,metalness:.08,clearcoat:.6,clearcoatRoughness:.12});
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=common+'\nvarying vec2 vOceanPoint;varying vec3 vOceanX,vOceanZ;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
      float e=.003*uOceanScale;objectNormal=normalize(vec3(oceanHeight(position.xz-vec2(e,0.))-oceanHeight(position.xz+vec2(e,0.)),2.*e,oceanHeight(position.xz-vec2(0.,e))-oceanHeight(position.xz+vec2(0.,e))));`);
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      transformed.y+=oceanHeight(position.xz);vOceanPoint=(position.xz+uOceanOrigin)/uOceanScale;
      vOceanX=normalize(normalMatrix*vec3(1.,0.,0.));vOceanZ=normalize(normalMatrix*vec3(0.,0.,1.));`);
    shader.fragmentShader='uniform float uOceanTime,uOceanStrength;varying vec2 vOceanPoint;varying vec3 vOceanX,vOceanZ;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      vec2 p=vOceanPoint;float a=p.x*47.+p.y*18.-uOceanTime*3.1,b=p.y*61.-p.x*13.+uOceanTime*4.7;
      vec2 detail=vec2(.018*cos(a)*47.-.012*cos(b)*13.,.018*cos(a)*18.+.012*cos(b)*61.)*.08*uOceanStrength;
      normal=normalize(normal-vOceanX*detail.x-vOceanZ*detail.y);`);
  };
  const geometry=new THREE.PlaneGeometry(width,depth,segments,Math.max(32,Math.round(segments*depth/width))).rotateX(-Math.PI/2);
  if(concentrate){const positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const x=positions.getX(i)/(width/2),z=positions.getZ(i)/(depth/2);positions.setX(i,x*Math.abs(x)*width/2);positions.setZ(i,z*Math.abs(z)*depth/2);}positions.needsUpdate=true;}
  const water=new THREE.Mesh(geometry,material);water.name='ocean-water';water.receiveShadow=true;water.frustumCulled=false;
  return{water,uniforms,update(time,strength=1,x=0,z=0){uniforms.uOceanTime.value=time;uniforms.uOceanStrength.value=strength;uniforms.uOceanOrigin.value.set(x,z);}};
}
