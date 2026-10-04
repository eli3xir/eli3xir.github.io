import * as THREE from 'three';
import {fluidVertex,fluidKernels} from './fluid-kernels.js';
import {VELOCITY_WIDTH as W,VELOCITY_HEIGHT as H,DYE_WIDTH as DW,DYE_HEIGHT as DH,initialFluid,pigment,resampleField,validFluidState} from './fluid-state.js';
export function createGpuFluid(renderer){
 if(!renderer.extensions.has('EXT_color_buffer_float'))return null;
 const options={type:THREE.FloatType,format:THREE.RGBAFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,stencilBuffer:false};
 const targets=[],target=(w,h)=>{const r=new THREE.WebGLRenderTarget(w,h,options);targets.push(r);return r;};
 const pair=(w,h)=>({read:target(w,h),write:target(w,h),swap(){[this.read,this.write]=[this.write,this.read];}});
 const velocity=pair(W,H),pressure=pair(W,H),dye=pair(DW,DH),forward=target(DW,DH),divergence=target(W,H),curl=target(W,H),scene=new THREE.Scene(),camera=new THREE.Camera();
 const uniforms={source:{value:null},velocity:{value:null},auxiliary:{value:null},pixel:{value:new THREE.Vector2(1/W,1/H)},sourcePixel:{value:new THREE.Vector2(1/W,1/H)},dt:{value:1/60},fade:{value:1},center:{value:new THREE.Vector2()},impulse:{value:new THREE.Vector2()},ink:{value:new THREE.Vector3()},radius:{value:.035},amount:{value:1},isVelocity:{value:0}};
 const materials=Object.fromEntries(Object.entries(fluidKernels).map(([name,fragmentShader])=>[name,new THREE.ShaderMaterial({vertexShader:fluidVertex,fragmentShader,uniforms,depthTest:false,depthWrite:false,toneMapped:false})]));
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),materials.copy);quad.frustumCulled=false;scene.add(quad);let disposed=false,steps=0,time=0;
 function withState(action){const old=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel(),xr=renderer.xr.enabled,auto=renderer.autoClear;renderer.xr.enabled=false;renderer.autoClear=false;try{return action();}finally{renderer.setRenderTarget(old,face,level);renderer.xr.enabled=xr;renderer.autoClear=auto;}}
 function run(name,out,source=null,auxiliary=null){uniforms.source.value=source;uniforms.auxiliary.value=auxiliary;quad.material=materials[name];renderer.setRenderTarget(out);renderer.render(scene,camera);}
 function upload(out,data,width,height){const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);texture.needsUpdate=true;uniforms.fade.value=1;run('copy',out,texture);texture.dispose();}
 function reset(){withState(()=>{upload(velocity.read,initialFluid(W,H,true),W,H);upload(dye.read,initialFluid(DW,DH),DW,DH);upload(pressure.read,new Float32Array(W*H*4),W,H);});steps=0;time=0;}
 const api={kind:'gpu',get texture(){return dye.read.texture;},reset,
  clear(){withState(()=>{upload(velocity.read,new Float32Array(W*H*4),W,H);upload(dye.read,new Float32Array(DW*DH*4),DW,DH);upload(pressure.read,new Float32Array(W*H*4),W,H);});},
  inject(x,y,dx,dy,color=1,amount=.8,radius=.035){if(disposed)return;withState(()=>{uniforms.center.value.set(x,y);uniforms.impulse.value.set(dx,dy);uniforms.ink.value.fromArray(pigment(color));uniforms.radius.value=radius;uniforms.amount.value=amount;uniforms.isVelocity.value=1;run('splat',velocity.write,velocity.read.texture);velocity.swap();uniforms.isVelocity.value=0;run('splat',dye.write,dye.read.texture);dye.swap();});},
  step(dt){if(disposed||dt<=0)return;dt=Math.min(dt,1/30);withState(()=>{
   uniforms.dt.value=dt;uniforms.sourcePixel.value.set(1/W,1/H);uniforms.velocity.value=velocity.read.texture;uniforms.fade.value=Math.exp(-dt*.16);run('advect',velocity.write,velocity.read.texture);velocity.swap();
   run('curl',curl,velocity.read.texture);run('confinement',velocity.write,velocity.read.texture,curl.texture);velocity.swap();run('divergence',divergence,velocity.read.texture);
   uniforms.fade.value=.8;run('copy',pressure.write,pressure.read.texture);pressure.swap();for(let i=0;i<36;i++){run('pressure',pressure.write,pressure.read.texture,divergence.texture);pressure.swap();}
   run('project',velocity.write,velocity.read.texture,pressure.read.texture);velocity.swap();uniforms.sourcePixel.value.set(1/DW,1/DH);uniforms.velocity.value=velocity.read.texture;uniforms.fade.value=1;run('advect',forward,dye.read.texture);uniforms.fade.value=Math.exp(-dt*.024);run('correct',dye.write,dye.read.texture,forward.texture);dye.swap();
  });steps++;time+=dt;},
  snapshot(){const state={width:DW,height:DH,velocity:new Float32Array(W*H*4),pressure:new Float32Array(W*H*4),dye:new Float32Array(DW*DH*4),time,steps};withState(()=>{renderer.readRenderTargetPixels(velocity.read,0,0,W,H,state.velocity);renderer.readRenderTargetPixels(pressure.read,0,0,W,H,state.pressure);renderer.readRenderTargetPixels(dye.read,0,0,DW,DH,state.dye);});return state;},
  restore(state){if(disposed||!validFluidState(state))return false;withState(()=>{upload(velocity.read,state.velocity,W,H);upload(pressure.read,state.pressure,W,H);upload(dye.read,resampleField(state.dye,state.width,state.height,DW,DH),DW,DH);});time=Number.isFinite(state.time)?state.time:0;steps=Number.isFinite(state.steps)?state.steps:0;return true;},
  diagnostics(){return{kind:'gpu',width:DW,height:DH,velocityWidth:W,velocityHeight:H,time,steps,targets:targets.length};},
  dispose(){if(disposed)return;disposed=true;targets.forEach(t=>t.dispose());Object.values(materials).forEach(m=>m.dispose());quad.geometry.dispose();}
 };
 // An advertised extension alone does not prove this framebuffer format works.
 const complete=withState(()=>{const gl=renderer.getContext();renderer.setRenderTarget(dye.read);return gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;});
 if(!complete){api.dispose();return null;}reset();
 // Prime the first pointer/drop kernel in scratch storage without touching the
 // velocity, pressure, dye or simulation clock that will be handed off.
 withState(()=>{uniforms.amount.value=0;run('splat',forward,dye.read.texture);uniforms.amount.value=1;});return api;
}
