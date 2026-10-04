const clean=text=>text.replace(/\s+/g,' ').trim();
function excerptAfter(element){
  for(let next=element.nextElementSibling;next&&!/^H[1-3]$/.test(next.tagName);next=next.nextElementSibling){
    if(!next.matches('p,ul,ol,blockquote')||next.querySelector('img'))continue;
    const text=clean(next.textContent);if(text&&!/^\$|^\\\[/.test(text))return text;
  }
  return '';
}
export function articleSections(doc,route){
  const article=doc.querySelector('.post-content');if(!article)return [];
  route.readingMeta={date:doc.querySelector('.post-meta time')?.textContent.trim()||'',tags:[...doc.querySelectorAll('.post-meta .chip')].map(e=>e.textContent.trim()).join(' · ')};
  const headings=[...article.querySelectorAll('h1,h2,h3')];
  const used=new Set([...doc.querySelectorAll('[id]')].map(element=>element.id));
  return headings.length?headings.map((heading,index)=>{
    if(!heading.id){let id=`section-${index}`;while(used.has(id))id+='-note';heading.id=id;used.add(id);}
    return{title:clean(heading.textContent),excerpt:excerptAfter(heading),id:heading.id,level:Number(heading.tagName.slice(1)),
      href:route.pathname+'#'+encodeURIComponent(heading.id),kicker:'SECTION / FIELD NOTE',tags:route.contentTitle};
  }):[{title:'从开头读',excerpt:clean(article.querySelector('p')?.textContent||''),href:route.pathname+'#content',id:'content',level:1,kicker:'FIELD NOTE / ELI3XIR'}];
}
