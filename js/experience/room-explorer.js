import {CHAPTERS} from './domain.js';

export function createRoomExplorer(preview,{world,score}){
  const corners=CHAPTERS.slice(1);let current=null,origin=null,originScroll=0;
  preview.setAttribute('aria-labelledby','room-corner-title');
  preview.innerHTML='<button type="button" class="preview-close" aria-label="返回房间全景">×</button><p class="eyebrow"></p><h2 id="room-corner-title" tabindex="-1"></h2><p class="preview-description"></p><div class="preview-actions"><a class="explore-button">进入这个世界 <span aria-hidden="true">↗</span></a><button type="button" class="preview-step" data-step="-1"><span aria-hidden="true">←</span></button><button type="button" class="preview-step" data-step="1"><span aria-hidden="true">→</span></button></div>';
  const title=preview.querySelector('h2'),entry=preview.querySelector('a'),steps=[...preview.querySelectorAll('[data-step]')];
  preview.querySelector('.preview-close').addEventListener('click',()=>world()?.focus(null));
  steps.forEach(button=>button.addEventListener('click',()=>{
    const index=corners.findIndex(chapter=>chapter.id===current),next=corners[(index+Number(button.dataset.step)+corners.length)%corners.length];
    world()?.focus(next.id);score.cue('hover');
  }));
  const reset=(restore=false)=>{
    const returnFocus=restore&&preview.contains(document.activeElement);current=null;preview.hidden=true;document.body.classList.remove('room-focused');
    const copy=document.querySelector('.hero-copy');if(copy)copy.inert=false;
    if(restore)scrollTo({top:originScroll,behavior:'instant'});
    if(returnFocus&&origin?.isConnected)origin.focus({preventScroll:true});origin=null;
  };
  return{reset,show(id){
    if(!id){reset(true);return;}
    const chapter=corners.find(chapter=>chapter.id===id);if(!chapter)return;
    const first=!current;
    if(first){origin=document.activeElement?.matches('a,button')?document.activeElement:document.querySelector('[data-explore]');originScroll=scrollY;}
    current=id;preview.hidden=false;document.body.classList.add('room-focused');
    if(first)scrollTo({top:0,behavior:'instant'});
    const copy=document.querySelector('.hero-copy');if(copy)copy.inert=true;
    title.textContent=chapter.label;preview.querySelector('.eyebrow').textContent=`${chapter.number} / A NEW CORNER`;
    preview.querySelector('.preview-description').textContent=chapter.subtitle;entry.href=chapter.path;
    const index=corners.indexOf(chapter);
    steps.forEach(button=>{const next=corners[(index+Number(button.dataset.step)+corners.length)%corners.length];button.setAttribute('aria-label',`${Number(button.dataset.step)<0?'上一处':'下一处'}：${next.label}`);});
    if(first)title.focus({preventScroll:true});
  }};
}
