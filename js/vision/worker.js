/* Classic bootstrap keeps the pinned upstream UMD bundles intact. Algorithm
 * modules use dynamic import; no images or results leave this Worker. */
let detector=null,busy=false;
self.onmessage=async({data})=>{
  if(busy||data.type!=='detect')return;busy=true;
  try{
    if(!detector){
      if(!self.tf)importScripts('/vendor/tfjs/tf-core.min.js');
      if(!self.tf.wasm)importScripts('/vendor/tfjs/tf-backend-wasm.min.js');
      const {createDetector}=await import('./mtcnn-detector.js');detector=await createDetector(self.tf);
    }
    const report=await detector.detect(data,progress=>self.postMessage({type:'progress',job:data.job,...progress}));
    self.postMessage({type:'result',job:data.job,report,memory:detector.memory()});
  }catch(error){self.postMessage({type:'error',job:data.job,message:error.message||'检测暂时无法完成。'});}
  finally{busy=false;}
};
