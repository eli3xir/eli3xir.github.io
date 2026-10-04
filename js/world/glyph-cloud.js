import * as THREE from 'three';
import {randomSequence} from '../audio/synth.js';

export const WORDS=['eli3xir','姜 山','北 邮','代码人生','VIBE'];
export function cleanWords(value){
 const text=String(value).normalize('NFC').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 return [...new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(text)].slice(0,12).map(part=>part.segment).join('');
}
export function sampleWords(text){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=320;const ctx=canvas.getContext('2d',{willReadFrequently:true});
 let size=256;const font=()=>`700 ${size}px "Cabinet Sans","Microsoft YaHei",sans-serif`;ctx.font=font();size*=Math.min(1,930/Math.max(1,ctx.measureText(text).width));ctx.font=font();
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(text,512,165);
 const pixels=ctx.getImageData(0,0,1024,320).data,points=[];
 for(let x=0;x<1024;x+=3)for(let y=0;y<320;y+=3)if(pixels[(y*1024+x)*4+3]>128)points.push([(x-512)*2.8/1024,(160-y)*2.8/1024]);
 return points;
}

// Exact critically damped spring step for a fixed target; no frame-rate-dependent Euler force.
export function createGlyphCloud(count=7200){
 const positions=new Float32Array(count*3),targets=new Float32Array(count*3),velocities=new Float32Array(count*3),seeds=new Float32Array(count),colors=new Float32Array(count*3);
 const random=randomSequence(6204);for(let i=0;i<count;i++){seeds[i]=random()*.5+.5;const c=new THREE.Color(0xe5b77d).lerp(new THREE.Color(0x87c9bc),seeds[i]);colors.set([c.r,c.g,c.b],i*3);}
 const geometry=new THREE.BufferGeometry(),attribute=new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage);geometry.setAttribute('position',attribute);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
 geometry.boundingBox=new THREE.Box3(new THREE.Vector3(-1.48,-.58,-.38),new THREE.Vector3(1.48,.58,.55));geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(),1.7);
 const material=new THREE.ShaderMaterial({uniforms:{uViewport:{value:1000},uDensity:{value:7200/count}},vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'attribute float aSeed;uniform float uViewport,uDensity;varying vec3 vColor;varying float vAlpha;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float scale=length(modelMatrix[0].xyz);gl_PointSize=clamp((.006+aSeed*.003)*scale*uViewport*projectionMatrix[1][1]/max(-mv.z,1.),1.,9.);vColor=color;vAlpha=(.38+aSeed*.32)*uDensity;}',
  fragmentShader:'varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;float glow=pow(1.-d,1.7);gl_FragColor=vec4(vColor*(1.+glow*.5),glow*vAlpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const points=new THREE.Points(geometry,material);points.name='glyph-cloud';points.frustumCulled=false;
 const bufferSize=new THREE.Vector2();points.onBeforeRender=renderer=>{material.uniforms.uViewport.value=renderer.getDrawingBufferSize(bufferSize).y;};
 let text='',active=false,disposed=false,error=0,uploads=0;
 const api={points,positions,targets,velocities,
  setText(value,{immediate=false}={}){
   if(disposed)return false;const next=cleanWords(value),samples=sampleWords(next);if(!next||!samples.length)return false;text=next;
   for(let i=0;i<count;i++){const p=samples[Math.floor(i*samples.length/count)],j=i*3;targets[j]=p[0]+(seeds[i]-.5)*.004;targets[j+1]=p[1];targets[j+2]=.035+seeds[i]*.14;}
   if(immediate){positions.set(targets);velocities.fill(0);attribute.needsUpdate=true;uploads++;active=false;error=0;}else active=true;return true;
  },
  scatter(){if(disposed)return;for(let i=0;i<count;i++){const j=i*3,a=seeds[i]*Math.PI*2;velocities[j]+=Math.cos(a)*8;velocities[j+1]+=Math.sin(a)*3.5;velocities[j+2]+=2+seeds[i]*3;}active=true;},
  step(dt,pointer=null,reduced=false){
   if(disposed)return;if(reduced){if(active||pointer){positions.set(targets);velocities.fill(0);attribute.needsUpdate=true;uploads++;}active=false;error=0;return;}
   if(!active&&!pointer)return;dt=Math.max(0,Math.min(dt,.05));const decay=Math.exp(-9*dt);let max=0,energy=0;
   for(let i=0;i<count;i++){const j=i*3;
    if(pointer){const dx=positions[j]-pointer.x,dy=positions[j+1]-pointer.y,d=Math.hypot(dx,dy);if(d<.32){const f=(1-d/.32)*42*dt,inv=1/Math.max(d,.025);velocities[j]+=dx*inv*f;velocities[j+1]+=dy*inv*f;velocities[j+2]+=f*.42;}}
    for(let axis=0;axis<3;axis++){const k=j+axis,d=positions[k]-targets[k],v=velocities[k],c=v+9*d;let next=targets[k]+(d+c*dt)*decay;velocities[k]=(v-9*c*dt)*decay;
     const lo=axis===0?-1.48:axis===1?-.58:-.38,hi=axis===0?1.48:axis===1?.58:.55;if(next<lo||next>hi){next=Math.max(lo,Math.min(hi,next));velocities[k]*=-.12;}positions[k]=next;max=Math.max(max,Math.abs(next-targets[k]));energy=Math.max(energy,Math.abs(velocities[k]));}
   }
   error=max;active=Boolean(pointer)||max>.0001||energy>.001;if(!active){positions.set(targets);velocities.fill(0);error=0;}attribute.needsUpdate=true;uploads++;
  },
  diagnostics(){return{text,count,active,error,uploads};},
  dispose(){disposed=true;active=false;}
 };api.setText(WORDS[0],{immediate:true});return api;
}
