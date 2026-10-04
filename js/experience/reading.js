import {articleSections} from './article-sections.js';
export function readingEntries(doc,route) {
  if(route.id!=='blog')return [];
  if(route.article)return articleSections(doc,route);
  const base=new URL(route.pathname,location.origin);
  return [...doc.querySelectorAll('.post-item')].map(item=>({
    title:item.querySelector('.post-title')?.textContent.trim()||'',
    date:item.querySelector('.post-date')?.textContent.trim()||'',
    tags:[...item.querySelectorAll('.chip')].map(tag=>tag.textContent.trim()).join(' · '),
    href:new URL(item.querySelector('a').getAttribute('href'),base).pathname
  }));
}

export function bindReading(section,entries,{world,signal,article=false}) {
  if(!entries.length)return;
  const panel=document.createElement('div');panel.className='reading-choice';
  panel.innerHTML='<p class="reading-position" aria-live="polite"></p><a class="reading-title"></a><div class="reading-actions"><button type="button">翻到下一篇 <span aria-hidden="true">↶</span></button><a href="#content">全部文章 ↓</a></div>';
  if(article){panel.querySelector('.reading-position').removeAttribute('aria-live');panel.querySelector('button').innerHTML='翻到下一节 <span aria-hidden="true">↶</span>';panel.querySelector('.reading-actions a').textContent='从头阅读 ↓';panel.querySelector('button').hidden=entries.length<2;}
  const copy=section.querySelector('.hero-copy');copy.querySelector('.hero-note').remove();copy.querySelector('.explore-button').remove();copy.append(panel);
  let index=0;
  const render=selected=>{
    index=selected;const entry=entries[index];
    panel.querySelector('.reading-position').textContent=article?(entries.length>1?`书页 ${String(index+1).padStart(2,'0')} / ${entries.length} · 选择一节，开始阅读`:'一则短记 · 打开正文'):`${String(index+1).padStart(2,'0')} / ${entries.length} · ${entry.date}`;
    const link=panel.querySelector('.reading-title');link.textContent=entry.title;link.href=entry.href;link.setAttribute('aria-label',`阅读：${entry.title}`);
    link.title=entry.title;
  };
  if(world?.model){const model=world.model;model.onChange=render;signal.addEventListener('abort',()=>{model.onChange=null;},{once:true});}
  panel.querySelector('button').addEventListener('click',()=>{if(world)world.interact();else render((index+1)%entries.length);},{signal});
  render(0);
  return{select(id){const selected=entries.findIndex(entry=>entry.id===id);if(selected<0||selected===index&&!world?.model.turning)return;if(world?.model.select)world.model.select(selected);else render(selected);}};
}
