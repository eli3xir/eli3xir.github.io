import {SKINS,readSetting,writeSetting,nextBeatDelay} from './domain.js';
import {BPM} from '../audio/composition.js';

export function bindSkin(section,main,{world,score,signal,announce}){
  const panel=document.createElement('div');panel.className='finish-controls';
  panel.innerHTML='<div class="finish-options" role="group" aria-label="房间配色"></div><p class="finish-current"></p><p class="finish-status"></p><div class="finish-links"><a href="/">走进这个房间 ↗</a><a href="#content">全部配色 ↓</a><button type="button" class="finish-retry" hidden>重新载入预览</button></div>';
  const short=['暖黄','砖红','墨绿','灰蓝','米白'];
  Object.entries(SKINS).forEach(([id,skin],i)=>{const button=document.createElement('button');button.type='button';button.dataset.previewSkin=id;button.style.setProperty('--finish',skin.colors[0]);button.setAttribute('aria-label',skin.name);button.innerHTML=`<i aria-hidden="true"></i>${short[i]}`;panel.querySelector('.finish-options').append(button);});
  section.querySelector('.hero-note').remove();section.querySelector('.explore-button').replaceWith(panel);
  const buttons=[...panel.querySelectorAll('[data-preview-skin]'),...main.querySelectorAll('.skin-option')],model=world?.model;
  let selected=readSetting('room-skin','default');if(!SKINS[selected])selected='default';
  const render=()=>{
    buttons.forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.skin||button.dataset.previewSkin)===selected)));
    panel.querySelector('.finish-current').textContent=SKINS[selected].name+' · '+SKINS[selected].description;
    const status=model?.previewStatus;
    panel.querySelector('.finish-status').textContent=!world?'选择后保存配色，回到房间查看。':status==='ready'?'同一间房间 · 点击台前样本也能换色':status==='failed'?'房间预览暂未载入，配色仍可选择。':'正在搭好同一间房间…';
    panel.querySelector('.finish-retry').hidden=status!=='failed';
  };
  const choose=id=>{
    if(signal.aborted||!SKINS[id]||id===selected)return;
    selected=id;const saved=writeSetting('room-skin',id),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay=score.audible&&!reduced?nextBeatDelay(score.time):0;
    world?.applySkin(id,{now:performance.now()/1000,delay,duration:120/BPM,reduced});
    world?.actor.react();score.cue('hover',delay);render();
    announce(`已应用「${SKINS[id].name}」${saved?'':'，当前浏览器无法保存，下次需重新选择。'}`);
  };
  buttons.forEach(button=>button.addEventListener('click',()=>choose(button.dataset.skin||button.dataset.previewSkin),{signal}));
  if(model){model.onPick=choose;model.onStatus=()=>{render();world.resize();};}
  panel.querySelector('.finish-retry').addEventListener('click',()=>model?.retryPreview(),{signal});
  signal.addEventListener('abort',()=>{if(model){model.onPick=model.onStatus=null;}},{once:true});render();
}
