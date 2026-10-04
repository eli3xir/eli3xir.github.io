import {createImageInspector} from './image-inspector.js';

export function bindArticleImages(article,{signal}){
  const supported=typeof HTMLDialogElement!=='undefined'&&typeof HTMLDialogElement.prototype.showModal==='function';
  let inspector=null,heading=article.closest('main')?.querySelector('.post-head h2')?.textContent||'文章配图',index=0;
  for(const node of article.querySelectorAll('h1,h2,h3,h4,h5,img')){
    if(node.tagName!=='IMG'){heading=node.textContent.trim();continue;}
    const image=node,number=++index,title=heading,url=new URL(image.src,location.href);
    let opener=null;
    // Keep existing image links intact. Failed legacy external figures retain
    // their original-source link instead of opening an empty inspector.
    if(url.origin===location.origin&&image.hasAttribute('width')&&!image.closest('a,button')){
      opener=document.createElement(supported?'button':'a');opener.className='article-image-open';
      opener.setAttribute('aria-label',`放大查看第 ${number} 张图：${title}`);
      if(supported){opener.type='button';opener.setAttribute('aria-haspopup','dialog');}
      else{opener.href=image.src;opener.target='_blank';opener.rel='noopener';}
      image.before(opener);opener.append(image);image.draggable=false;
      const hint=document.createElement('span');hint.className='article-image-hint';hint.setAttribute('aria-hidden','true');hint.textContent='放大查看 ↗';opener.append(hint);
      if(supported)opener.addEventListener('click',event=>{
        const box=image.getBoundingClientRect(),inside=event.detail>0&&event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom;
        const point=inside?[(event.clientX-box.left)/box.width,(event.clientY-box.top)/box.height]:[.5,.5];
        inspector??=createImageInspector({signal});inspector.open(image,opener,{title,number,point});
      },{signal});
    }
    const fallback=()=>{
      if(image.dataset.fallback)return;image.dataset.fallback='true';image.hidden=true;if(opener)opener.hidden=true;
      const link=document.createElement('a');link.className='image-fallback';link.href=image.src;link.target='_blank';link.rel='noopener';
      link.textContent=`${image.alt||'文章配图'} · 原始图片暂时无法加载，查看来源 ↗`;(opener||image).after(link);
    };
    image.addEventListener('error',fallback,{signal});if(image.complete&&image.naturalWidth===0)fallback();
  }
}
