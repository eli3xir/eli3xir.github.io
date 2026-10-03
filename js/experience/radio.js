import {BARS} from '../audio/composition.js';

export function bindRadio(section,main,{score,world,signal,announce}){
  const panel=document.createElement('div');panel.className='record-controls';
  panel.innerHTML='<p class="record-caption">AFTER HOURS / 原创配乐 · 112 BPM</p><div class="record-actions"><button class="record-play" type="button"></button><a href="#content">节目与乐章 ↓</a></div><div class="record-stems" role="group" aria-label="配乐声部"></div><p class="record-position" aria-live="off"></p>';
  const stemNames=['氛围','低音','旋律','节奏'];
  stemNames.forEach((name,i)=>{const button=document.createElement('button');button.type='button';button.dataset.stem=String(i);button.setAttribute('aria-label',name+'声部');button.textContent=name;panel.querySelector('.record-stems').append(button);});
  const copy=section.querySelector('.hero-copy');copy.querySelector('.hero-note').remove();copy.querySelector('.explore-button').remove();copy.append(panel);
  const heroPlay=panel.querySelector('.record-play'),scoreButton=main.querySelector('[data-score-toggle]'),stems=[...panel.querySelectorAll('[data-stem]')];
  const toggle=async()=>{try{await score.toggle();}catch(error){announce(`声音暂时无法启动：${error.message}`);}};
  heroPlay.addEventListener('click',toggle,{signal});scoreButton.addEventListener('click',toggle,{signal});
  stems.forEach((button,i)=>button.addEventListener('click',()=>score.toggleStem(i),{signal}));
  const timeline=()=>{
    const rhythm=score.rhythm,playing=score.playing;
    const label=playing?`${score.audible?'':'等待继续 · '}${rhythm.title} / 第 ${Math.floor(rhythm.cycleBar)+1} 小节`:'四个乐章 / 一段好奇心的旅程';
    const description=score.stemEnabled.some(Boolean)?label:'全部声部已关闭 · 点亮任一声部收听';
    main.querySelector('.score-now').textContent=description;panel.querySelector('.record-position').textContent=description;
    main.querySelector('.score-track i').style.width=`${playing?rhythm.cycleBar/BARS*100:0}%`;
    main.querySelectorAll('[data-movement]').forEach(item=>item.classList.toggle('active',playing&&item.dataset.movement===rhythm.movement));
  };
  const unsubscribe=score.subscribe(state=>{
    heroPlay.textContent=state.generating?'正在唤醒声音…':state.audible?'暂停唱片 Ⅱ':state.playing?'继续唱片 ↗':'播放唱片 ↗';
    scoreButton.textContent=state.generating?'正在唤醒声音…':state.audible?'暂停试听 ↗':state.playing?'继续试听 ↗':'试听原创配乐 ↗';
    for(const button of [heroPlay,scoreButton]){button.setAttribute('aria-pressed',String(state.audible));button.disabled=state.generating;}
    stems.forEach((button,i)=>button.setAttribute('aria-pressed',String(state.stemEnabled[i])));timeline();if(world)world.moving=1;
  });
  if(world?.model)world.model.onPick=id=>{if(id==='play')toggle();else if(id.startsWith('stem:'))score.toggleStem(Number(id.split(':')[1]));};
  const timer=setInterval(timeline,150);signal.addEventListener('abort',()=>{unsubscribe();clearInterval(timer);},{once:true});
}
