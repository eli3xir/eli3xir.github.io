import { SKINS, readSetting, writeSetting } from './domain.js';
import { BARS, MOVEMENTS } from '../audio/composition.js';

export function pageContent(doc,route) {
  if(route.id==='home')return null;
  if(route.id==='skin'){
    const main=document.createElement('main');main.className='page skin-page';main.id='content';
    main.innerHTML='<div class="section-intro"><p class="eyebrow">MAKE YOURSELF AT HOME</p><h2>今天的房间，是什么心情？</h2><p>选择一种色调，看看光如何改变一切。</p></div><div class="skin-grid"></div>';
    const grid=main.querySelector('.skin-grid');
    Object.entries(SKINS).forEach(([id,skin])=>{
      const button=document.createElement('button');button.className='skin-option';button.dataset.skin=id;
      button.innerHTML=`<span class="skin-sample">${skin.colors.map(c=>`<i style="--swatch:${c}"></i>`).join('')}</span><span class="skin-name">${skin.name}</span><small>${skin.description}</small><span class="skin-check" aria-hidden="true">✓</span>`;
      button.setAttribute('aria-pressed',String(readSetting('room-skin','default')===id));grid.append(button);
    });return main;
  }
  if(route.experiment){
    const main=document.createElement('main');main.className='experiment-page';main.id='content';
    const top=document.createElement('div');top.className='experiment-intro';
    const heading=document.createElement('h2');heading.textContent=route.contentTitle;
    const text=document.createElement('p');text.textContent=doc.querySelector('.demo-hud p')?.textContent||'动动手，让这个念头活起来。';
    top.append(heading,text);main.append(top);
    const iframe=document.createElement('iframe');iframe.className='experiment-frame';iframe.title=route.contentTitle;
    iframe.src=route.pathname+'?embedded=1';iframe.allow='fullscreen';iframe.loading='lazy';
    main.append(iframe);
    const link=document.createElement('a');link.href='/lab/';link.className='text-link';link.textContent='← 继续探索实验室';main.append(link);
    return main;
  }
  const original=doc.querySelector('main');
  const main=original?document.importNode(original,true):document.createElement('main');
  main.id='content';
  main.querySelectorAll('script').forEach(script=>script.remove());
  if(route.id==='radio'){
    const score=document.createElement('section');score.className='score-card';
    score.innerHTML='<div><p class="eyebrow">AN ORIGINAL, CODE-COMPOSED SCORE</p><h2>After Hours</h2><p>灯亮起来，灵感开始冒险。留一点空白，再把答案带回房间。所有音色与鼓点，逐个采样写进声音。</p><div class="score-movements" aria-label="配乐的四个乐章"></div><div class="score-track" aria-hidden="true"><i></i></div><p class="score-now"></p></div><button class="score-button" data-score-toggle>试听原创配乐 <span aria-hidden="true">↗</span></button>';
    MOVEMENTS.forEach((movement,i)=>{const span=document.createElement('span');span.dataset.movement=movement.movement;span.textContent=`0${i+1} / ${movement.title}`;score.querySelector('.score-movements').append(span);});
    main.prepend(score);
  }
  main.querySelectorAll('.lab-card').forEach((card,i)=>{
    const emoji=card.querySelector('.lab-emoji');if(emoji)emoji.remove();
    const thumb=card.querySelector('.lab-thumb');
    const label=document.createElement('span');label.className='lab-number';label.textContent=String(i+1).padStart(2,'0');thumb?.append(label);
    const path=new URL(card.href,location.href).pathname.split('/').pop().replace('.html','');
    if(thumb){const img=document.createElement('img');img.src=`/assets/previews/${path}.png`;img.alt='';img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});thumb.prepend(img);}
  });
  return main;
}

