export function bindArticleNavigation(main,entries,{signal,reading}){
  const article=main.querySelector('.post-content');
  const sections=entries.map(entry=>({...entry,element:document.getElementById(entry.id)})).filter(entry=>entry.element&&entry.id!=='content');
  if(!article||!sections.length)return;
  const details=document.createElement('details');details.className='reading-outline';
  const summary=document.createElement('summary');summary.innerHTML='<span>本文目录</span><small></small>';
  const nav=document.createElement('nav');nav.className='studio-toc';nav.setAttribute('aria-label','文章目录');
  for(const entry of sections){const link=document.createElement('a');link.href='#'+encodeURIComponent(entry.id);link.dataset.level=entry.level;link.dataset.section=entry.id;link.textContent=entry.title;nav.append(link);}
  details.append(summary,nav);article.before(details);
  const links=[...nav.querySelectorAll('a')],wide=matchMedia('(min-width: 1251px)'),options={signal};
  const presentation=()=>{details.open=wide.matches;};presentation();wide.addEventListener('change',presentation,options);
  nav.addEventListener('click',event=>{if(event.target.closest('a')&&!wide.matches)details.open=false;},options);
  let offsets=[],top=0,frame=0,dirty=true,selected=-1;
  function update(){
    frame=0;if(signal.aborted)return;
    if(dirty){top=article.getBoundingClientRect().top+scrollY;offsets=sections.map(entry=>entry.element.getBoundingClientRect().top+scrollY);dirty=false;}
    if(scrollY+100<top)return;
    let index=0;for(let i=1;i<offsets.length&&offsets[i]<=scrollY+100;i++)index=i;
    // Short final sections cannot align with the top once scrolling reaches
    // the document end. Keep their bookmark instead of the earlier heading.
    if(scrollY+innerHeight>=document.documentElement.scrollHeight-2)index=sections.length-1;
    if(index===selected)return;selected=index;
    links.forEach((link,i)=>{link.classList.toggle('active',i===index);if(i===index)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
    summary.querySelector('small').textContent=`第 ${index+1} / ${sections.length} 节`;
    reading?.select(sections[index].id);
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const measure=()=>{dirty=true;schedule();};
  summary.querySelector('small').textContent=`${sections.length} 节`;
  addEventListener('scroll',schedule,{...options,passive:true});addEventListener('resize',measure,options);details.addEventListener('toggle',measure,options);
  const observer=new ResizeObserver(measure);observer.observe(article);const head=main.querySelector('.post-head');if(head)observer.observe(head);
  signal.addEventListener('abort',()=>{observer.disconnect();cancelAnimationFrame(frame);},{once:true});schedule();
}
