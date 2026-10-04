// An accelerated, illustrative exposure. The procedural stars are not a catalogue.
export const SIDEREAL_HOURS=23.9345,EXPOSURES=[1,3,6];
export const exposureAngle=hours=>hours/SIDEREAL_HOURS*Math.PI*2;
export const meteorProgress=state=>Math.sin(state.start*37+1)>.35?Math.max(0,Math.min(1,(state.progress-.62)/.13)):0;
export function starSeeds(count=900){
 let seed=7321;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 return Array.from({length:count},(_,i)=>{const z=.055+random()*.94,r=Math.sqrt(1-z*z);return{r,z,angle:random()*Math.PI*2,brightness:.25+random()**3*.75,warm:random()>.70,size:i%53===0?1.9:.65+random()*.7};});
}
export function rotateStar(star,angle,pole=[0,0]){
 const p=[star.r*Math.cos(star.angle+angle),star.r*Math.sin(star.angle+angle),star.z],x=pole[0]*.6,y=pole[1]*.6,z=1,n=Math.hypot(x,y,z),ax=x/n,ay=y/n,az=z/n;
 // Minimal rotation from +Z to the selected axis; Rodrigues in expanded form.
 const k=1/(1+az),dot=ax*p[0]+ay*p[1];return[p[0]-ax*dot*k+ax*p[2],p[1]-ay*dot*k+ay*p[2],-dot+az*p[2]];
}
export function createExposure({beat=60/112}={}){
 const duration=8*beat;let hours=3,recorded=0,start=0,elapsed=0,delay=0,mode='ready',pole=[0,0],target=[0,0],paused=false;
 const api={duration,select(value){if(EXPOSURES.includes(value)&&mode!=='exposing')hours=value;},
  aim(x,y){if(Number.isFinite(x)&&Number.isFinite(y))target=[Math.max(-.85,Math.min(.85,x)),Math.max(-.7,Math.min(.7,y))];},
  launch({wait=0,reduced=false}={}){if(mode==='exposing')return false;start+=exposureAngle(recorded);recorded=0;elapsed=0;delay=Math.max(0,wait);mode='exposing';paused=false;if(reduced){recorded=hours;elapsed=duration;mode='complete';delay=0;}return true;},
  pause(value){paused=Boolean(value);},
  reset(){recorded=0;elapsed=0;delay=0;mode='ready';paused=false;},
  update(dt,reduced=false){if(!Number.isFinite(dt)||dt<0)return false;const k=reduced?1:1-Math.exp(-dt*9);pole=pole.map((value,i)=>Math.abs(target[i]-value)<.00001?target[i]:value+(target[i]-value)*k);if(mode!=='exposing'||paused)return false;
   const remaining=Math.max(0,dt-delay);delay=Math.max(0,delay-dt);elapsed=Math.min(duration,elapsed+remaining);recorded=hours*elapsed/duration;if(elapsed===duration){mode='complete';return true;}return false;
  },
  snapshot(){return{hours,recorded,start,elapsed,delay,mode,pole:[...pole],target:[...target],paused};},
  restore(s){if(!s||!EXPOSURES.includes(s.hours)||!['ready','exposing','complete'].includes(s.mode)||![s.recorded,s.start,s.elapsed,s.delay].every(Number.isFinite)||![s.pole,s.target].every(a=>Array.isArray(a)&&a.length===2&&a.every(Number.isFinite)))return false;
   hours=s.hours;recorded=Math.max(0,Math.min(6,s.recorded));start=s.start%(Math.PI*2);elapsed=Math.max(0,Math.min(duration,s.elapsed));delay=Math.max(0,Math.min(1,s.delay));mode=s.mode;paused=Boolean(s.paused);pole=s.pole.map((v,i)=>Math.max(i?-.7:-.85,Math.min(i?.7:.85,v)));target=s.target.map((v,i)=>Math.max(i?-.7:-.85,Math.min(i?.7:.85,v)));return true;
  },
  get state(){return{...api.snapshot(),angle:exposureAngle(recorded),progress:elapsed/duration};}
 };return api;
}