export function enhanceContent(main,route,{signal,score,world,announce}) {
  if(!main)return;
  const options={signal};
  const scoreButton=main.querySelector('[data-score-toggle]');
  if(scoreButton){
    scoreButton.addEventListener('click',async()=>{try{await score.toggle();}catch(e){announce(e.message);}},options);
    const timeline=()=>{
      const rhythm=score.rhythm;
      main.querySelector('.score-now').textContent=score.playing?`${rhythm.title} / 第 ${Math.floor(rhythm.cycleBar)+1} 小节`:'四个乐章 / 一段好奇心的旅程';
      main.querySelector('.score-track i').style.width=`${score.playing?rhythm.cycleBar/BARS*100:0}%`;
      main.querySelectorAll('[data-movement]').forEach(item=>item.classList.toggle('active',score.playing&&item.dataset.movement===rhythm.movement));
    };
    const unsubscribe=score.subscribe(state=>{scoreButton.textContent=state.generating?'正在唤醒声音…':state.playing?'暂停试听 ↗':'试听原创配乐 ↗';scoreButton.disabled=state.generating;timeline();});
    const timer=setInterval(timeline,150);
    signal.addEventListener('abort',()=>{unsubscribe();clearInterval(timer);},{once:true});
  }
  main.querySelectorAll('[data-skin]').forEach(button=>button.addEventListener('click',()=>{
    const saved=writeSetting('room-skin',button.dataset.skin);world?.applySkin(button.dataset.skin);
    main.querySelectorAll('[data-skin]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    score.cue('hover');announce(`已应用「${SKINS[button.dataset.skin].name}」${saved?'':'，当前浏览器无法保存，下次需重新选择。'}`);
  },options));
  const search=main.querySelector('#search');
  if(search){
    search.setAttribute('aria-label','搜索文章标题或标签');
    const items=[...main.querySelectorAll('.post-item')];const buttons=[...main.querySelectorAll('.tag-btn')];let tag=null;
    const apply=()=>{
      const query=search.value.trim().toLowerCase();let count=0;
      items.forEach(item=>{const matches=(!query||item.dataset.title.includes(query)||item.dataset.tags.includes(query))&&(!tag||item.dataset.tags.split(',').includes(tag));item.hidden=!matches;item.style.display=matches?'':'none';if(matches)count++;});
      main.querySelector('.empty-hint').hidden=count>0;
      announce(`找到 ${count} 篇文章`);
    };
    search.addEventListener('input',apply,options);
    buttons.forEach(button=>button.addEventListener('click',()=>{
      const selected=(button.dataset.tag||'').toLowerCase();tag=tag===selected?null:selected;
      buttons.forEach(b=>{const active=(b.dataset.tag||'').toLowerCase()===tag;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
      apply();score.cue('hover');
    },options));
  }
  if(route.article)enhancePost(main,{signal,announce});
  const revealElements=[...main.querySelectorAll('.lab-card,.pcard,.ep,.fact-num,.post-item')];
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.08});
  revealElements.forEach(element=>{element.classList.add('reveal-item');observer.observe(element);});
  signal.addEventListener('abort',()=>observer.disconnect(),{once:true});
}

function enhancePost(main,{signal,announce}) {
  const article=main.querySelector('.post-content');if(!article)return;
  article.querySelectorAll('img').forEach(img=>{
    const fallback=()=>{
      if(img.dataset.fallback)return;img.dataset.fallback='true';
      const link=document.createElement('a');link.className='image-fallback';link.href=img.src;link.target='_blank';link.rel='noopener';
      link.textContent=`${img.alt||'文章配图'} · 原始图片暂时无法加载，查看来源 ↗`;img.hidden=true;img.after(link);
    };
    img.addEventListener('error',fallback,{signal});if(img.complete&&img.naturalWidth===0)fallback();
  });
  article.querySelectorAll('pre').forEach(pre=>{
    const oldBar=pre.querySelector('.code-bar');if(oldBar)oldBar.remove();
    const bar=document.createElement('div');bar.className='code-bar';
    const language=document.createElement('span');language.textContent=pre.querySelector('code')?.className.replace('language-','')||'CODE';
    const button=document.createElement('button');button.textContent='复制';button.type='button';
    button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(pre.querySelector('code')?.textContent||'');button.textContent='已复制';announce('代码已复制');}catch{announce('复制未成功，请选择代码手动复制');}},{signal});
    bar.append(language,button);pre.prepend(bar);pre.classList.add('has-bar');
  });
  const headings=[...article.querySelectorAll('h1,h2,h3')];if(headings.length<2)return;
  const toc=document.createElement('nav');toc.className='studio-toc';toc.setAttribute('aria-label','文章目录');
  const title=document.createElement('p');title.textContent='IN THIS NOTE';toc.append(title);
  headings.forEach((heading,i)=>{heading.id||=`section-${i}`;const a=document.createElement('a');a.href='#'+heading.id;a.textContent=heading.textContent;a.dataset.level=heading.tagName.slice(1);toc.append(a);});
  main.append(toc);
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){toc.querySelectorAll('a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));}
  },{rootMargin:'-90px 0px -65% 0px'});
  headings.forEach(h=>observer.observe(h));signal.addEventListener('abort',()=>observer.disconnect(),{once:true});
  if(window.renderMathInElement)window.renderMathInElement(article,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}]});
}
