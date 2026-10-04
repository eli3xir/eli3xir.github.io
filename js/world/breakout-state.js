import {sweepCircleRect} from './breakout-collision.js';
export const BREAKOUT={left:-1.8,right:1.8,top:2.0,bottom:-2.13,radius:.064,paddleY:-1.72,paddleW:.76,paddleH:.11,step:1/120};
export const BRICKS=Array.from({length:45},(_,i)=>({id:i,row:Math.floor(i/9),x:(i%9-4)*.37,y:1.52-Math.floor(i/9)*.255,w:.33,h:.18}));
export const BRICK_COLORS=[0xc87968,0xd1a66f,0xd9c793,0x87b5a5,0x819cae];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),limit=BREAKOUT.right-BREAKOUT.paddleW/2,initial=()=>({x:0,y:BREAKOUT.paddleY+.16,vx:0,vy:0,paddle:0,target:0,aim:.12,score:0,lives:3,status:'ready',paused:false,wait:0,speed:2.2,accumulator:0,time:0,serve:0,hits:0,paddleHit:-10,bricks:BRICKS.map(()=>true),bursts:[],trail:[]});
export function createBreakoutState(){
 let s=initial();const events=[],idle=()=>s.status!=='playing'&&s.target===s.paddle&&!s.bursts.length&&s.time-s.paddleHit>1.35;
 function hit(kind,x,y,extra={}){const event={kind,x,y,time:s.time,...extra};events.push(event);if(kind==='brick')s.bursts.push(event);}
 function advance(dt){
  s.time+=dt;s.bursts=s.bursts.filter(b=>s.time-b.time<1.35);const start=s.paddle;s.paddle+=clamp(s.target-s.paddle,-7*dt,7*dt);const pv=(s.paddle-start)/dt;
  if(s.status!=='playing'){s.trail=[];if(s.status==='ready'){s.x=s.paddle;s.y=BREAKOUT.paddleY+.16;}return;}
  if(s.wait>0){s.wait=Math.max(0,s.wait-dt);s.x=s.paddle;s.trail=[];return;}
  let remaining=dt,elapsed=0;
  for(let iteration=0;iteration<12&&remaining>1e-9;iteration++){
   let next=null;const take=(contact,kind,index)=>{if(contact&&contact.time>=0&&contact.time<=remaining&&(!next||contact.time<next.time-1e-9))next={...contact,kind,index};};
   if(s.vx<0)take({time:(BREAKOUT.left+BREAKOUT.radius-s.x)/s.vx,nx:1,ny:0},'wall');
   if(s.vx>0)take({time:(BREAKOUT.right-BREAKOUT.radius-s.x)/s.vx,nx:-1,ny:0},'wall');
   if(s.vy>0)take({time:(BREAKOUT.top-BREAKOUT.radius-s.y)/s.vy,nx:0,ny:-1},'wall');
   if(s.vy<0){take({time:(BREAKOUT.bottom-s.y)/s.vy,nx:0,ny:1},'miss');const p=sweepCircleRect(s.x,s.y,s.vx-pv,s.vy,BREAKOUT.radius,{x:start+pv*elapsed,y:BREAKOUT.paddleY,w:BREAKOUT.paddleW,h:BREAKOUT.paddleH},remaining);if(p&&p.ny>0)take(p,'paddle');}
   for(const brick of BRICKS)if(s.bricks[brick.id])take(sweepCircleRect(s.x,s.y,s.vx,s.vy,BREAKOUT.radius,brick,remaining),'brick',brick.id);
   const consumed=next?next.time:remaining;s.x+=s.vx*consumed;s.y+=s.vy*consumed;remaining-=consumed;elapsed+=consumed;if(!next)break;
   if(next.kind==='miss'){s.lives--;s.status=s.lives?'ready':'over';s.vx=s.vy=0;hit('miss',s.x,s.y);if(s.lives){s.x=s.paddle;s.y=BREAKOUT.paddleY+.16;}break;}
   if(next.kind==='paddle'){const offset=clamp((s.x-(start+pv*elapsed))/(BREAKOUT.paddleW/2),-1,1),angle=offset*1.03;s.vx=Math.sin(angle)*s.speed;s.vy=Math.cos(angle)*s.speed;s.paddleHit=s.time;hit('paddle',s.x,s.y);}
   else{const d=s.vx*next.nx+s.vy*next.ny;s.vx-=2*d*next.nx;s.vy-=2*d*next.ny;
    if(next.kind==='brick'){s.bricks[next.index]=false;s.hits++;s.score+=(5-BRICKS[next.index].row)*10;s.speed=Math.min(3.8,s.speed+.03);const length=Math.hypot(s.vx,s.vy);s.vx=s.vx/length*s.speed;s.vy=s.vy/length*s.speed;hit('brick',s.x,s.y,{id:next.index,nx:next.nx,ny:next.ny});if(s.hits===45){s.status='won';s.vx=s.vy=0;hit('won',s.x,s.y);break;}}
    else hit('wall',s.x,s.y);
   }
   s.x+=next.nx*1e-7;s.y+=next.ny*1e-7;
  }
  if(s.status==='playing'){s.trail.unshift({x:s.x,y:s.y});s.trail.length=Math.min(10,s.trail.length);}else s.trail=[];
 }
 return{get state(){return s;},move(x){if(Number.isFinite(x))s.target=clamp(x,-limit,limit);},aim(value){if(Number.isFinite(value))s.aim=clamp(value,-.75,.75);},pause(value){s.paused=Boolean(value);},reset(){s=initial();events.length=0;},
  launch({wait=0}={}){if(s.status==='won'||s.status==='over'){s=initial();events.length=0;}if(s.status!=='ready')return false;s.status='playing';s.paused=false;s.wait=clamp(Number(wait)||0,0,1);s.x=s.paddle;s.y=BREAKOUT.paddleY+.16;s.vx=Math.sin(s.aim)*s.speed;s.vy=Math.cos(s.aim)*s.speed;s.serve++;hit('serve',s.x,s.y);return true;},
  update(dt){events.length=0;if(s.paused||!Number.isFinite(dt)||dt<0||idle())return events;s.accumulator=Math.min(.12,s.accumulator+dt);while(s.accumulator+1e-10>=BREAKOUT.step){s.accumulator=Math.max(0,s.accumulator-BREAKOUT.step);advance(BREAKOUT.step);if(idle()){s.accumulator=0;break;}}if(s.accumulator<1e-10)s.accumulator=0;return events;},
  snapshot(){return{...s,bricks:[...s.bricks],bursts:s.bursts.map(b=>({...b})),trail:s.trail.map(p=>({...p}))};},
  restore(v){const nums=['x','y','vx','vy','paddle','target','aim','score','lives','wait','speed','accumulator','time','serve','hits','paddleHit'];if(!v||nums.some(k=>!Number.isFinite(v[k]))||!['ready','playing','won','over'].includes(v.status)||typeof v.paused!=='boolean'||!Array.isArray(v.bricks)||v.bricks.length!==45||v.bricks.some(b=>typeof b!=='boolean')||!Array.isArray(v.bursts)||v.bursts.length>45||!Array.isArray(v.trail)||v.trail.length>10||v.trail.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>2.1||p.y< -2.3||p.y>2.1))return false;
   if(Math.abs(v.x)>2.1||v.y< -2.3||v.y>2.1||Math.abs(v.vx)>10||Math.abs(v.vy)>10||Math.abs(v.paddle)>limit+1e-8||Math.abs(v.target)>limit+1e-8||Math.abs(v.aim)>.75||v.lives<0||v.lives>3||!Number.isInteger(v.lives)||v.hits!==v.bricks.filter(b=>!b).length||v.score!==BRICKS.reduce((sum,b)=>sum+(v.bricks[b.id]?0:(5-b.row)*10),0)||v.wait<0||v.wait>1||v.speed<2.2||v.speed>3.8||v.accumulator<0||v.accumulator>BREAKOUT.step||v.time<0)return false;
   if(v.bursts.some(b=>b.kind!=='brick'||!Number.isInteger(b.id)||b.id<0||b.id>=45||['time','x','y','nx','ny'].some(k=>!Number.isFinite(b[k]))||b.time>v.time||v.time-b.time>1.36))return false;s={...v,bricks:[...v.bricks],bursts:v.bursts.map(b=>({...b})),trail:v.trail.map(p=>({...p}))};events.length=0;return true;}
 };
}
