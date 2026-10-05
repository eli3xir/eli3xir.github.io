import { Score } from '../audio/score.js';
import { World } from '../world/world.js';
import {roomProject} from '../world/room-projects.js';
import { CHAPTERS, routeFor, nextBeatDelay, readSetting } from './domain.js';
import { createChrome, hero } from './chrome.js';
import { pageContent, enhanceContent } from './content.js';
import { Router,scrollToAnchor } from './router.js';
import { BPM } from '../audio/composition.js';
import { readingEntries, bindReading } from './reading.js';
import {createMessageRelay} from './message-relay.js';
import {bindProjectSignal} from './project-signal.js';
import {createCompiler} from './compiler-expression.js';
import {bindCompiler} from './project-compiler.js';
import {createVision} from './vision.js';
import {bindRadio} from './radio.js';
import {bindSkin} from './skin.js';
import {bindAbout} from './about.js';
import {bindOcean} from './ocean.js';
import {bindPartext} from './partext.js';
import {bindMoon} from './moon.js';
import {bindFluid} from './fluid.js';
import {bindTrails} from './trails.js';
import {bindGalaxy} from './galaxy.js';
import {bindGlass} from './glass.js';
import {bindBreakout} from './breakout.js';
import {bindBullet} from './bullet.js';
import {visualQuality,watchVisualQuality} from './visual-quality.js';
import {createRoomExplorer} from './room-explorer.js';

const original=document.cloneNode(true);
const score=new Score();
let world=null,router=null,route=null,contentEvents=null;
document.body.dataset.experience='true';
document.body.replaceChildren();
const stage=document.createElement('div');stage.id='world-stage';stage.setAttribute('aria-hidden','true');
const view=document.createElement('div');view.id='page-view';
const status=document.createElement('div');status.className='scene-status';status.setAttribute('role','status');
const live=document.createElement('div');live.className='studio-toast';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
const tooltip=document.createElement('div');tooltip.className='object-label';tooltip.setAttribute('aria-hidden','true');tooltip.hidden=true;
const preview=document.createElement('aside');preview.className='object-preview';preview.hidden=true;
const curtain=document.createElement('div');curtain.className='portal-layer';curtain.setAttribute('aria-hidden','true');
curtain.innerHTML='<div class="portal-surface"><span class="portal-label">FOLLOW YOUR CURIOSITY.</span><span class="portal-heading"></span><span class="portal-symbol">✳</span></div>';
const skip=document.createElement('a');skip.className='skip-link';skip.href='#content';skip.textContent='跳到内容';
let toastTimer;
function announce(message,href=null){
  clearTimeout(toastTimer);live.replaceChildren();const text=document.createElement('span');text.textContent=message;live.append(text);
  if(href){const a=document.createElement('a');a.href=href;a.target='_self';a.textContent='直接打开';live.append(a);}
  live.classList.add('show');toastTimer=setTimeout(()=>live.classList.remove('show'),href?15000:3200);
}
const chrome=createChrome(score,{announce});
const sendQuality=()=>document.querySelector('.experiment-frame')?.contentWindow?.postMessage({type:'visual-quality',value:visualQuality()},location.origin);
watchVisualQuality(()=>{world?.applyQuality();sendQuality();});
document.body.append(skip,stage,chrome.header,view,chrome.dock,chrome.corner,status,live,tooltip,preview,curtain);

