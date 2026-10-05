export const VISION_BEATS=8;
const sample={label:'NASA / Eileen Collins',url:'https://www.flickr.com/photos/nasacommons/16504233985/',id:'sample'};
export function createVision(){
  const state={phase:'empty',busy:false,image:null,imageRevision:0,source:null,report:null,serial:0,progress:0,stage:0,startedAt:0,beat:.5,error:null,scan:null,memory:null};
  const listeners=new Set();let worker=null,job=0,imageJob=0,timer=null,flight=null,disposed=false,stamp='';
  const notify=()=>listeners.forEach(fn=>fn(state));
  const release=()=>{clearTimeout(timer);timer=null;worker?.terminate();worker=null;job++;};
  const fail=message=>{if(disposed)return;release();state.busy=false;state.error=message;state.phase='error';flight=null;notify();};
  const install=(canvas,source)=>{
    if(disposed)return;state.image=canvas;state.source=source;state.imageRevision++;state.report=null;state.progress=state.stage=0;state.error=null;state.phase='ready';state.busy=false;notify();
  };
  const model={state,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    async loadFile(file,source={label:file.name||'本地照片',id:'local'}){
      if(disposed||state.busy)return false;
      const ticket=++imageJob;state.phase='image-loading';state.error=null;notify();let bitmap;
      try{
        if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('请选择 PNG、JPEG 或 WebP 格式的照片。');
        if(file.size>20*1024*1024)throw new Error('请选择不超过 20 MB 的照片。');
        bitmap=await createImageBitmap(file);
        if(bitmap.width<24||bitmap.height<24||bitmap.width*bitmap.height>32000000)throw new Error('照片需至少 24×24 像素，且不超过 3200 万像素。');
        const ratio=Math.min(1,512/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
        if(Math.min(canvas.width,canvas.height)<24)throw new Error('照片过窄，请选取更接近人脸区域的画面。');
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
        if(ticket!==imageJob||disposed)return false;install(canvas,source);return true;
      }catch(error){if(ticket===imageJob&&!disposed){state.phase='error';state.error=error.message||'这张照片无法读取，请换一张。';notify();}return false;}
      finally{bitmap?.close();}
    },
    async loadSample(){
      if(disposed||state.busy||state.phase==='image-loading'||state.source?.id==='sample'&&state.image)return;
      const ticket=++imageJob;state.phase='image-loading';state.error=null;notify();
      try{const response=await fetch('/assets/vision/astronaut.png',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('示例照片暂时无法读取，可以选择本地照片。');const blob=await response.blob();if(ticket!==imageJob||disposed)return;state.phase='empty';await model.loadFile(blob,sample);}
      catch(error){if(ticket===imageJob&&!disposed){state.phase='error';state.error=error.message||'示例照片暂时无法读取。';notify();}}
    },
    blank(){
      if(disposed||state.busy)return;imageJob++;const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#eee8d8';ctx.fillRect(0,0,512,512);install(canvas,{label:'空白试片',id:'blank'});
    },
    run(timing){
      if(disposed||state.busy||!state.image||state.phase==='image-loading')return false;
      state.busy=true;state.error=null;state.phase='loading';state.scan=null;notify();const id=++job;
      try{
        worker||=new Worker('/js/vision/worker.js');
        worker.onerror=()=>{if(id===job)fail('检测引擎未能启动，请重试。');};
        worker.onmessage=({data})=>{
          if(disposed||id!==job||data.job!==id)return;
          if(data.type==='error'){fail(data.message);return;}
          if(data.type==='progress'){state.scan=data;state.phase=data.phase;notify();return;}
          if(data.type!=='result')return;
          clearTimeout(timer);timer=null;state.report=data.report;state.memory=data.memory;state.serial++;state.progress=state.stage=0;state.phase='playing';
          const options=timing();flight={start:options.now+options.delay,beat:options.beat};state.startedAt=flight.start;state.beat=flight.beat;stamp='';notify();model.advance(options.now,options.reduced);
        };
        const pixels=state.image.getContext('2d').getImageData(0,0,state.image.width,state.image.height).data;
        timer=setTimeout(()=>{if(id===job)fail('这次检测等待较久，请重试或换一张照片。');},45000);
        worker.postMessage({type:'detect',job:id,width:state.image.width,height:state.image.height,pixels},[pixels.buffer]);return true;
      }catch(error){fail(error.message||'检测暂时无法开始。');return false;}
    },
    cancel(){if(disposed)return;if(state.phase==='playing'){job++;}else release();flight=null;state.busy=false;state.phase=state.report?'cancelled':'ready';notify();},
    advance(now,reduced=false){
      if(!flight||disposed)return;
      state.progress=reduced?VISION_BEATS:Math.min(VISION_BEATS,Math.max(0,(now-flight.start)/flight.beat));
      state.stage=Math.min(3,Math.max(0,Math.floor((state.progress-2)/2)+1));
      if(state.progress===VISION_BEATS){state.phase='done';state.busy=false;flight=null;}
      const next=state.phase+':'+state.stage;if(next!==stamp){stamp=next;notify();}
    },
    dispose(){disposed=true;imageJob++;release();flight=null;state.busy=false;state.image=null;listeners.clear();}
  };
  return model;
}
