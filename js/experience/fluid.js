import {fluidControls} from './fluid-controls.js';
import {nextBeatDelay} from './domain.js';
export function bindFluid(section,main,{world,score,signal}){
 const model=world?.model,frame=main.querySelector('.experiment-frame');let selected=1,paused=false,ready=false,visible=false,owner='hero',epoch=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const post=data=>{const f=data.snapshot?.field;frame.contentWindow?.postMessage(data,location.origin,f?[f.velocity.buffer,f.pressure.buffer,f.dye.buffer]:[]);};
 const controls=fluidControls({signal,onColor:color=>{selected=color;model?.select(color);controls.set({color,paused});},
  onDrop:uv=>{if(!model)return;model.addDrop({uv,delay:score.audible&&!reduced()?nextBeatDelay(score.time):0,reduced:reduced()});world.moving=1;},
  onClear:()=>{model?.clear();controls.announce('清水已备好，再给一点颜色。');if(world)world.moving=1;},
  onPause:value=>{paused=value;model?.setPaused(value);controls.set({color:selected,paused});if(world)world.moving=1;}
 });
 section.querySelector('.hero-note').remove();section.querySelector('.explore-button').before(controls.element);section.querySelector('.explore-button').textContent='带着这片颜色，继续搅动 ↓';main.querySelector('.experiment-intro p').textContent='按住玻璃里的颜色，轻轻拖动；每次按下换一种颜色。也可用方向键选位置、空格滴色。';
 const update=state=>{selected=state.color;paused=state.paused;controls.set(state);};
 if(model){model.onState=update;model.onDrop=()=>{score.cue('hover');world.actor.react();};model.onPick=hit=>{if(hit.kind==='color'){selected=hit.index;model.select(selected);}else model.addDrop({uv:hit.uv,delay:score.audible&&!reduced()?nextBeatDelay(score.time):0,reduced:reduced()});world.moving=1;};}
 else{controls.element.querySelector('.fluid-actions').hidden=true;controls.announce('先选颜色，再到下方画布搅动。');}
 const visibility=()=>{if(owner==='hero')model?.setActive(!document.hidden);if(!ready)return;const active=visible&&!document.hidden;
  if(active&&owner==='hero'){owner='frame';epoch++;model?.setActive(false);post({type:'fluid-owner',active:true,epoch,snapshot:model?.snapshot(),color:selected,paused});}
  else if(!active&&owner==='frame'){owner='transfer';epoch++;post({type:'fluid-owner',active:false,epoch});}
  else if(!active&&owner==='hero')post({type:'fluid-owner',active:false,epoch});
 };
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.15;visibility();},{threshold:[0,.15]});observer.observe(frame);document.addEventListener('visibilitychange',visibility,{signal});
 addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow)return;const data=event.data;
  if(data?.type==='fluid-ready'){ready=true;visibility();}
  if(data?.type==='fluid-settings'&&data.epoch===epoch&&owner==='frame'&&Number.isInteger(data.color)&&data.color>=0&&data.color<5){update(data);model?.select(data.color);model?.setPaused(data.paused);}
  if(data?.type==='fluid-state'&&data.epoch===epoch&&owner==='transfer'){model?.restore(data.snapshot);owner='hero';model?.setActive(!document.hidden);update(data.snapshot);if(world)world.moving=1;visibility();}
 },{signal});
 signal.addEventListener('abort',()=>{observer.disconnect();post({type:'fluid-owner',active:false,epoch:++epoch});if(model)model.onPick=model.onState=model.onDrop=null;},{once:true});
}
