export function createImageInspector({signal}){
  const dialog=document.createElement('dialog');dialog.className='image-inspector';dialog.setAttribute('aria-labelledby','image-inspector-title');
  dialog.innerHTML=`<header class="image-inspector-head"><div><p class="image-inspector-kicker"></p><h2 id="image-inspector-title"></h2></div><button type="button" class="image-inspector-close" autofocus aria-label="关闭图片">关闭 ×</button></header>
    <div class="image-inspector-tools" role="group" aria-label="图片显示方式"><button type="button" data-image-mode="fit">适合窗口</button><button type="button" data-image-mode="actual">原尺寸</button><a class="image-inspector-original" target="_blank" rel="noopener">打开原图 ↗</a></div>
    <div class="image-inspector-viewport" tabindex="0" role="region" aria-label="图示细节，可使用方向键滚动"><div class="image-inspector-plane"><img draggable="false" alt=""></div></div>
    <p class="image-inspector-status" role="status"></p>`;
  document.body.append(dialog);
  const viewport=dialog.querySelector('.image-inspector-viewport'),plane=dialog.querySelector('.image-inspector-plane'),image=plane.querySelector('img');
  const status=dialog.querySelector('.image-inspector-status'),buttons=[...dialog.querySelectorAll('[data-image-mode]')],options={signal};
  let active=null,mode='fit',natural=null,scale=1,generation=0,drag=null,outsideDown=false;

  function lock(){
    const root=document.documentElement,body=document.body;
    const saved={overflow:body.style.overflow,padding:body.style.paddingRight,gutter:root.style.scrollbarGutter};
    const gap=innerWidth-root.clientWidth;
    if(gap&&CSS.supports('scrollbar-gutter','stable'))root.style.scrollbarGutter='stable';
    else if(gap)body.style.paddingRight=`${parseFloat(getComputedStyle(body).paddingRight)+gap}px`;
    body.style.overflow='hidden';return saved;
  }
  function releaseDrag(){
    if(drag&&viewport.hasPointerCapture(drag.id))viewport.releasePointerCapture(drag.id);
    drag=null;viewport.classList.remove('is-dragging');
  }
  function finish(restore=true){
    if(!active)return;
    const previous=active;active=null;generation++;releaseDrag();natural=null;
    document.body.style.overflow=previous.lock.overflow;document.body.style.paddingRight=previous.lock.padding;document.documentElement.style.scrollbarGutter=previous.lock.gutter;
    image.removeAttribute('src');viewport.scrollTo(0,0);
    if(restore&&!signal.aborted&&previous.opener.isConnected){
      const target=previous.opener.hidden?previous.opener.nextElementSibling:previous.opener;
      if(!target?.matches('.article-image-open,.image-fallback'))return;
      const top=target===previous.opener?previous.top:Math.max(64,Math.min(previous.top,innerHeight-100));
      target.focus({preventScroll:true});
      scrollTo({left:previous.scrollX,top:target.getBoundingClientRect().top+scrollY-top,behavior:'instant'});
    }
  }
  function dismiss(){dialog.close();finish();}
  function layout(preserve=true,point=[.5,.5]){
    if(!dialog.open||!natural||!viewport.clientWidth||!viewport.clientHeight)return;
    const center=preserve?[(viewport.scrollLeft+viewport.clientWidth/2-image.offsetLeft)/(natural.width*scale),
      (viewport.scrollTop+viewport.clientHeight/2-image.offsetTop)/(natural.height*scale)]:point;
    scale=mode==='actual'?1:Math.min(1,Math.max(1,viewport.clientWidth-48)/natural.width,Math.max(1,viewport.clientHeight-48)/natural.height);
    const width=natural.width*scale,height=natural.height*scale;
    plane.style.width=`${Math.max(viewport.clientWidth,width+48)}px`;plane.style.height=`${Math.max(viewport.clientHeight,height+48)}px`;
    image.style.width=`${width}px`;image.style.height=`${height}px`;
    viewport.scrollLeft=image.offsetLeft+width*center[0]-viewport.clientWidth/2;viewport.scrollTop=image.offsetTop+height*center[1]-viewport.clientHeight/2;
    viewport.classList.toggle('can-pan',mode==='actual'&&(width>viewport.clientWidth||height>viewport.clientHeight));
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.imageMode===mode)));
    if(!viewport.hasAttribute('aria-busy'))status.textContent=`${Math.round(scale*100)}% · ${mode==='actual'?'拖动或滚动查看细节':'查看整张图示'}`;
  }
  buttons.forEach(button=>button.addEventListener('click',()=>{releaseDrag();mode=button.dataset.imageMode;layout();},options));
  dialog.querySelector('.image-inspector-close').addEventListener('click',dismiss,options);
  dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss();},options);
  dialog.addEventListener('close',()=>{if(!dialog.open)finish();},options);
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape')event.stopPropagation();
    if(event.key!=='Tab')return;
    const stops=[...dialog.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')],first=stops[0],last=stops.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  },options);
  const outside=event=>{const box=dialog.getBoundingClientRect();return event.target===dialog&&(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom);};
  dialog.addEventListener('pointerdown',event=>{outsideDown=outside(event);},options);
  dialog.addEventListener('pointerup',event=>{if(outsideDown&&outside(event))dismiss();outsideDown=false;},options);
  viewport.addEventListener('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==0)return;
    viewport.focus({preventScroll:true});if(!viewport.classList.contains('can-pan'))return;
    event.preventDefault();drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};
    viewport.setPointerCapture(event.pointerId);viewport.classList.add('is-dragging');
  },options);
  viewport.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;viewport.scrollLeft=drag.left+drag.x-event.clientX;viewport.scrollTop=drag.top+drag.y-event.clientY;
  },options);
  for(const type of ['pointerup','pointercancel','lostpointercapture'])viewport.addEventListener(type,releaseDrag,options);
  addEventListener('blur',releaseDrag,options);
  const observer=new ResizeObserver(()=>layout());observer.observe(viewport);
  signal.addEventListener('abort',()=>{finish(false);dialog.close();observer.disconnect();dialog.remove();},{once:true});

  return{open(source,opener,{title,number,point}){
    if(signal.aborted||dialog.open)return;
    const token=++generation,inlineWidth=source.getBoundingClientRect().width;
    active={opener,top:opener.getBoundingClientRect().top,scrollX,lock:lock()};mode='fit';
    dialog.querySelector('#image-inspector-title').textContent=title;dialog.querySelector('.image-inspector-kicker').textContent=`图 ${String(number).padStart(2,'0')} / 本文配图`;
    dialog.querySelector('.image-inspector-original').href=source.currentSrc||source.src;image.alt=source.alt;
    image.hidden=false;viewport.setAttribute('aria-busy','true');status.textContent='正在载入图示…';
    buttons.forEach(button=>{button.disabled=false;});
    natural={width:Number(source.getAttribute('width')),height:Number(source.getAttribute('height'))};
    image.src=source.currentSrc||source.src;dialog.showModal();
    const fittedWidth=natural.width*Math.min(1,(viewport.clientWidth-48)/natural.width,(viewport.clientHeight-48)/natural.height);
    if(fittedWidth<inlineWidth*1.1&&natural.width>inlineWidth*1.1)mode='actual';
    layout(false,point);
    image.decode().then(()=>{
      if(generation!==token||signal.aborted)return;
      natural={width:image.naturalWidth,height:image.naturalHeight};viewport.removeAttribute('aria-busy');layout();
    }).catch(()=>{
      if(generation!==token||signal.aborted)return;
      natural=null;image.hidden=true;buttons.forEach(button=>{button.disabled=true;});viewport.removeAttribute('aria-busy');status.textContent='图片暂时无法载入，可以打开原图或返回正文。';
    });
  }};
}
