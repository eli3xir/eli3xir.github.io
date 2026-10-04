import * as THREE from 'three';
import {VELOCITY_WIDTH as W,VELOCITY_HEIGHT as H,initialFluid,pigment,resampleField,validFluidState} from './fluid-state.js';
// Lower-resolution dye, same velocity domain. Used when float rendering is absent.
export function createCpuFluid(){
 const size=W*H*4;let velocity=initialFluid(W,H,true),next=new Float32Array(size),dye=initialFluid(W,H),dyeNext=new Float32Array(size),pressure=new Float32Array(size),pressureNext=new Float32Array(size),div=new Float32Array(size),time=0,steps=0;
 const texture=new THREE.DataTexture(dye,W,H,THREE.RGBAFormat,THREE.FloatType);texture.needsUpdate=true;
 const index=(x,y)=>(Math.max(0,Math.min(H-1,y))*W+Math.max(0,Math.min(W-1,x)))*4;
 function bilinear(field,x,y,c){x=Math.max(0,Math.min(W-1,x));y=Math.max(0,Math.min(H-1,y));const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;return(field[index(ix,iy)+c]*(1-fx)+field[index(ix+1,iy)+c]*fx)*(1-fy)+(field[index(ix,iy+1)+c]*(1-fx)+field[index(ix+1,iy+1)+c]*fx)*fy;}
 function upload(){texture.image.data=dye;texture.needsUpdate=true;}
 const api={kind:'cpu',texture,get data(){return dye;},
  reset(){velocity.set(initialFluid(W,H,true));dye.set(initialFluid(W,H));pressure.fill(0);time=steps=0;upload();},
  clear(){velocity.fill(0);dye.fill(0);pressure.fill(0);upload();},
  inject(x,y,dx,dy,color=1,amount=.8,radius=.035){const ink=pigment(color);for(let j=0;j<H;j++)for(let i=0;i<W;i++){const px=((i+.5)/W-x)*1.6,py=(j+.5)/H-y,weight=Math.exp(-(px*px+py*py)/(radius*radius)),k=index(i,j);velocity[k]=Math.max(-2,Math.min(2,velocity[k]+dx*weight));velocity[k+1]=Math.max(-2,Math.min(2,velocity[k+1]+dy*weight));for(let c=0;c<4;c++)dye[k+c]=Math.min(12,dye[k+c]+(c===3?1:ink[c])*weight*amount);}upload();},
  step(dt){if(dt<=0)return;dt=Math.min(dt,1/30);
   for(let j=0;j<H;j++)for(let i=0;i<W;i++){const k=index(i,j),x=i-dt*velocity[k]*H,y=j-dt*velocity[k+1]*H;for(let c=0;c<2;c++)next[k+c]=bilinear(velocity,x,y,c)*Math.exp(-dt*.16);}
   [velocity,next]=[next,velocity];
   for(let j=0;j<H;j++)for(let i=0;i<W;i++){const k=index(i,j);div[k]=(velocity[index(i+1,j)]-velocity[index(i-1,j)]+velocity[index(i,j+1)+1]-velocity[index(i,j-1)+1])*.5*H;pressure[k]*=.8;}
   for(let pass=0;pass<24;pass++){for(let j=0;j<H;j++)for(let i=0;i<W;i++){const k=index(i,j);pressureNext[k]=(pressure[index(i-1,j)]+pressure[index(i+1,j)]+pressure[index(i,j-1)]+pressure[index(i,j+1)]-div[k]/(H*H))*.25;}[pressure,pressureNext]=[pressureNext,pressure];}
   for(let j=0;j<H;j++)for(let i=0;i<W;i++){const k=index(i,j);velocity[k]-=(pressure[index(i+1,j)]-pressure[index(i-1,j)])*.5*H;velocity[k+1]-=(pressure[index(i,j+1)]-pressure[index(i,j-1)])*.5*H;if(i===0||i===W-1)velocity[k]=0;if(j===0||j===H-1)velocity[k+1]=0;}
   for(let j=0;j<H;j++)for(let i=0;i<W;i++){const k=index(i,j),x=i-dt*velocity[k]*H,y=j-dt*velocity[k+1]*H;for(let c=0;c<4;c++)dyeNext[k+c]=bilinear(dye,x,y,c)*Math.exp(-dt*.024);}
   [dye,dyeNext]=[dyeNext,dye];time+=dt;steps++;upload();
  },
  snapshot(){return{width:W,height:H,velocity:velocity.slice(),pressure:pressure.slice(),dye:dye.slice(),time,steps};},
  restore(state){if(!validFluidState(state))return false;velocity.set(state.velocity);pressure.set(state.pressure);dye.set(resampleField(state.dye,state.width,state.height,W,H));time=Number.isFinite(state.time)?state.time:0;steps=Number.isFinite(state.steps)?state.steps:0;upload();return true;},
  diagnostics(){return{kind:'cpu',width:W,height:H,velocityWidth:W,velocityHeight:H,time,steps,targets:0};},dispose(){texture.dispose();}
 };return api;
}
