import * as THREE from 'three';
import {mesh} from './materials.js';
import {casing} from './hardware.js';

const fract=value=>value-Math.floor(value);
function random(x,y){
  let hash=Math.imul(x,374761393)+Math.imul(y,668265263)+19219;
  hash=Math.imul(hash^(hash>>>13),1274126177);return((hash^(hash>>>16))>>>0)/4294967295;
}
// Retain 2.25 MiB of immutable CPU pixels; each model owns its disposable GPU textures.
let woodPixels=null,brassPixels=null;
function noise(x,y){
  const ix=Math.floor(x),iy=Math.floor(y),fx=fract(x),fy=fract(y),u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(random(ix,iy),random(ix+1,iy),u),
    THREE.MathUtils.lerp(random(ix,iy+1),random(ix+1,iy+1),u),v);
}
function texture(data,size,name,color=false){
  const map=new THREE.DataTexture(data,size,size);map.name=name;
  map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
  map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;
  map.anisotropy=4;map.needsUpdate=true;return map;
}
function walnut(){
  const size=512;
  if(!woodPixels){
    const color=new Uint8Array(size*size*4),relief=new Uint8Array(color.length);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=x/size,v=y/size,warp=noise(u*3,v*6),grain=v*39+warp*4.8+Math.sin(u*5+v*3)*1.3;
      const band=Math.pow(.5+.5*Math.sin(grain*Math.PI*2),9),fiber=noise(u*16,v*256);
      const tone=.54+noise(u*3,v*11)*.33-band*.2+(fiber-.5)*.13,i=(y*size+x)*4;
      color[i]=tone*125+12;color[i+1]=tone*74+8;color[i+2]=tone*42+7;color[i+3]=255;
      relief[i]=142-band*50+(fiber-.5)*30;relief[i+1]=190+band*32;relief[i+3]=255;
    }
    woodPixels={color,relief};
  }
  const detail=texture(woodPixels.relief,size,'walnut-relief');
  const material=new THREE.MeshPhysicalMaterial({map:texture(woodPixels.color,size,'walnut-color',true),metalness:0,roughness:.66,
    bumpMap:detail,bumpScale:.003,roughnessMap:detail,clearcoat:.28,clearcoatRoughness:.32});
  material.name='phonograph-walnut';return material;
}
function brushedBrass(){
  const size=256;
  if(!brassPixels){
    brassPixels=new Uint8Array(size*size*4);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const brush=random(1,y),wear=noise(x/48,y/48),i=(y*size+x)*4;
      brassPixels[i]=118+brush*26;brassPixels[i+1]=165+brush*34+wear*22;brassPixels[i+3]=255;
    }
  }
  const detail=texture(brassPixels,size,'brass-brush');
  const material=new THREE.MeshPhysicalMaterial({color:0xb69b6c,metalness:1,roughness:.49,
    roughnessMap:detail,bumpMap:detail,bumpScale:.0007,anisotropy:.32,anisotropyRotation:0});
  material.name='phonograph-brushed-brass';return material;
}

// Normalize face coordinates before batching; do not depend on ExtrudeGeometry's wall UV scale.
function veneerUV(geometry,width,height,depth){
  const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
  for(let i=0;i<p.count;i++){
    const side=Math.abs(n.getX(i))>.7,top=Math.abs(n.getY(i))>.7;
    uv.setXY(i,side?p.getZ(i)/depth+.5:p.getX(i)/width+.5,top?p.getZ(i)/depth+.5:p.getY(i)/height+.5);
  }
  return geometry;
}
export function createCabinet(deck,polished,black){
  const wood=walnut(),brushed=brushedBrass();
  mesh(veneerUV(casing(2.6,.4,1.8),2.6,.4,1.8),wood,deck,[0,-.46,0]);
  mesh(veneerUV(casing(2.66,.03,1.86),2.66,.03,1.86),wood,deck,[0,-.265,0]);
  const panelGeometry=casing(2.43,1.64,.05,.085);panelGeometry.rotateX(-Math.PI/2);panelGeometry.scale(1,.4,1);
  mesh(veneerUV(panelGeometry,2.43,.02,1.64),brushed,deck,[0,-.236,0]);
  // Recessed slotted screws fasten the plate. The dark slot is geometry, so it follows the light and camera.
  for(const x of [-1.14,1.14])for(const z of [-.73,.73]){
    mesh(new THREE.CylinderGeometry(.023,.023,.008,16),polished,deck,[x,-.222,z]);
    const slot=mesh(new THREE.BoxGeometry(.028,.0015,.0035),black,deck,[x,-.217,z]);slot.rotation.y=.35+x*z;
  }
  return brushed;
}

export function createHorn(horn,brushed,polished){
  const profile=[[.045,0],[.05,.3],[.075,.5],[.15,.7],[.28,.92],[.5,1.14],[.72,1.35],[.78,1.39]];
  const curve=new THREE.CatmullRomCurve3(profile.map(([r,y])=>new THREE.Vector3(r,y,0)));
  const points=curve.getPoints(40).map(p=>new THREE.Vector2(p.x,p.y));
  const geometry=new THREE.LatheGeometry(points,96),position=geometry.attributes.position;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i),theta=Math.atan2(x,z);
    const press=1+.018*THREE.MathUtils.smoothstep(y,.35,1.39)*Math.cos(theta*8);
    position.setXYZ(i,x*press,y,z*press);
  }
  geometry.computeVertexNormals();
  const metal=brushed.clone();metal.name='phonograph-horn';metal.color.setHex(0xb78345);
  metal.roughness=.5;metal.anisotropy=.24;metal.anisotropyRotation=Math.PI/2;metal.side=THREE.DoubleSide;
  mesh(geometry,metal,horn);
  // The rolled lip follows the eight pressed sectors instead of crossing the shell.
  const rim=[];
  for(let i=0;i<128;i++){
    const theta=i/128*Math.PI*2,r=.78*(1+.018*Math.cos(theta*8));rim.push(new THREE.Vector3(Math.sin(theta)*r,1.39,Math.cos(theta)*r));
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim,true),128,.012,8,true),polished,horn);
  for(const y of [.09,.25])mesh(new THREE.CylinderGeometry(.055,.055,.027,32),polished,horn,[0,y,0]);
}
