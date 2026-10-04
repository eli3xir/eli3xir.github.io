import {DataUtils} from '../vendor/three/three.core.min.js';

export function encodeReflections(buffers){
 const pixels=buffers.reduce((count,bytes)=>count+bytes.length/8,0),packed=new Uint8Array(pixels*4);
 let pixel=0,totalError=0,maxError=0,peak=0;
 for(const bytes of buffers){
  const half=new Uint16Array(bytes.buffer,bytes.byteOffset,bytes.length/2);
  for(let i=0;i<half.length;i+=4,pixel++){
   const rgb=[0,1,2].map(channel=>DataUtils.fromHalfFloat(half[i+channel])),max=Math.max(...rgb);
   if(!Number.isFinite(max)||Math.min(...rgb)<0)throw new Error('Invalid captured radiance');
   peak=Math.max(peak,max);if(!max)continue;
   const exponent=Math.ceil(Math.log2(max)),scale=255/2**exponent;
   if(exponent+128<1||exponent+128>143)throw new Error('Captured radiance exceeds reflection encoding');
   packed[pixels*3+pixel]=exponent+128;
   for(let channel=0;channel<3;channel++){
    const value=Math.round(rgb[channel]*scale),error=Math.abs(value/scale-rgb[channel]);
    packed[pixels*channel+pixel]=value;totalError+=error;maxError=Math.max(maxError,error/max);
   }
  }
 }
 return{packed,error:{meanAbsolute:totalError/(pixels*3),maxRelativeToPixelPeak:maxError,capturedPeak:peak}};
}
