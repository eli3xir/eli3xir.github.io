// A stylized automatic final approach, not an Apollo guidance simulation.
export const LUNAR_GRAVITY=1.624,APPROACH_HEIGHT=3.8,APPROACH_DURATION=12*60/112;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function flightSample(elapsed,mode='descending'){
 const p=clamp(elapsed/APPROACH_DURATION,0,1),s=p*p*p*(10+p*(-15+6*p));
 const velocity=-APPROACH_HEIGHT*30*p*p*(1-p)*(1-p)/APPROACH_DURATION;
 const acceleration=-APPROACH_HEIGHT*60*p*(1-p)*(1-2*p)/(APPROACH_DURATION**2);
 return{altitude:mode==='ready'?APPROACH_HEIGHT:APPROACH_HEIGHT*(1-s),velocity:mode==='descending'?velocity:0,
  thrust:mode==='descending'&&p<1?LUNAR_GRAVITY+acceleration:0,progress:p};
}
export function createFlight(){
 let mode='ready',elapsed=0,delay=0;
 return{start(wait=0){if(mode!=='ready')return false;mode='descending';delay=Math.max(0,wait);return true;},
  reset(){mode='ready';elapsed=delay=0;},
  step(dt){if(mode==='landed'){elapsed=Math.min(APPROACH_DURATION+4,elapsed+dt);return false;}if(mode!=='descending')return false;const advance=Math.max(0,dt-delay);delay=Math.max(0,delay-dt);elapsed=Math.min(APPROACH_DURATION,elapsed+advance);if(elapsed===APPROACH_DURATION){mode='landed';return true;}return false;},
  finish(){mode='landed';elapsed=APPROACH_DURATION;delay=0;},
  snapshot(){return{mode,elapsed,delay};},
  restore(value){if(!value||!['ready','descending','landed'].includes(value.mode)||!Number.isFinite(value.elapsed)||!Number.isFinite(value.delay))return false;mode=value.mode;elapsed=clamp(value.elapsed,0,APPROACH_DURATION+4);delay=clamp(value.delay,0,1);if(mode==='ready')elapsed=0;if(mode==='landed')elapsed=Math.max(elapsed,APPROACH_DURATION);return true;},
  sample(){return{...flightSample(elapsed,mode),mode,elapsed,delay};}
 };
}
