import {nextBeatDelay} from './domain.js';
import {BPM} from '../audio/composition.js';

export function bindProjectSignal(section,doc,{world,score,relay,signal}){
  const original=doc.querySelector('.pcard:not(.more)');if(!original)return;
  const panel=document.createElement('div');panel.className='signal-panel';
  panel.innerHTML='<p class="signal-caption"></p><form class="signal-form"><label><span class="sr-only">发送终端</span><select aria-label="发送终端"><option value="0">A</option><option value="1">B</option><option value="2">C</option></select></label><label class="signal-message"><span class="sr-only">发送一句话</span><input aria-label="发送一句话" maxlength="32" value="Hello, curiosity." autocomplete="off"></label><button type="submit">发送 ↗</button></form><p class="signal-status" role="status" aria-live="polite"></p><div class="signal-links"><a class="signal-source" target="_blank" rel="noopener">项目仓库 ↗</a><a href="/blog/50706.html#content">实现笔记 ↗</a><a href="#content">全部项目 ↓</a></div>';
  panel.querySelector('.signal-caption').textContent=original.querySelector('h3').textContent+' / 本地流程演示';
  panel.querySelector('.signal-source').href=original.querySelector('a').href;
  const copy=section.querySelector('.hero-copy');copy.querySelector('.hero-note').remove();copy.querySelector('.explore-button').remove();copy.append(panel);
  const input=panel.querySelector('input'),select=panel.querySelector('select'),button=panel.querySelector('button'),status=panel.querySelector('.signal-status');
  let delivered=0;
  const render=state=>{
    select.value=String(state.sender);select.disabled=button.disabled=state.busy;button.textContent=state.busy?'传送中…':'发送 ↗';
    const recipients='ABC'.split('').filter((_,i)=>i!==state.sender).join('、');
    status.textContent=({idle:'选一个终端，发出一点好奇心。',sending:`${'ABC'[state.sender]} 发出 → 正在抵达中转台`,relay:'中转台收到 → 分发给另外两端',delivering:`信号正在前往 ${recipients}`,delivered:`${recipients} 已收到：${state.message}`})[state.phase];
    if(state.phase==='delivered'&&state.serial>delivered){delivered=state.serial;if(world&&!world.reduced.matches)score.cue('hover');world?.actor.react();}
  };
  const unsubscribe=relay.subscribe(render);signal.addEventListener('abort',()=>{unsubscribe();if(!world)relay.dispose();},{once:true});render(relay.state);
  select.addEventListener('change',()=>{relay.select(Number(select.value));if(world)world.moving=1;},{signal});
  if(world?.model){world.model.onPick=index=>{if(relay.select(index)){world.actor.react();world.moving=1;score.cue('hover');}};}
  panel.querySelector('form').addEventListener('submit',event=>{
    event.preventDefault();const reduced=!world||world.reduced.matches,delay=score.audible&&!reduced?nextBeatDelay(score.time):0;
    const sent=relay.send(input.value,{now:performance.now()/1000,delay,duration:240/BPM,reduced});
    if(sent){input.value=relay.state.message;score.cue('hover',delay);if(world){world.actor.react();world.moving=1;}}
    else if(!relay.state.busy){status.textContent='先写下一句话。';input.focus();}
  },{signal});
}
