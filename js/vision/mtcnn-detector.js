import {predict} from './mtcnn-network.js';
import {imageScales,proposals,refine,suppress,validCrop} from './mtcnn-geometry.js';

const checksum=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function createDetector(tf){
  const response=await fetch('/assets/vision/manifest.json');if(!response.ok)throw new Error('模型清单暂时无法读取。');
  const manifest=await response.json(),download=await fetch(manifest.weights.file);if(!download.ok)throw new Error('模型文件暂时无法读取。');
  const bytes=await download.arrayBuffer();
  if(bytes.byteLength!==manifest.weights.bytes||await checksum(bytes)!==manifest.weights.sha256)throw new Error('模型文件未完整下载，请重试。');
  tf.wasm.setWasmPaths('/vendor/tfjs/');tf.wasm.setThreadsCount(1);await tf.setBackend('wasm');await tf.ready();
  const models={};
  try{
    for(const [name,model] of Object.entries(manifest.models)){
      models[name]={};for(const entry of model.weights)models[name][entry.name]=tf.tensor(new Float32Array(bytes,entry.offset,entry.length),entry.shape);
    }
  }catch(error){for(const weights of Object.values(models))Object.values(weights).forEach(weight=>weight.dispose());throw error;}
  return{memory:()=>tf.memory(),dispose(){for(const weights of Object.values(models))Object.values(weights).forEach(weight=>weight.dispose());},
    async detect({width,height,pixels},progress=()=>{}){
      if(!Number.isInteger(width)||!Number.isInteger(height)||width<24||height<24||width>512||height>512||!(pixels instanceof Uint8ClampedArray)||pixels.length!==width*height*4)throw new Error('请使用宽高均不少于 24 像素的照片。');
      const start=performance.now(),rgb=new Float32Array(width*height*3);
      for(let i=0,j=0;i<pixels.length;i+=4){const alpha=pixels[i+3]/255;for(let c=0;c<3;c++)rgb[j++]=(pixels[i+c]*alpha+255*(1-alpha)-127.5)/127.5;}
      const input=tf.tensor(rgb,[1,height,width,3]),scales=imageScales(width,height),all=[];
      try{
        for(let index=0;index<scales.length;index++){
          const level=scales[index];let outputs;
          try{
            outputs=tf.tidy(()=>predict(tf,tf.image.resizeBilinear(input,[level.height,level.width],false,true),models.pnet,'pnet'));
            const [prob,roi]=await Promise.all(outputs.map(output=>output.data()));
            const found=proposals(prob,roi,outputs[0].shape,level.scale,width,height,all.length,index);all.push(...found);level.candidates=found.length;
          }finally{outputs?.forEach(output=>output.dispose());}
          progress({phase:'scanning',completed:index+1,total:scales.length});
        }
        let rectangles=suppress(all.filter(validCrop),.7);const stages=[{name:'pnet',boxes:rectangles}];
        for(const [name,size,threshold] of [['rnet',24,.7],['onet',48,.8]]){
          const accepted=[];
          for(let offset=0;offset<rectangles.length;offset+=32){
            const batch=rectangles.slice(offset,offset+32);let outputs;
            try{
              outputs=tf.tidy(()=>{
                const crops=batch.map(({box})=>{const [x1,y1,x2,y2]=box.map(Math.trunc);return tf.image.resizeBilinear(tf.slice(input,[0,y1,x1,0],[1,y2-y1,x2-x1,3]),[size,size],false,true);});
                return predict(tf,tf.concat(crops),models[name],name);
              });
              const [prob,roi,points]=await Promise.all(outputs.map(output=>output.data()));accepted.push(...refine(batch,prob,roi,points,width,height,threshold));
            }finally{outputs?.forEach(output=>output.dispose());}
          }
          rectangles=suppress(accepted.filter(validCrop),name==='onet'?.3:.7);stages.push({name,boxes:rectangles});progress({phase:name,count:rectangles.length});
        }
        return{width,height,scales,rawCount:all.length,stages,milliseconds:performance.now()-start};
      }finally{input.dispose();}
    }
  };
}
