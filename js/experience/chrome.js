import { CHAPTERS, readSetting, writeSetting } from './domain.js';

const mark = `<svg viewBox="0 0 32 38" aria-hidden="true"><path d="M12 2h8M14 3v10L5 29q-2 7 6 7h10q8 0 6-7L18 13V3" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M9 26q6-4 14 0M12 30h1m5 1h1" stroke="currentColor" fill="none"/></svg>`;

export function createChrome(score, callbacks) {
  const header = document.createElement('header');header.className='studio-header';
  header.innerHTML=`<a class="studio-brand" href="/" aria-label="eli3xir 首页">${mark}<span>eli3xir<small>A CABINET OF CURIOSITIES</small></span></a>
    <nav class="studio-nav" aria-label="主导航">${CHAPTERS.slice(1).map(c=>`<a href="${c.path}" data-chapter="${c.id}">${c.label}</a>`).join('')}</nav>
    <button class="menu-toggle" aria-label="展开导航" aria-expanded="false"><span></span><span></span></button>`;
  header.querySelector('.menu-toggle').addEventListener('click',event=>{
    const open=event.currentTarget.getAttribute('aria-expanded')!=='true';
    event.currentTarget.setAttribute('aria-expanded',String(open));header.classList.toggle('menu-open',open);
  });
  const dock=document.createElement('aside');dock.className='sound-dock';dock.setAttribute('aria-label','声音与画质');
  dock.innerHTML=`<button class="sound-toggle" aria-pressed="false"><span class="sound-bars" aria-hidden="true">${'<i></i>'.repeat(4)}</span><span class="sound-label">开启声音</span></button>
    <details class="sound-settings"><summary aria-label="声音与画质设置">设置</summary><div class="settings-panel">
      <label>配乐音量<input type="range" min="0" max="1" step=".05" value="${score.volume}" aria-label="配乐音量"></label>
      <label>画面质量<select aria-label="画面质量"><option value="auto">自动</option><option value="high">精细</option><option value="low">省电</option></select></label>
      <p>原创配乐 · AFTER HOURS<br>每一个声音都从代码里长出来。</p></div></details>`;
  dock.querySelector('input').addEventListener('input',e=>score.setVolume(e.target.value));
  const quality=dock.querySelector('select');quality.value=readSetting('visual-quality','auto');
  quality.addEventListener('change',e=>{writeSetting('visual-quality',e.target.value);callbacks.quality();});
  const button=dock.querySelector('.sound-toggle');
  const bars=[...dock.querySelectorAll('.sound-bars i')];let meterFrame=0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  function syncMeter(){
    cancelAnimationFrame(meterFrame);
    if(!score.playing||document.hidden||motion.matches){
      bars.forEach(bar=>{bar.style.transform=score.playing?'scaleY(.65)':'';});return;
    }
    const tick=()=>{
      const rhythm=score.rhythm;
      bars.forEach((bar,i)=>{bar.style.transform=`scaleY(${.35+.65*Math.exp(-((rhythm.beat+i*.25)%1)*5)})`;});
      if(score.playing&&!document.hidden)meterFrame=requestAnimationFrame(tick);
    };tick();
  }
  document.addEventListener('visibilitychange',syncMeter);
  motion.addEventListener('change',syncMeter);
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{await score.toggle();}catch(error){callbacks.announce(`声音暂时无法启动：${error.message}`);}
    finally{button.disabled=false;}
  });
  score.subscribe(state=>{
    button.setAttribute('aria-pressed',String(state.playing));dock.classList.toggle('playing',state.playing);
    dock.querySelector('.sound-label').textContent=state.generating?'正在唤醒声音…':state.playing?'声音已开启':'开启声音';
    syncMeter();
  });
  const corner=document.createElement('a');corner.className='room-link';corner.href='/';corner.innerHTML='<span aria-hidden="true">↖</span> 回到房间';
  return {header,dock,corner,update(route){
    header.querySelectorAll('[data-chapter]').forEach(a=>{if(a.dataset.chapter===route.id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    header.classList.remove('menu-open');header.querySelector('.menu-toggle').setAttribute('aria-expanded','false');
    corner.hidden=route.id==='home';
  }};
}

export function hero(route) {
  const section=document.createElement('section');section.className='world-hero';
  const safeTitle=route.article?'Notes from\na curious mind.':route.title;
  section.innerHTML=`<div class="hero-copy"><p class="eyebrow"><span class="chapter-number">${route.number}</span> / ${route.article?'FIELD NOTE':route.experiment?'EXPERIMENT':route.id==='home'?'AFTER HOURS STUDIO':route.id.toUpperCase()}</p>
    <h1 class="hero-title">${safeTitle.split('\n').map((line,i)=>`<span class="title-line ${i?'italic':''}">${line.split(' ').map(word=>`<span class="hero-word">${word}</span>`).join(' ')}</span>`).join('')}</h1>
    <p class="hero-subtitle"></p><div class="hero-rule"></div><p class="hero-note"></p>
    ${route.id==='home'?'<button class="explore-button" data-explore>跟着灵感逛逛 <span aria-hidden="true">↗</span></button>':'<a class="explore-button" href="#content">往下看看 <span aria-hidden="true">↓</span></a>'}</div>
    <div class="world-caption"><span class="caption-line"></span><span>FIG. ${route.number} / <b></b></span></div>
    <div class="hero-bottom"><span>CRAFTED WITH CURIOSITY.</span><span class="live-indicator"><i></i> 灵感仍在亮着</span></div>`;
  section.querySelector('.hero-subtitle').textContent=route.article?route.contentTitle:route.subtitle;
  section.querySelector('.hero-note').textContent=route.note;
  section.querySelector('.world-caption b').textContent=({home:'THE ROOM',lab:'A SMALL REACTION',blog:'THOUGHTS IN MOTION',radio:'SOUND TAKES SHAPE',projects:'IDEA → SIGNAL',about:'MEET MOTE',skin:'LIGHT, RECONSIDERED'})[route.id];
  if(route.id==='home'){
    const navigation=document.createElement('nav');navigation.className='chapter-dock';navigation.setAttribute('aria-label','房间物件与内容入口');
    navigation.innerHTML=CHAPTERS.slice(1).map(c=>`<a href="${c.path}" data-chapter="${c.id}"><small>${c.number}</small><span>${c.label}</span><b aria-hidden="true">↗</b></a>`).join('');
    section.append(navigation);
  }
  return section;
}
