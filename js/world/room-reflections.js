import * as THREE from 'three';
import {FullScreenQuad} from 'three/addons/postprocessing/Pass.js';
import {SKINS} from '../experience/domain.js';

const cache=new WeakMap(),identity=new THREE.Matrix3();
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');

async function loadProbes(){
  if(typeof DecompressionStream!=='function')throw new Error('Reflection decompression unavailable');
  const response=await fetch('/assets/room/reflections/manifest.json',{signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Reflection manifest unavailable');const manifest=await response.json();
  const ids=Object.keys(SKINS),pixels=manifest.decodedBytes/4;
  if(manifest.version!==1||manifest.format!=='rgbe8-planar-cubeuv-gzip'||manifest.three!==THREE.REVISION||
    manifest.file!=='probes.bin'||manifest.bytes>2000000||manifest.decodedBytes!==3932160||manifest.entries?.length!==ids.length||
    !manifest.entries.every((entry,index)=>entry.id===ids[index]&&entry.width===384&&entry.height===512&&entry.pixels===196608&&entry.pixelOffset===index*196608))throw new Error('Reflection manifest mismatch');
  const download=await fetch('/assets/room/reflections/probes.bin',{signal:AbortSignal.timeout(20000)});
  if(!download.ok)throw new Error('Reflection data unavailable');const packed=await download.arrayBuffer();
  if(packed.byteLength!==manifest.bytes||await digest(packed)!==manifest.sha256)throw new Error('Reflection download mismatch');
  const bytes=new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  if(bytes.length!==manifest.decodedBytes||await digest(bytes)!==manifest.decodedSha256)throw new Error('Reflection payload mismatch');
  const exponents=new Map(),textures=new Map();
  for(const entry of manifest.entries){
    const data=new Uint16Array(entry.pixels*4);
    for(let i=0;i<entry.pixels;i++){
      const index=entry.pixelOffset+i,exponent=bytes[pixels*3+index];data[i*4+3]=0x3c00;
      if(exponent===0)continue;if(exponent>143)throw new Error('Invalid reflection radiance');
      if(!exponents.has(exponent))exponents.set(exponent,Uint16Array.from({length:256},(_,value)=>THREE.DataUtils.toHalfFloat(value/255*2**(exponent-128))));
      const lookup=exponents.get(exponent);for(let channel=0;channel<3;channel++)data[i*4+channel]=lookup[bytes[channel*pixels+index]];
    }
    const texture=new THREE.DataTexture(data,entry.width,entry.height,THREE.RGBAFormat,THREE.HalfFloatType);
    texture.name='room-probe-'+entry.id;texture.mapping=THREE.CubeUVReflectionMapping;texture.colorSpace=THREE.LinearSRGBColorSpace;
    texture.magFilter=texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;textures.set(entry.id,texture);
  }
  return{textures,manifest};
}

function createMixer(renderer,{textures,manifest}){
  const options={type:THREE.HalfFloatType,depthBuffer:false,stencilBuffer:false,colorSpace:THREE.LinearSRGBColorSpace};
  const output=new THREE.WebGLRenderTarget(384,512,options),snapshot=output.clone();
  output.texture.mapping=THREE.CubeUVReflectionMapping;output.texture.name='room-reflection-current';
  const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,
    uniforms:{from:{value:null},to:{value:null},amount:{value:0}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:'uniform sampler2D from,to;uniform float amount;varying vec2 vUv;void main(){gl_FragColor=mix(texture2D(from,vUv),texture2D(to,vUv),amount);}'
  });
  const quad=new FullScreenQuad(material),viewport=new THREE.Vector4(),scissor=new THREE.Vector4();
  let selected=null,target=null,progress=1,draws=0,weights=new Map();const checked=new Set();
  const currentWeights=()=>{
    if(!target)return new Map([[selected,1]]);
    const current=new Map([...weights].map(([id,value])=>[id,value*(1-progress)]));
    current.set(target,(current.get(target)||0)+progress);return current;
  };
  const render=(a,b,amount,destination)=>{
    if(renderer.getContext().isContextLost())return;
    const old=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel(),test=renderer.getScissorTest(),xr=renderer.xr.enabled;
    renderer.getViewport(viewport);renderer.getScissor(scissor);
    try{
      renderer.xr.enabled=false;material.uniforms.from.value=a;material.uniforms.to.value=b;material.uniforms.amount.value=amount;
      renderer.setRenderTarget(destination);renderer.setScissorTest(false);
      if(!checked.has(destination)){
        const gl=renderer.getContext();if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Reflection framebuffer unavailable');checked.add(destination);
      }
      quad.render(renderer);draws++;
    }finally{renderer.setRenderTarget(old,face,level);renderer.setViewport(viewport);renderer.setScissor(scissor);renderer.setScissorTest(test);renderer.xr.enabled=xr;}
  };
  const api={texture:output.texture,manifest,
    set(id){id=textures.has(id)?id:'default';if(id===selected&&!target)return;const texture=textures.get(id);render(texture,texture,1,output);selected=id;target=null;progress=1;},
    begin(id){id=textures.has(id)?id:'default';weights=currentWeights();render(output.texture,output.texture,0,snapshot);target=id;progress=0;},
    blend(value){if(!target)return;value=THREE.MathUtils.clamp(value,0,1);if(value===progress)return;render(snapshot.texture,textures.get(target),value,output);progress=value;if(value===1){selected=target;target=null;}},
    diagnostics(){return{selected,target,progress,draws,probes:textures.size,width:output.width,height:output.height};}
  };
  const restore=()=>{
    checked.clear();
    if(!target){const texture=textures.get(selected);render(texture,texture,1,output);return;}
    // Render targets have no CPU image after context loss. Retain just the five
    // source weights, including interrupted blends, and rebuild the snapshot.
    // Half-float intermediate rounding may differ by a few ULPs on restoration.
    const sources=[...weights].filter(([,weight])=>weight>0).map(([id,weight])=>[textures.get(id).image.data,weight]);
    const data=new Uint16Array(output.width*output.height*4);
    for(let i=0;i<data.length;i++){
      let value=0;for(const [source,weight] of sources)value+=THREE.DataUtils.fromHalfFloat(source[i])*weight;
      data[i]=THREE.DataUtils.toHalfFloat(value);
    }
    const texture=new THREE.DataTexture(data,output.width,output.height,THREE.RGBAFormat,THREE.HalfFloatType);
    texture.colorSpace=THREE.LinearSRGBColorSpace;texture.needsUpdate=true;
    try{render(texture,texture,1,snapshot);render(snapshot.texture,textures.get(target),progress,output);}
    finally{texture.dispose();}
  };
  // Upload and compile during room preparation, before visitors can change skin.
  try{textures.forEach(texture=>renderer.initTexture(texture));api.set('default');api.begin('default');api.blend(1);
    renderer.domElement.addEventListener('webglcontextrestored',restore);return api;}
  catch(error){output.dispose();snapshot.dispose();material.dispose();throw error;}
}

export function loadRoomReflections(renderer){
  if(!cache.has(renderer))cache.set(renderer,loadProbes().then(probes=>{
    try{return createMixer(renderer,probes);}catch(error){probes.textures.forEach(texture=>texture.dispose());throw error;}
  }).catch(error=>{cache.delete(renderer);throw error;}));
  return cache.get(renderer);
}

export function bindRoomReflection(material,texture,rotation=identity){
  if(!material.isMeshStandardMaterial)return;
  material.envMap=texture;material.envMapIntensity=.45;
  material.onBeforeCompile=shader=>{
    shader.uniforms.uRoomReflectionRotation={value:rotation};
    shader.fragmentShader='uniform mat3 uRoomReflectionRotation;\n'+shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',
      THREE.ShaderChunk.envmap_physical_pars_fragment.replaceAll('envMapRotation *','uRoomReflectionRotation *'));
    if(material.lightMap)shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',
      THREE.ShaderChunk.lights_fragment_maps.replace('iblIrradiance += getIBLIrradiance( geometryNormal );',''));
  };
  material.customProgramCacheKey=()=>`room-reflection-v1-${Boolean(material.lightMap)}`;material.needsUpdate=true;
}