function sceneStatus(progress,message,error){
  status.textContent=message;
  if(progress===1){status.classList.remove('loading');document.body.classList.remove('scene-failed');window.__error=null;window.__ready=true;}
  else if(progress<0){status.classList.remove('loading');document.body.classList.add('scene-failed');window.__error=error?.message||message;announce(message);}
  else{window.__ready=false;window.__error=null;status.classList.add('loading');status.style.setProperty('--progress',String(progress));}
}
function objectHover(id,event){
  tooltip.hidden=!id;
  if(id){tooltip.textContent=roomProject(id)?.label||CHAPTERS.find(c=>c.id===id)?.label||'';const half=tooltip.offsetWidth/2;tooltip.style.left=Math.max(half+8,Math.min(innerWidth-half-8,event.clientX))+'px';tooltip.style.top=Math.max(tooltip.offsetHeight*1.5+8,event.clientY)+'px';}
  stage.classList.toggle('has-hover',Boolean(id));
}
function objectFocus(id){
  explorer.show(id);
}
const explorer=createRoomExplorer(preview,{world:()=>world,score});
function unfocus(){world?.focus(null);}
try{world=new World(stage,score,{status:sceneStatus,onHover:objectHover,onPick:objectFocus,onPortal:point=>{
  curtain.style.setProperty('--portal-x',`${Math.max(.03,Math.min(.97,point.x))*100}%`);
  curtain.style.setProperty('--portal-y',`${Math.max(.03,Math.min(.97,point.y))*100}%`);
}});}
catch(error){console.error(error);document.body.classList.add('no-webgl');sceneStatus(-1,'当前设备暂时无法显示 3D，文字内容和导航仍可使用。',error);}

