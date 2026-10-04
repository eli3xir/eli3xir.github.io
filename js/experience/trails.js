import {trailsControls} from './trails-controls.js';
import {createExposure} from '../world/star-exposure.js';
import {nextBeatDelay} from './domain.js';
export function bindTrails(section,main,{world,score,signal}){
 const model=world?.model,frame=main.querySelector('.experiment-frame'),fallback=createExposure();let ready=false,visible=false,owner='hero',epoch=0,pending=[];
 const state=()=>model?.diagnostics()||fallback.state,reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches,post=data=>frame.contentWindow?.postMessage(data,location.origin);
 const perform=(action,value)=>{if(owner==='transfer'){pending.push({action,value});pending=pending.slice(-8);return;}if(owner==='frame'){post({type:'trails-action',epoch,action,value});if(action==='launch')score.cue('hover',value.wait);return;}
  const target=model||fallback;if(action==='select')target.select(value);if(action==='pause')target.pause(value);if(action==='reset')target.reset();if(action==='aim')target.aim(...value);if(action==='launch'&&target.launch(model?value:{...value,reduced:true}))score.cue('hover',value.wait);controls.set(state());if(world)world.moving=1;
 };
 const launch=()=>perform('launch',{wait:score.audible&&!reduced()?nextBeatDelay(score.time):0,reduced:reduced()});
 const controls=trailsControls({signal,onSelect:value=>perform('select',value),onLaunch:launch,onPause:value=>perform('pause',value),onReset:()=>perform('reset')});
 section.querySelector('.hero-note').remove();section.querySelector('.explore-button').before(controls.element);section.querySelector('.explore-button').textContent='带着这次曝光，靠近看看 ↓';main.querySelector('.experiment-intro p').textContent='按住拖动移动天极，或用方向键取景、空格开快门。星轨共享同一角速度；偶有流星落进这张照片。';controls.set(state());
 if(model){model.onState=controls.set;model.onComplete=()=>{score.cue('reveal');world.actor.react();};model.onPick=hit=>{if(hit.kind==='shutter')launch();else perform('aim',[hit.point[0]/1.42,hit.point[1]/1.42]);};}
 const visibility=()=>{if(owner==='hero')model?.setActive(!document.hidden);if(!ready)return;const active=visible&&!document.hidden;if(active&&owner==='hero'){epoch++;owner='frame';model?.setActive(false);post({type:'trails-owner',active:true,epoch,snapshot:model?.snapshot()||fallback.snapshot()});}else if(!active&&owner==='frame'){epoch++;owner='transfer';post({type:'trails-owner',active:false,epoch});}};
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.15;visibility();},{threshold:[0,.15]});observer.observe(frame);document.addEventListener('visibilitychange',visibility,{signal});
 addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow)return;const data=event.data;if(data?.type==='trails-ready'){ready=true;visibility();}if(data?.type==='trails-settings'&&data.epoch===epoch&&owner==='frame'){if((model||fallback).restore(data.snapshot)){controls.set(state());if(world)world.moving=1;}}
  if(data?.type==='trails-state'&&data.epoch===epoch&&owner==='transfer'){if(model)model.restore(data.snapshot);else fallback.restore(data.snapshot);owner='hero';model?.setActive(!document.hidden);controls.set(state());if(world)world.moving=1;visibility();const actions=pending;pending=[];actions.forEach(({action,value})=>perform(action,value));}},{signal});
 signal.addEventListener('abort',()=>{observer.disconnect();post({type:'trails-owner',active:false,epoch:++epoch});if(model)model.onState=model.onPick=model.onComplete=null;},{once:true});
}
