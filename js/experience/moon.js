import {nextBeatDelay} from './domain.js';
export function bindMoon(section,main,{world,score,signal}){
 const model=world?.model,frame=main.querySelector('.experiment-frame');let visible=false,ready=false,owner='hero',epoch=0;
 const panel=document.createElement('div');panel.className='moon-controls';panel.innerHTML='<p>最后 3.8 米，把好奇心轻轻放下。</p><button type="button" data-moon-launch>开始着陆</button><p class="moon-status" role="status">待命 · 从这里降落，也能往下继续。</p>';
 const button=panel.querySelector('button'),status=panel.querySelector('.moon-status');
 const update=state=>{button.disabled=state.mode==='descending'||owner==='transfer';button.textContent=state.mode==='landed'?'再来一次':state.mode==='descending'?'正在降落…':'开始着陆';status.textContent=state.mode==='landed'?'着陆成功 · 月面安静，好奇心还亮着。':state.mode==='descending'?'减速、接地，让月尘慢慢落下。':'待命 · 从这里降落，也能往下继续。';};
 const post=data=>frame.contentWindow?.postMessage(data,location.origin);
 const visibility=()=>{if(owner==='hero')model?.setActive(!document.hidden);if(!ready)return;const active=visible&&!document.hidden;
  if(active&&owner==='hero'){epoch++;owner='frame';model?.setActive(false);post({type:'moon-owner',active:true,epoch,snapshot:model?.snapshot()});}
  else if(!active&&owner==='frame'){epoch++;owner='transfer';post({type:'moon-owner',active:false,epoch});}
  else if(!active&&owner==='hero')post({type:'moon-owner',active:false,epoch});
 };
 button.addEventListener('click',()=>{const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,delay=score.audible&&!reduced?nextBeatDelay(score.time):0;if(model?.launch({delay,reduced})){score.cue('hover',delay);world.moving=1;}},{signal});
 section.querySelector('.hero-note').remove();section.querySelector('.explore-button').before(panel);section.querySelector('.explore-button').textContent='靠近一点，继续这次着陆 ↓';
 main.querySelector('.experiment-intro p').textContent='同一段最后进近。拖拽或用方向键环视，触地后可以重新开始。';
 if(model){model.pick=ray=>model.hitTest(ray)?'landing':null;model.onPick=()=>button.click();model.onState=update;model.onLand=()=>{score.cue('reveal');world.actor.react();};}else{button.hidden=true;status.textContent='进入下方实验，查看设备是否支持 3D。';}
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.15;visibility();},{threshold:[0,.15]});observer.observe(frame);document.addEventListener('visibilitychange',visibility,{signal});
 addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;const data=event.data;
  if(data?.type==='moon-ready'){ready=true;visibility();}
  if(data?.type==='moon-state'&&data.epoch===epoch){
   if(owner==='transfer'){model?.restore(data.snapshot);model?.setActive(true);owner='hero';update(data.snapshot);if(world)world.moving=1;visibility();}
   else if(owner==='frame'){model?.restore(data.snapshot);update(data.snapshot);}
  }
 },{signal});
 signal.addEventListener('abort',()=>{observer.disconnect();post({type:'moon-owner',active:false,epoch:++epoch});if(model)model.onPick=model.onState=model.onLand=null;},{once:true});
}
