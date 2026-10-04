import {nextBeatDelay} from './domain.js';
import {BPM} from '../audio/composition.js';

const activities={run:['跑一圈','跑步 · 换个节奏，再回来。'],swim:['游一程','游泳 · 让思绪换一次呼吸。'],chess:['想一步','下棋 · 偶尔，慢慢想一步。']};
export function bindAbout(section,{world,score,signal}){
  const model=world?.model;if(!model?.select)return;
  const panel=document.createElement('div');panel.className='leisure-controls';
  panel.innerHTML='<p class="leisure-intro">跑步、游泳，偶尔下棋。</p><div class="leisure-options" role="group" aria-label="代码之外的小活动"></div><p class="leisure-status" role="status">给 Mote 放个小假。</p>';
  for(const [id,[label]] of Object.entries(activities)){
    const button=document.createElement('button');button.type='button';button.dataset.activity=id;button.textContent=label+' ↗';button.setAttribute('aria-pressed','false');panel.querySelector('.leisure-options').append(button);
  }
  section.querySelector('.hero-note').remove();section.querySelector('.explore-button').before(panel);
  section.querySelector('.explore-button').textContent='认识我 / 联系方式 ↓';
  const choose=id=>{
    if(signal.aborted||!activities[id])return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,delay=score.audible&&!reduced?nextBeatDelay(score.time):0;
    model.select(id,{now:performance.now()/1000,delay,duration:480/BPM,reduced});world.moving=1;world.actor.react();score.cue('hover',delay);
  };
  model.onState=(id,done)=>{
    panel.querySelectorAll('[data-activity]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.activity===id)));
    panel.querySelector('.leisure-status').textContent=activities[id][1]+(done?' 回来啦。':'');
  };
  model.onPick=choose;
  panel.querySelectorAll('[data-activity]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.activity),{signal}));
  signal.addEventListener('abort',()=>{model.onPick=model.onState=null;},{once:true});
}
