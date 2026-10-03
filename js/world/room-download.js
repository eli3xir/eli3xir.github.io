// Allow a slow, progressing model download while bounding stalled connections.
export async function downloadRoom(progress=()=>{}) {
  const controller=new AbortController();
  let idleTimer,reader;
  const abort=()=>controller.abort(new DOMException('房间下载暂时没有进展','TimeoutError'));
  const resetIdle=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(abort,30000);};
  const totalTimer=setTimeout(abort,120000);
  resetIdle();
  try{
    const response=await fetch('/assets/room/room.glb',{signal:controller.signal});
    if(!response.ok)throw new Error(`房间模型 HTTP ${response.status}`);
    const length=Number(response.headers.get('content-length'));
    // An encoded Content-Length describes compressed bytes, not the read stream.
    const total=response.headers.get('content-encoding')?0:Number.isFinite(length)&&length>0?length:0;
    if(!response.body)return await response.arrayBuffer();
    reader=response.body.getReader();const chunks=[];let received=0,lastProgress=-1;
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      if(!value.byteLength)continue;
      chunks.push(value);received+=value.byteLength;resetIdle();
      const fraction=total?Math.min(.99,received/total):0;
      if(fraction-lastProgress>=.05){progress(fraction);lastProgress=fraction;}
    }
    const result=new Uint8Array(received);let offset=0;
    for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}
    progress(1);return result.buffer;
  }catch(error){controller.abort();throw error;}
  finally{clearTimeout(idleTimer);clearTimeout(totalTimer);reader?.releaseLock();}
}
