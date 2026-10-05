import * as THREE from 'three';

export function canvas(width,height){const element=document.createElement('canvas');element.width=width;element.height=height;return{canvas:element,ctx:element.getContext('2d')};}
export function texture(canvas,name,renderer){
 const map=new THREE.CanvasTexture(canvas);map.name=name;map.colorSpace=THREE.SRGBColorSpace;map.channel=2;
 map.anisotropy=Math.min(4,renderer?.capabilities.getMaxAnisotropy()||1);return map;
}
export function printOn(object,map,width,height,region=[0,0,1,1]){
 const position=object.geometry.attributes.position,uv=new Float32Array(position.count*2),[x,y,w,h]=region;
 for(let i=0;i<position.count;i++){uv[i*2]=x+(.5-position.getX(i)/width)*w;uv[i*2+1]=y+(.5+position.getY(i)/height)*h;}
 // The GLB's uv/uv1 are rotated bake atlases. Preserve both and add a print UV.
 object.geometry.setAttribute('uv2',new THREE.BufferAttribute(uv,2));
 const material=object.material;material.map=map;material.color.set(0xffffff);material.userData.originalColor=material.color.clone();material.needsUpdate=true;
}
export function paper(ctx,width,height,color){
 ctx.fillStyle=color;ctx.fillRect(0,0,width,height);
 let seed=3517;ctx.fillStyle='#655a40';
 for(let i=0;i<6000;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%width;seed=(Math.imul(seed,1664525)+1013904223)>>>0;ctx.globalAlpha=.014+(seed%17)/2000;ctx.fillRect(x,seed%height,1,1);}ctx.globalAlpha=1;
}
