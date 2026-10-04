export const BULLET={width:1.78,height:2.18,step:1/120,capacity:8000,stride:7,hitRadius:.052,grazeRadius:.15};
export const PATTERNS=['螺旋','花瓣','瞄准'],BULLET_COLORS=[0xe7ad72,0xe59fae,0x86cbd2,0xcab9ea,0xd1dfb0];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function closestApproach(ax,ay,bx,by){const dx=bx-ax,dy=by-ay,t=clamp(-(ax*dx+ay*dy)/(dx*dx+dy*dy||1),0,1);return{distance:Math.hypot(ax+dx*t,ay+dy*t),t};}
export function fieldPoint(x,y){const r=Math.hypot(x/BULLET.width,y/BULLET.height);return r>1?{x:x/r,y:y/r}:{x,y};}
const initial=()=>({x:0,y:-1.35,tx:0,ty:-1.35,lives:3,graze:0,tick:0,accumulator:0,wait:0,status:'ready',paused:false,choice:-1,mode:0,modeTick:0,angle:0,aim:-Math.PI/2,bx:0,by:1.25,invincible:0,count:0,serial:0,flash:-10,lastGraze:-10,effects:[]});
export function createBulletState(){
 let s=initial();const data=new Float64Array(BULLET.capacity*BULLET.stride),events=[];
 function event(kind,x=s.x,y=s.y){const e={kind,x,y,tick:s.tick};events.push(e);if(kind==='hit'||kind==='graze'){s.effects.push(e);s.effects=s.effects.slice(-32);}return e;}
 function spawn(a,speed,color){if(s.count===BULLET.capacity)return;const i=s.count++*BULLET.stride;data.set([s.bx+Math.cos(a)*.18,s.by+Math.sin(a)*.18,Math.cos(a)*speed,Math.sin(a)*speed,color,0,++s.serial],i);}
 function emit(){if(s.mode===0&&s.modeTick%6===0){s.angle+=.11;for(let arm=0;arm<3;arm++)spawn(s.angle+arm*Math.PI*2/3,.99,arm);}else if(s.mode===1&&s.modeTick%52===0){s.angle+=.3;for(let i=0;i<18;i++)spawn(s.angle+i*Math.PI/9,i%2?1.035:.72,i%5);}else if(s.mode===2&&s.modeTick%60===0){s.aim=Math.atan2(s.y-s.by,s.x-s.bx);for(let i=-1;i<=1;i++)spawn(s.aim+i*.18,1.44,4);}}
 function step(){
  const dt=BULLET.step,oldX=s.x,oldY=s.y,dx=s.tx-s.x,dy=s.ty-s.y,length=Math.hypot(dx,dy),ratio=Math.min(1,12*dt/(length||1));s.x+=dx*ratio;s.y+=dy*ratio;
  if(s.wait>0){s.wait=Math.max(0,s.wait-dt);return;}
  s.tick++;s.invincible=Math.max(0,s.invincible-1);s.effects=s.effects.filter(e=>s.tick-e.tick<90);const mode=s.choice<0?Math.floor((s.tick-1)/1200)%3:s.choice;if(mode!==s.mode){s.mode=mode;s.modeTick=0;event('pattern');}s.modeTick++;s.bx=Math.sin(s.tick*.004)*.88;s.by=1.05+Math.cos(s.tick*.0055)*.35;emit();
  for(let n=s.count-1;n>=0;n--){const i=n*BULLET.stride,x=data[i],y=data[i+1];data[i]+=data[i+2]*dt;data[i+1]+=data[i+3]*dt;const approach=closestApproach(x-oldX,y-oldY,data[i]-s.x,data[i+1]-s.y);
   if(approach.distance<BULLET.hitRadius){if(!s.invincible){s.lives--;s.invincible=300;s.flash=s.tick;event('hit');if(s.lives===0)s.status='over';}}
   else if(approach.distance<BULLET.grazeRadius&&!data[i+5]){data[i+5]=1;s.graze++;s.lastGraze=s.tick;event('graze',data[i],data[i+1]);}
   if(Math.hypot(data[i]/(BULLET.width+.12),data[i+1]/(BULLET.height+.12))>1){s.count--;if(n<s.count)data.copyWithin(i,s.count*BULLET.stride,(s.count+1)*BULLET.stride);}
  }
 }
 return{get state(){return s;},data,
  move(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return;const p=fieldPoint(x,y);s.tx=p.x;s.ty=p.y;if(s.status==='ready'){s.x=p.x;s.y=p.y;}},
  choose(value){if(!Number.isInteger(value)||value< -1||value>2)return;s.choice=value;if(s.status==='ready'&&value>=0)s.mode=value;},
  pause(value){s.paused=Boolean(value);},reset(){const choice=s.choice;s=initial();s.choice=choice;if(choice>=0)s.mode=choice;events.length=0;},
  launch({wait=0}={}){if(s.status==='over')this.reset();if(s.status!=='ready')return false;s.status='playing';s.paused=false;s.wait=clamp(Number(wait)||0,0,1);return true;},
  update(dt){events.length=0;if(s.status!=='playing'||s.paused||!Number.isFinite(dt)||dt<0)return events;s.accumulator=Math.min(.12,s.accumulator+dt);while(s.accumulator+1e-10>=BULLET.step){s.accumulator=Math.max(0,s.accumulator-BULLET.step);step();if(s.status==='over'){s.accumulator=0;break;}}if(s.accumulator<1e-10)s.accumulator=0;return events;},
  snapshot(){return{...s,effects:s.effects.map(e=>({...e})),bullets:data.slice(0,s.count*BULLET.stride)};},
  restore(v){const nums=['x','y','tx','ty','lives','graze','tick','accumulator','wait','choice','mode','modeTick','angle','aim','bx','by','invincible','count','serial','flash','lastGraze'];if(!v||nums.some(k=>!Number.isFinite(v[k]))||!['ready','playing','over'].includes(v.status)||typeof v.paused!=='boolean'||!(v.bullets instanceof Float64Array)||v.bullets.length!==v.count*BULLET.stride||v.count<0||v.count>BULLET.capacity||!Array.isArray(v.effects)||v.effects.length>32)return false;
   if(['lives','graze','tick','choice','mode','modeTick','invincible','count','serial'].some(k=>!Number.isInteger(v[k]))||v.lives<0||v.lives>3||v.graze<0||v.tick<0||v.modeTick<0||v.choice< -1||v.choice>2||v.mode<0||v.mode>2||v.invincible<0||v.invincible>300||v.serial<0||v.accumulator<0||v.accumulator>BULLET.step||v.wait<0||v.wait>1||Math.hypot(v.x/BULLET.width,v.y/BULLET.height)>1.000001||Math.hypot(v.tx/BULLET.width,v.ty/BULLET.height)>1.000001||Math.abs(v.bx)>1||v.by<.5||v.by>1.5)return false;
   for(let i=0;i<v.bullets.length;i+=BULLET.stride){if(Array.from(v.bullets.subarray(i,i+7)).some(n=>!Number.isFinite(n))||Math.abs(v.bullets[i])>2.1||Math.abs(v.bullets[i+1])>2.5||Math.abs(v.bullets[i+2])>5||Math.abs(v.bullets[i+3])>5||!Number.isInteger(v.bullets[i+4])||v.bullets[i+4]<0||v.bullets[i+4]>4||![0,1].includes(v.bullets[i+5])||!Number.isInteger(v.bullets[i+6])||v.bullets[i+6]<1||v.bullets[i+6]>v.serial)return false;}
   if(v.effects.some(e=>!['hit','graze'].includes(e.kind)||['x','y','tick'].some(k=>!Number.isFinite(e[k]))||e.tick>v.tick||v.tick-e.tick>90))return false;
   const {bullets,...rest}=v;s={...rest,effects:v.effects.map(e=>({...e}))};data.set(bullets);events.length=0;return true;}
 };
}
