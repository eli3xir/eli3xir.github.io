const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>t*t*t*(10+t*(-15+6*t));
const finiteKeys=['band','targetBand','fromBand','bandElapsed','bandDelay','angle','spin','spinDelay','yaw','tilt','zoom','targetYaw','targetTilt','targetZoom'];
export function createGalaxyState({beat=60/112}={}){
 const duration=4*beat;
 let s={band:0,targetBand:0,fromBand:0,bandElapsed:duration,bandDelay:0,angle:0,spin:0,spinDelay:0,paused:false,yaw:0,tilt:.68,zoom:1.15,targetYaw:0,targetTilt:.68,targetZoom:1.15};
 const api={duration,
  selectBand(value,{wait=0,reduced=false}={}){if(![0,1].includes(value)||value===s.targetBand)return false;s.fromBand=s.band;s.targetBand=value;s.bandElapsed=reduced?duration:0;s.bandDelay=reduced?0:clamp(Number.isFinite(wait)?wait:0,0,1);if(reduced)s.band=value;return true;},
  orbit(yaw,tilt){if(Number.isFinite(yaw)&&Number.isFinite(tilt)){s.targetYaw=clamp(yaw,-Math.PI,Math.PI);s.targetTilt=clamp(tilt,.035,1.5);}},
  zoom(value){if(Number.isFinite(value))s.targetZoom=clamp(value,.65,1.5);},
  view(name){if(name==='face')api.orbit(0,1.45);if(name==='edge')api.orbit(0,.06);if(name==='home'){api.orbit(0,.68);api.zoom(1.15);}},
  push({wait=0,reduced=false}={}){if(reduced){s.angle=(s.angle+.55)%TAU;return;}s.spin=1.15;s.spinDelay=clamp(Number.isFinite(wait)?wait:0,0,1);s.paused=false;},
  pause(value){s.paused=Boolean(value);},
  update(dt,reduced=false){if(!Number.isFinite(dt)||dt<0)return false;let complete=false;
   if(s.bandElapsed<duration){const remaining=Math.max(0,dt-s.bandDelay);s.bandDelay=Math.max(0,s.bandDelay-dt);s.bandElapsed=reduced?duration:Math.min(duration,s.bandElapsed+remaining);s.band=s.fromBand+(s.targetBand-s.fromBand)*smooth(s.bandElapsed/duration);complete=s.bandElapsed===duration;}
   const k=1-Math.exp(-dt*8);for(const [key,target] of [['yaw','targetYaw'],['tilt','targetTilt'],['zoom','targetZoom']])s[key]=reduced||Math.abs(s[key]-s[target])<1e-5?s[target]:s[key]+(s[target]-s[key])*k;
   if(!s.paused&&!reduced){const remaining=Math.max(0,dt-s.spinDelay);s.spinDelay=Math.max(0,s.spinDelay-dt);const after=s.spin*Math.exp(-remaining*2.2);s.angle=(s.angle+.022*dt+(s.spin-after)/2.2)%TAU;s.spin=after<1e-6?0:after;}
   return complete;
  },
  snapshot(){return{...s};},
  restore(value){if(!value||!finiteKeys.every(key=>Number.isFinite(value[key]))||![0,1].includes(value.targetBand))return false;
   s={...Object.fromEntries(finiteKeys.map(key=>[key,value[key]])),paused:Boolean(value.paused)};s.band=clamp(s.band,0,1);s.fromBand=clamp(s.fromBand,0,1);s.bandElapsed=clamp(s.bandElapsed,0,duration);s.bandDelay=clamp(s.bandDelay,0,1);s.spinDelay=clamp(s.spinDelay,0,1);s.spin=clamp(s.spin,0,1.15);s.angle%=TAU;if(s.angle<0)s.angle+=TAU;
   for(const key of ['yaw','targetYaw'])s[key]=clamp(s[key],-Math.PI,Math.PI);for(const key of ['tilt','targetTilt'])s[key]=clamp(s[key],.035,1.5);for(const key of ['zoom','targetZoom'])s[key]=clamp(s[key],.65,1.5);return true;
  },
  get state(){return{...s,changing:s.bandElapsed<duration,progress:s.bandElapsed/duration};}
 };return api;
}
