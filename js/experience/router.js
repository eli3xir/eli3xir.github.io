import { nextBeatDelay } from './domain.js';
import { BPM } from '../audio/composition.js';

export function scrollToAnchor(hash){
  let id;try{id=decodeURIComponent(hash.replace(/^#/,''));}catch{return false;}
  const target=document.getElementById(id);if(!target)return false;
  if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
  target.focus({preventScroll:true});target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return true;
}

export class Router {
  constructor({mount,transition,score,announce,onIntent=()=>{},prepare=async()=>{}}) {
    this.mount=mount;this.transition=transition;this.score=score;this.announce=announce;
    this.onIntent=onIntent;this.prepare=prepare;
    this.cache=new Map();this.busy=false;this.pending=null;this.animation=null;this.wakePreparation=null;
    this.currentURL=new URL(location.href);
    addEventListener('click',e=>this.click(e));
    addEventListener('popstate',()=>this.navigate(location.href,{history:false}));
    addEventListener('pagehide',()=>score.save());
    addEventListener('pageshow',()=>{document.body.classList.remove('is-transitioning');});
  }

  click(event) {
    const link=event.target.closest('a[href]');
    if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target||link.hasAttribute('download'))return;
    const url=new URL(link.href,location.href);
    if(url.origin!==location.origin||url.protocol!=='http:'&&url.protocol!=='https:')return;
    if(url.pathname===location.pathname&&url.search===location.search&&url.hash){
      if(scrollToAnchor(url.hash)){event.preventDefault();history.replaceState(null,'',url);this.currentURL=url;}
      return;
    }
    if(!/\/$|\.html$/.test(url.pathname)&&url.pathname!=='/')return;
    event.preventDefault();this.navigate(url.href);
  }

  async load(url) {
    const key=url.pathname+url.search;
    if(this.cache.has(key))return this.cache.get(key);
    const response=await fetch(url.href,{signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const doc=new DOMParser().parseFromString(await response.text(),'text/html');
    if(!doc.querySelector('main,.wrap,.demo-hud'))throw new Error('目的地缺少页面内容');
    this.cache.set(key,doc);return doc;
  }

  async animate(from,to,duration) {
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){this.transition(to);return;}
    await new Promise(resolve=>{
      const start=performance.now();
      const frame=now=>{
        const p=Math.max(0,Math.min(1,(now-start)/duration));
        const eased=p<.5?4*p*p*p:1-(-2*p+2)**3/2;
        this.transition(from+(to-from)*eased);
        if(p<1)this.animation=requestAnimationFrame(frame);else resolve();
      };this.animation=requestAnimationFrame(frame);
    });
  }

  async loadReady(url){
    let timer;
    try{
      const [doc]=await Promise.race([
        Promise.all([this.load(url),this.prepare(url).catch(error=>{throw new Error('互动场景暂时未能载入',{cause:error});})]),
        new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('页面场景加载超时')),12000);}),
      ]);
      return doc;
    }finally{clearTimeout(timer);}
  }

  async navigate(href,{history:push=true}={}) {
    let url=new URL(href,location.href);
    if(this.busy){this.pending={href:url.href,options:{history:push}};this.wakePreparation?.();return;}
    if(url.href===this.currentURL.href)return;
    this.busy=true;let transitioning=false;document.body.classList.add('is-preparing');
    try{
      let doc;
      for(;;){
        if(url.href===this.currentURL.href){this.announce('已留在当前页面。');return;}
        this.onIntent(url);
        const redirected=new Promise(resolve=>{this.wakePreparation=()=>resolve({redirected:true});});
        // A superseded import may finish later; consume its result without mounting it.
        const loading=this.loadReady(url).then(doc=>({doc}),error=>({error}));
        const result=await Promise.race([loading,redirected]);this.wakePreparation=null;
        if(this.pending){const next=this.pending;this.pending=null;url=new URL(next.href);push=next.options.history;continue;}
        if(result.error)throw result.error;
        doc=result.doc;break;
      }
      document.body.classList.remove('is-preparing');document.body.classList.add('is-transitioning');transitioning=true;
      const delay=nextBeatDelay(this.score.time);
      if(this.score.audible)await new Promise(resolve=>setTimeout(resolve,delay*1000));
      this.score.cue('reveal');
      await this.animate(0,1,this.score.audible?60000/BPM:430);
      if(this.score.audible)await new Promise(resolve=>setTimeout(resolve,nextBeatDelay(this.score.time,1)*1000));
      await this.mount(doc,url);
      if(push)history.pushState({studio:true},'',url);
      this.currentURL=url;
      scrollTo(0,0);
      this.score.cue('reveal');
      await this.animate(1,0,this.score.audible?120000/BPM:760);
      const h1=document.querySelector('.hero-title');h1?.setAttribute('tabindex','-1');h1?.focus({preventScroll:true});
      if(url.hash)scrollToAnchor(url.hash);
    }catch(error){
      if(!push)history.replaceState({studio:true},'',this.currentURL);
      this.announce(`暂时无法进入这个页面：${error.message}。可以重试或直接打开。`,url.href);
      // The current content stays usable when a destination cannot be fetched.
      if(transitioning)await this.animate(1,0,220);
    }finally{
      this.wakePreparation=null;this.busy=false;document.body.classList.remove('is-preparing','is-transitioning');
      if(this.pending){const pending=this.pending;this.pending=null;this.navigate(pending.href,pending.options);}
    }
  }
}
