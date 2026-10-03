export function readingEntries(doc,route) {
  if(route.id!=='blog'||route.article)return [];
  const base=new URL(route.pathname,location.origin);
  return [...doc.querySelectorAll('.post-item')].map(item=>({
    title:item.querySelector('.post-title')?.textContent.trim()||'',
    date:item.querySelector('.post-date')?.textContent.trim()||'',
    tags:[...item.querySelectorAll('.chip')].map(tag=>tag.textContent.trim()).join(' · '),
    href:new URL(item.querySelector('a').getAttribute('href'),base).pathname
  }));
}

export function bindReading(section,entries,{world,signal}) {
  if(!entries.length)return;
  const panel=document.createElement('div');panel.className='reading-choice';
  panel.innerHTML='<p class="reading-position" aria-live="polite"></p><a class="reading-title"></a><div class="reading-actions"><button type="button">翻到下一篇 <span aria-hidden="true">↶</span></button><a href="#content">全部文章 ↓</a></div>';
  const copy=section.querySelector('.hero-copy');copy.querySelector('.hero-note').remove();copy.querySelector('.explore-button').remove();copy.append(panel);
  let index=0;
  const render=selected=>{
    index=selected;const entry=entries[index];
    panel.querySelector('.reading-position').textContent=`${String(index+1).padStart(2,'0')} / ${entries.length} · ${entry.date}`;
    const link=panel.querySelector('.reading-title');link.textContent=entry.title;link.href=entry.href;link.setAttribute('aria-label',`阅读：${entry.title}`);
  };
  if(world?.model){const model=world.model;model.onChange=render;signal.addEventListener('abort',()=>{model.onChange=null;},{once:true});}
  panel.querySelector('button').addEventListener('click',()=>{if(world)world.interact();else render((index+1)%entries.length);},{signal});
  render(0);
}
