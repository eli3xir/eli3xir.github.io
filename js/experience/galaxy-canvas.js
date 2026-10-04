import * as THREE from 'three';
import {galaxyData} from '../world/galaxy-density.js';
export function createGalaxyCanvas(canvas){
 const ctx=canvas.getContext('2d'),data=galaxyData(60000,128),dust=document.createElement('canvas');dust.width=dust.height=128;const dctx=dust.getContext('2d'),pixels=dctx.createImageData(128,128),matrix=new THREE.Matrix4(),rotation=new THREE.Matrix4(),scale=new THREE.Vector3(),euler=new THREE.Euler();let width=1,height=1,ratio=1,last='',lastBand=-1;
 return{resize(w,h){width=w;height=h;ratio=Math.min(devicePixelRatio,1.3);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);last='';},
  draw(s){const key=[s.angle,s.band,s.yaw,s.tilt,s.zoom].map(v=>v.toFixed(4)).join(':');if(key===last)return false;last=key;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#0c151a';ctx.fillRect(0,0,width,height);const cx=width*.5,cy=height*.48,k=Math.min(width,height)*.44/3.2;
   matrix.makeRotationFromEuler(euler.set(s.tilt,s.yaw,-.15,'YXZ')).multiply(rotation.makeRotationY(s.angle)).scale(scale.setScalar(s.zoom));const m=matrix.elements;
   const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,k*.8);glow.addColorStop(0,s.band>.5?'#4f7787':'#a49776');glow.addColorStop(.2,s.band>.5?'#233947':'#3c3b32');glow.addColorStop(1,'#0c151a');ctx.fillStyle=glow;ctx.fillRect(cx-k*.8,cy-k*.8,k*1.6,k*1.6);
   for(let i=0;i<60000;i+=10){const n=i*3,x=data.positions[n],y=data.positions[n+1],z=data.positions[n+2],px=cx+(m[0]*x+m[4]*y+m[8]*z)*k,py=cy-(m[1]*x+m[5]*y+m[9]*z)*k;ctx.fillStyle=s.band>.5?'#8ab3d0':data.colors[n]>data.colors[n+2]?'#c9b58b':'#86b0d0';ctx.globalAlpha=.24+data.detail[i*2]*.3;const radius=.6+data.detail[i*2]*.4;ctx.fillRect(px,py,radius,radius);}
   ctx.globalAlpha=1;const band=Math.round(s.band*32);if(band!==lastBand){lastBand=band;for(let i=0;i<128*128;i++){const amount=data.density[i*4]/255,bright=data.density[i*4+2]/255;pixels.data[i*4]=Math.round(6+(210+bright*35)*s.band);pixels.data[i*4+1]=Math.round(9+85*s.band);pixels.data[i*4+2]=Math.round(12+15*s.band);pixels.data[i*4+3]=Math.round(amount*170);}dctx.putImageData(pixels,0,0);}
   ctx.transform(m[0]*k,-m[1]*k,m[8]*k,-m[9]*k,cx-2.1*k*(m[0]+m[8]),cy+2.1*k*(m[1]+m[9]));ctx.drawImage(dust,0,0,4.2,4.2);ctx.setTransform(ratio,0,0,ratio,0,0);return true;
  }
 };
}
