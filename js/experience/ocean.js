import {nextBeatDelay} from './domain.js';
import {BPM} from '../audio/composition.js';
const winds=[{value:0,label:'平静'},{value:.8,label:'微风'},{value:1.6,label:'起风'}];
export function bindOcean(section,main,{world,score,signal}){
  const model=world?.model,frame=main.querySelector('.experiment-frame');if(!model?.setWind)return;
  const panel=document.createElement('div');panel.className='ocean-controls';panel.innerHTML='<p>让风先到，看看船怎样回答。</p><div role="group" aria-label="海面风力"></div><p class="ocean-status" role="status">微风 · 船身跟着浪面起伏。</p>';
  let selected=.8;
  const send=()=>frame.contentWindow?.postMessage({type:'ocean-weather',strength:selected},location.origin);
  let visible=false;
  const visibility=()=>frame.contentWindow?.postMessage({type:'ocean-visibility',active:visible&&!document.hidden},location.origin);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibility();},{rootMargin:'80px'});observer.observe(frame);
  document.addEventListener('visibilitychange',visibility,{signal});
  const choose=value=>{selected=value;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,delay=score.audible&&!reduced?nextBeatDelay(score.time):0;
    model.setWind(value,{now:performance.now()/1000,delay,duration:120/BPM,reduced});world.moving=1;score.cue('hover',delay);
    panel.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.wind)===value)));
    panel.querySelector('.ocean-status').textContent=winds.find(w=>w.value===value).label+' · '+(value?'船身跟着浪面起伏。':'收起波澜，慢慢出发。');send();};
  for(const wind of winds){const button=document.createElement('button');button.type='button';button.dataset.wind=String(wind.value);button.textContent=wind.label;button.setAttribute('aria-pressed',String(wind.value===selected));button.addEventListener('click',()=>choose(wind.value),{signal});panel.querySelector('div').append(button);}
  section.querySelector('.hero-note').remove();section.querySelector('.explore-button').before(panel);section.querySelector('.explore-button').textContent='接过船舵 ↓';
  main.querySelector('.experiment-intro p').textContent='W/S 控速 · A/D 转舵 · 拖拽环视，或按住画面中的方向按钮。';
  frame.addEventListener('load',()=>{send();visibility();},{signal});addEventListener('message',event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='ocean-ready'){send();visibility();}},{signal});
  model.pick=ray=>model.hitTest(ray)?'wind':null;model.onPick=()=>choose(winds[(winds.findIndex(w=>w.value===selected)+1)%winds.length].value);
  signal.addEventListener('abort',()=>{model.onPick=null;observer.disconnect();visible=false;visibility();},{once:true});
}