function stylesheet(href){
  if([...document.querySelectorAll('link[rel="stylesheet"]')].some(link=>new URL(link.href).pathname===href))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=href;
  document.head.insertBefore(link,document.querySelector('link[data-experience-style]'));
}
async function mount(doc,url){
  contentEvents?.abort();contentEvents=new AbortController();
  route=routeFor(url.pathname,doc);route.readingEntries=readingEntries(doc,route);document.body.dataset.chapter=route.id;
  if(route.id==='projects'){route.relay=createMessageRelay();route.compiler=createCompiler();route.vision=createVision();}
  if(route.id==='radio')route.radioPlayback=()=>({active:score.audible,time:score.time,cycle:score.rhythm.cycleBar/32,levels:score.levels()});
  document.body.classList.toggle('article-view',route.article);document.body.classList.toggle('experiment-view',route.experiment);
  explorer.reset();tooltip.hidden=true;
  document.title=doc.title||`${route.label} · eli3xir`;
  let description=document.head.querySelector('meta[name="description"]');
  if(!description){description=document.createElement('meta');description.name='description';document.head.append(description);}
  description.content=doc.querySelector('meta[name="description"]')?.content||route.subtitle;
  if(route.id==='blog')stylesheet('/css/blog.css');else if(route.id!=='home')stylesheet('/css/pages.css');
  const section=hero(route);const main=pageContent(doc,route);view.replaceChildren(section);if(main)view.append(main);
  if(route.id==='home'){section.querySelector('.chapter-dock').id='home-navigation';section.setAttribute('role','main');skip.href='#home-navigation';}
  else{skip.href='#content';const footer=document.createElement('footer');footer.className='studio-footer';footer.innerHTML='<span>eli3xir / A CABINET OF CURIOSITIES</span><span>© 2026 · KEEP WONDERING.</span>';view.append(footer);}
  world?.show(route);world?.applySkin(readSetting('room-skin','default'));score.scene(route.id);chrome.update(route);
  const reading=bindReading(section,route.readingEntries,{world,signal:contentEvents.signal,article:route.article});
  if(route.relay)bindProjectSignal(section,doc,{world,score,relay:route.relay,signal:contentEvents.signal});
  if(route.compiler)bindCompiler(section,main,{world,score,compiler:route.compiler,vision:route.vision,signal:contentEvents.signal});
  if(route.id==='radio')bindRadio(section,main,{world,score,signal:contentEvents.signal,announce});
  if(route.id==='skin')bindSkin(section,main,{world,score,signal:contentEvents.signal,announce});
  if(route.id==='about')bindAbout(section,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='ocean')bindOcean(section,main,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='partext')bindPartext(section,main,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='moon')bindMoon(section,main,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='fluid')bindFluid(section,main,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='trails')bindTrails(section,main,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='galaxy')bindGalaxy(section,main,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='glass')bindGlass(section,main,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='breakout')bindBreakout(section,main,{world,score,signal:contentEvents.signal});
  if(route.experimentId==='bullet')bindBullet(section,main,{world,score,signal:contentEvents.signal});
  if(route.id==='lab'&&!route.experiment&&world){
    const trigger=document.createElement('button');trigger.type='button';trigger.className='explore-button reaction-trigger';
    trigger.textContent='试一次反应 ↗';trigger.setAttribute('aria-label','触发药瓶反应');
    section.querySelector('.explore-button').before(trigger);trigger.addEventListener('click',()=>world.interact(),{signal:contentEvents.signal});
  }
  enhanceContent(main,route,{signal:contentEvents.signal,score,world,announce,reading});
  section.querySelector('[data-explore]')?.addEventListener('click',()=>{if(world?.model.loaded){world.focus('lab');score.cue('hover');}else announce('移动鼠标或轻轻拖动，点击桌上与墙上的物件。也可以使用下方入口。');},{signal:contentEvents.signal});
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    const delay=score.audible?nextBeatDelay(score.time)*1000:80;
    section.querySelectorAll('.hero-word').forEach((word,i)=>{
      const stagger=route.article?Math.min(i,12)*(60000/BPM/16):i*(60000/BPM/4);
      const animation=word.animate([{transform:'translateY(108%) rotate(2deg)',opacity:0},{transform:'translateY(0) rotate(0)',opacity:1}],{duration:score.audible?90000/BPM:780,delay:delay+stagger,easing:'cubic-bezier(.18,.75,.2,1)',fill:'both'});
      contentEvents.signal.addEventListener('abort',()=>animation.cancel(),{once:true});
    });
  }
  if(route.article&&doc.querySelector('script[src*="katex"]')&&!window.renderMathInElement)loadMath(main);
  document.querySelector('link[rel="canonical"]')?.setAttribute('href','https://eli3xir.github.io'+url.pathname);
}
async function loadMath(main){
  try{
    stylesheet('/vendor/katex/katex.min.css');
    for(const src of ['/vendor/katex/katex.min.js','/vendor/katex/auto-render.min.js']){
      if(document.querySelector(`script[data-math="${src}"]`))continue;
      await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.dataset.math=src;script.onload=resolve;script.onerror=reject;document.head.append(script);});
    }
    if(main.isConnected&&window.renderMathInElement)window.renderMathInElement(main.querySelector('.post-content'),{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},{left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}]});
  }catch{announce('公式渲染暂时未能加载，原始公式仍保留在文章中。');}
}
router=new Router({score,mount,announce,onIntent:url=>{
  const destination=routeFor(url.pathname);
  curtain.querySelector('.portal-label').textContent=`${destination.number} / ${destination.label}`;
  curtain.querySelector('.portal-heading').textContent=({home:'灯还亮着。',lab:'有点乱，有点意思。',blog:'给思路，找张纸。',radio:'好奇心，调到下一拍。',projects:'念头，开始通电。',about:'代码之外，还有本人。',skin:'今天，换个色温。'})[destination.id];
},transition:progress=>{
  curtain.style.setProperty('--portal',String(Math.max(0,(progress-.48)/.52)));
  world?.transitionAt(progress);view.style.setProperty('--page-shift',String(progress));
}});
addEventListener('keydown',event=>{if(event.key==='Escape'){unfocus();document.querySelector('.sound-settings').open=false;}});
addEventListener('message',event=>{
  const frame=document.querySelector('.experiment-frame');if(event.origin!==location.origin||event.source!==frame?.contentWindow)return;
  if(event.data?.type==='visual-quality-request')sendQuality();
  if(event.data?.type==='lab-navigate'&&typeof event.data.path==='string'&&event.data.path.startsWith('/'))router.navigate(event.data.path);
  if(event.data?.type==='lab-interact'&&!['breakout','bullet'].includes(route?.experimentId))score.cue('hover');if(event.data?.type==='lab-reveal'){score.cue('reveal');world?.actor.react();}
});
await mount(original,new URL(location.href));
window.studio={world,score,router,get route(){return route;},diagnostics:()=>world?.diagnostics()||{webgl:false}};
if(location.hash)setTimeout(()=>scrollToAnchor(location.hash),50);
