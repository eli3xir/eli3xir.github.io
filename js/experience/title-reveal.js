import {nextBeatDelay} from './domain.js';
import {BPM} from '../audio/composition.js';

// The destination title waits for the real circular curtain to leave its box.
// Its Web Animations then share one document-timeline origin and musical grid.
export function createTitleReveal(section,route,{score,signal,held=false}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches)return{reveal(){}};
 const title=section.querySelector('.hero-title'),beat=60000/BPM;
 const animations=[...section.querySelectorAll('.hero-word')].map((word,i)=>{
  const animation=word.animate([
   {transform:'translateY(108%) rotate(2deg)',opacity:0},
   {transform:'translateY(0) rotate(0)',opacity:1}
  ],{duration:score.audible?beat*1.5:780,delay:route.article?Math.min(i,12)*beat/16:i*beat/4,
   easing:'cubic-bezier(.18,.75,.2,1)',fill:'both'});
  animation.pause();animation.currentTime=0;return animation;
 });
 let waiting=held,disposed=false;
 function play(initial=false){
  if(disposed)return;
  waiting=false;
  const delay=score.audible?nextBeatDelay(score.time)*1000:initial?80:0;
  const start=document.timeline.currentTime+delay;
  for(const animation of animations){animation.play();animation.startTime=start;}
 }
 function finish(){if(reduced.matches){waiting=false;for(const animation of animations)animation.finish();}}
 reduced.addEventListener('change',finish);
 signal.addEventListener('abort',()=>{
  disposed=true;waiting=false;reduced.removeEventListener('change',finish);
  for(const animation of animations)animation.cancel();
 },{once:true});
 if(!held)play(true);
 return{reveal(cover,point){
  if(!waiting||disposed)return;
  if(cover<=0){play();return;}
  const rect=title.getBoundingClientRect(),x=point.centerX,y=point.centerY;
  const dx=Math.max(rect.left-x,0,x-rect.right),dy=Math.max(rect.top-y,0,y-rect.bottom);
  // Use the same measured reference box and radius as the actual CSS curtain.
  const radius=cover*point.radius;
  if(Math.hypot(dx,dy)>radius+4)play();
 }};
}
