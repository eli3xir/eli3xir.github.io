import {wordControls} from './word-controls.js';
import {cleanWords} from '../world/glyph-cloud.js';
import {nextBeatDelay} from './domain.js';
export function bindPartext(section,main,{world,score,signal}){
 const model=world?.model,frame=main.querySelector('.experiment-frame');let selected='eli3xir',visible=false;
 const options=()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;return{now:performance.now()/1000,delay:score.audible&&!reduced?nextBeatDelay(score.time):0,reduced};};
 const send=()=>frame.contentWindow?.postMessage({type:'word-text',text:selected},location.origin);
 const change=(text,echo=true)=>{selected=text;const opt=options();model?.setText?.(text,opt);if(world)world.moving=1;score.cue('hover',opt.delay);if(echo)send();};
 const scatter=()=>{const opt=options();model?.scatter?.(opt);if(world)world.moving=1;score.cue('hover',opt.delay);};
 const controls=wordControls({signal,onText:change,onScatter:scatter});section.querySelector('.hero-note').remove();section.querySelector('.explore-button').before(controls.element);section.querySelector('.explore-button').textContent='带着这句话，继续玩 ↓';
 controls.element.querySelector('.word-status').textContent='「eli3xir」· 排成一句话，再让它散开。';
 if(!model)controls.element.querySelector('[data-word-scatter]').hidden=true;
 if(model){model.pick=ray=>model.hitTest(ray)?'scatter':null;model.onPick=scatter;}
 const visibility=()=>frame.contentWindow?.postMessage({type:'word-visibility',active:visible&&!document.hidden},location.origin);
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibility();},{rootMargin:'80px'});observer.observe(frame);document.addEventListener('visibilitychange',visibility,{signal});
 frame.addEventListener('load',()=>{send();visibility();},{signal});
 addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(event.data?.type==='word-ready'){send();visibility();}
  if(event.data?.type==='word-changed'&&typeof event.data.text==='string'){const text=cleanWords(event.data.text);if(text){change(text,false);controls.setText(text);}}
 },{signal});
 document.fonts.load('700 180px "Cabinet Sans"').then(()=>{if(!signal.aborted){model?.setText?.(selected,{...options(),delay:0});if(world)world.moving=1;}});
 signal.addEventListener('abort',()=>{observer.disconnect();visible=false;visibility();if(model)model.onPick=null;},{once:true});
}
