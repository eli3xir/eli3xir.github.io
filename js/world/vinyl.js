import * as THREE from 'three';

export const OUTER_GROOVE=.69,INNER_GROOVE=.26;

function filteredTexture(data,size,name){
  const texture=new THREE.DataTexture(data,size,size);texture.name=name;
  texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
  texture.anisotropy=4;texture.needsUpdate=true;return texture;
}

export function createVinylSurface(record){
  const size=512,relief=new Uint8Array(size*size*4);
  // Three polished gaps mark the four equal musical movements under the needle.
  const gaps=[1,2,3].map(i=>INNER_GROOVE+(OUTER_GROOVE-INNER_GROOVE)*i/4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=(x+.5)/size*2-1,v=(y+.5)/size*2-1,r=Math.hypot(u,v),angle=Math.atan2(v,u);
    const radius=r*.776,groove=Math.sin(r*Math.PI*2*70+angle);
    const etched=radius>.245&&radius<.744&&!gaps.some(at=>Math.abs(radius-at)<.003),index=(y*size+x)*4;
    // Pack height and roughness into separate channels of one linear-data texture.
    relief[index]=etched?128+groove*22:128;relief[index+1]=etched?216+groove*5:178;relief[index+2]=0;relief[index+3]=255;
  }
  const directionSize=128,direction=new Uint8Array(directionSize*directionSize*4);
  for(let y=0;y<directionSize;y++)for(let x=0;x<directionSize;x++){
    const u=(x+.5)/directionSize*2-1,v=(y+.5)/directionSize*2-1,r=Math.max(.001,Math.hypot(u,v)),index=(y*directionSize+x)*4;
    direction[index]=127.5-v/r*127.5;direction[index+1]=127.5+u/r*127.5;direction[index+2]=255;direction[index+3]=255;
  }
  const reliefMap=filteredTexture(relief,size,'vinyl-relief');
  const material=new THREE.MeshPhysicalMaterial({color:0x101513,metalness:0,roughness:.6,specularIntensity:.4,
    bumpMap:reliefMap,bumpScale:.001,roughnessMap:reliefMap,anisotropy:.45,
    anisotropyMap:filteredTexture(direction,directionSize,'vinyl-direction')});
  const surface=new THREE.Mesh(new THREE.CircleGeometry(.776,112),material);surface.name='vinyl-surface';
  surface.position.y=.0176;surface.rotation.x=-Math.PI/2;surface.receiveShadow=true;record.add(surface);
  return surface;
}
