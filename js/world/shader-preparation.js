// Three r185's compileAsync polls currentProgram, but cannot cancel its timers.
// Snapshot the renderer's program records so both sides of transparent materials
// are awaited, and stop polling before route disposal or context restoration.
export async function prepareShaders(renderer,scene,camera,target,{signal,timeout=4000}={}){
  const started=performance.now(),result=state=>({state,ms:performance.now()-started});
  const gl=renderer.getContext();
  if(signal?.aborted)return result('cancelled');
  if(gl.isContextLost())return result('context-lost');
  if(!renderer.extensions.has('KHR_parallel_shader_compile'))return result('unsupported');
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel();
  try{
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    // RenderPass draws into readBuffer: compiling against the default framebuffer
    // would prepare a different output-color/tone-mapping variant.
    try{
      renderer.setRenderTarget(target);const materials=renderer.compile(scene,camera);
      // Shared materials may already have render-side cache state from another
      // lighting/clipping setup. Rebind with actual draw parameters on first use;
      // the compiled programs remain cached. Home -> projects exercises this.
      materials.forEach(material=>{material.needsUpdate=true;});
    }
    finally{renderer.setRenderTarget(previous,face,level);}
    const programs=[...renderer.info.programs];
    if(programs.some(program=>typeof program.isReady!=='function'))return result('unsupported');
    return await new Promise(resolve=>{
      let timer,done=false;
      const finish=state=>{
        if(done)return;done=true;clearTimeout(timer);
        signal?.removeEventListener('abort',cancel);
        renderer.domElement.removeEventListener('webglcontextlost',lost);
        resolve({...result(state),programs:programs.length});
      };
      const cancel=()=>finish('cancelled'),lost=()=>finish('context-lost');
      const poll=()=>{
        if(signal?.aborted)return cancel();
        if(gl.isContextLost())return lost();
        if(performance.now()-started>=timeout)return finish('timeout');
        try{
          if(programs.every(program=>!program.program||program.isReady()))return finish('ready');
        }catch(error){console.warn('Shader preparation failed; continuing with normal rendering.',error);return finish('failed');}
        timer=setTimeout(poll,16);
      };
      signal?.addEventListener('abort',cancel,{once:true});
      renderer.domElement.addEventListener('webglcontextlost',lost,{once:true});
      poll();
    });
  }catch(error){
    console.warn('Shader preparation failed; continuing with normal rendering.',error);
    return result('failed');
  }
}

// A driver can still be using programs that are linking when a model leaves.
// Ordinarily its preparation promise is ready before disposal. Only the bounded
// wait's fallback needs a synchronous barrier before deleting those programs.
export function finishPrograms(renderer,programs){
  const gl=renderer.getContext();if(gl.isContextLost())return;
  for(const program of programs)if(program.program)gl.getProgramParameter(program.program,gl.LINK_STATUS);
}
