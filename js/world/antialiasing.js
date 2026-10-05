import {FXAAPass} from 'three/addons/postprocessing/FXAAPass.js';

export function createAntialiasing(renderer,composer){
  const pass=new FXAAPass(),sceneTarget=composer.renderTarget2;
  let supported=[],samples=0;
  function refresh(){
    const gl=renderer.getContext();
    // The composer uses RGBA16F with a DEPTH_COMPONENT24 renderbuffer. A
    // context-wide MAX_SAMPLES alone does not prove either format supports it.
    try{
      const color=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES)||[]);
      const depth=Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.DEPTH_COMPONENT24,gl.SAMPLES)||[]);
      supported=color.filter(n=>n>=2&&n<=renderer.capabilities.maxSamples&&depth.includes(n)).sort((a,b)=>a-b);
    }catch{supported=[];}
  }
  refresh();
  return{
    pass,sceneTarget,refresh,
    get mode(){return samples?`msaa-${samples}`:'fxaa';},
    get supported(){return [...supported];},
    apply(quality,compact){
      const budget=quality==='low'?0:quality==='high'||!compact?4:2;
      samples=supported.filter(n=>n<=budget).at(-1)||0;
      for(const [target,count] of [[composer.renderTarget1,0],[sceneTarget,samples]]){
        if(target.samples!==count){target.samples=count;target.dispose();}
      }
      // Only the scene buffer is multisampled. Output + film make two swaps,
      // preserving this assignment on every MSAA frame. FXAA uses single-
      // sample buffers; reset their roles when changing quality or resizing.
      sceneTarget.resolveDepthBuffer=false;
      composer.writeBuffer=composer.renderTarget1;composer.readBuffer=sceneTarget;
      pass.enabled=samples===0;
    }
  };
}
