// Native progress/load events keep transfer completion and cancellation distinct.
export const downloadRoom=progress=>downloadBinary('/assets/room/room.glb',progress);

export async function downloadBinary(url,progress=()=>{}) {
  let received=0,total=0;
  const result=new Uint8Array(await new Promise((resolve,reject)=>{
    const request=new XMLHttpRequest();let idle,reason,lastProgress=-1;
    const cleanup=()=>{clearTimeout(idle);request.onload=request.onerror=request.onabort=request.ontimeout=request.onprogress=null;};
    const fail=error=>{cleanup();reject(error);};
    const timeout=()=>{reason=new DOMException('资源下载暂时没有进展','TimeoutError');request.abort();};
    const resetIdle=()=>{clearTimeout(idle);idle=setTimeout(timeout,30000);};
    request.open('GET',url);request.responseType='arraybuffer';request.timeout=120000;
    request.onprogress=event=>{
      if(event.loaded>received){received=event.loaded;resetIdle();}
      total=event.lengthComputable?event.total:0;
      const fraction=total?Math.min(.99,received/total):0;
      if(fraction-lastProgress>=.05){progress(fraction);lastProgress=fraction;}
    };
    request.onload=()=>{
      if(request.status<200||request.status>=300){fail(new Error(`资源 HTTP ${request.status}`));return;}
      const buffer=request.response;cleanup();resolve(buffer);
    };
    request.onerror=()=>fail(new Error('资源下载失败'));
    request.ontimeout=()=>fail(new DOMException('资源下载超时','TimeoutError'));
    request.onabort=()=>fail(reason||new DOMException('资源下载已中止','AbortError'));
    resetIdle();request.send();
  }));
  progress(1);return result.buffer;
}
