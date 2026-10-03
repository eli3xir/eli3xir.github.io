import * as THREE from 'three';

export function createStage(){
  const material=new THREE.MeshStandardMaterial({color:0x141c17,roughness:.88,metalness:.12,transparent:true,depthWrite:false});
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vStagePosition;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvStagePosition=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vStagePosition;')
      .replace('#include <opaque_fragment>','diffuseColor.a *= 1.0-smoothstep(1.0,3.5,length(vStagePosition.xy));\n#include <opaque_fragment>');
  };
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(9,9),material);floor.rotation.x=-Math.PI/2;floor.position.y=-1.27;floor.receiveShadow=true;
  return floor;
}
