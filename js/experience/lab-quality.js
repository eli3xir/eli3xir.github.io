import {visualQuality,qualityRatio,setVisualQuality,watchVisualQuality,validQuality} from './visual-quality.js';

// Ask the current host before creating shaders, including experiments started
// later by the reduced-motion gate. The timeout also permits standalone embeds.
if(parent!==window){
  await new Promise(resolve=>{
    const timeout=setTimeout(resolve,1000);
    addEventListener('message',event=>{
      if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='visual-quality'||!validQuality(event.data.value))return;
      setVisualQuality(event.data.value,{persist:false});clearTimeout(timeout);resolve();
    });
    parent.postMessage({type:'visual-quality-request'},location.origin);
  });
}

export function configureLabQuality(renderer,{mobile=1.3,desktop=1.6,shadows=false}={}){
  let redraw=()=>{};
  const apply=()=>{
    const ratio=qualityRatio({mobile,desktop}),enabled=shadows&&visualQuality()!=='low';
    if(renderer.getPixelRatio()===ratio&&renderer.shadowMap.enabled===enabled)return;
    if(renderer.getPixelRatio()!==ratio)renderer.setPixelRatio(ratio);
    renderer.shadowMap.enabled=enabled;
    // Render the existing scene; never advance or reconstruct its simulation.
    redraw();
  };
  apply();watchVisualQuality(apply);addEventListener('resize',apply);
  return callback=>{redraw=callback;};
}
