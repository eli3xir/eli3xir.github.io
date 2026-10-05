import test from 'node:test';import assert from 'node:assert/strict';
import {createConductorMotion} from '../../js/experience/conductor-motion.js';
const state=()=>({active:true,time:0,volume:.45,stems:[true,true,true,true],levels:[.15,.45,.5,.8]});
const snapshot=pose=>JSON.parse(JSON.stringify(pose));
function run(motion,input,from,to,step=1/120){for(let t=from;t<=to+1e-8;t+=step){input.time=t;motion.advance(input,t);}return snapshot(motion.pose);}

test('actual stems produce distinct gestures over the musical phrase',()=>{
 const lead=createConductorMotion(),drums=createConductorMotion(),a=state(),b=state();a.levels=[0,0,.8,0];b.levels=[0,0,0,.8];
 let leftDifference=0,rightDifference=0;
 for(let i=0;i<480;i++){
  a.time=b.time=i/120;const first=lead.advance(a,a.time),second=drums.advance(b,b.time);
  leftDifference=Math.max(leftDifference,Math.abs(first.leftZ-second.leftZ));rightDifference=Math.max(rightDifference,Math.abs(first.rightX-second.rightX));
  assert.equal(first.mode,'conducting');assert.equal(first.foot,0);
 }
 assert.ok(leftDifference>.1);assert.ok(rightDifference>.04);
});
test('mute listens after a short hesitation, while a musical rest retains the count',()=>{
 const motion=createConductorMotion(),s=state();run(motion,s,0,1);
 s.levels.fill(0);motion.advance(s,1.2);assert.equal(motion.pose.mode,'conducting');
 s.stems.fill(false);motion.advance(s,1.3);assert.equal(motion.pose.mode,'rest');
 run(motion,s,1.31,2.5);assert.equal(motion.pose.mode,'listening');assert.ok(motion.pose.tilt>.25);
 s.stems.fill(true);s.volume=0;run(motion,s,2.51,3);assert.equal(motion.pose.mode,'listening');
});
test('pause and quick reversals preserve pose and settle using UI time',()=>{
 const motion=createConductorMotion(),s=state();run(motion,s,0,1);const before=snapshot(motion.pose);
 s.active=false;motion.advance(s,1);for(const key of ['pitch','yaw','leftZ','rightZ'])assert.ok(Math.abs(motion.pose[key]-before[key])<1e-12);
 const audio=s.time;for(let i=1;i<=240;i++)motion.advance(s,1+i/120);
 assert.equal(s.time,audio);assert.ok(Math.abs(motion.pose.rightZ)<1e-8);assert.ok(Math.abs(motion.pose.leftZ)<1e-8);
 for(let i=0;i<240;i++){s.active=i%13<7;s.time+=1/120;motion.advance(s,3+i/120);for(const value of Object.values(motion.pose).filter(v=>typeof v==='number'))assert.ok(Number.isFinite(value)&&Math.abs(value)<2);}
});
test('reduced motion clears residual movement and subsequent play starts from rest',()=>{
 const motion=createConductorMotion(),s=state();run(motion,s,0,2);motion.advance(s,2.1,true);
 assert.equal(motion.pose.mode,'rest');for(const key of ['pitch','yaw','lift','leftZ','rightZ','foot','antenna'])assert.equal(motion.pose[key],0);
 motion.advance(s,2.1);assert.equal(motion.pose.rightZ,0);assert.equal(motion.pose.leftZ,0);
});

test('steady downstrokes arrive within 55 milliseconds of the audio beat',()=>{
 const motion=createConductorMotion(),s=state(),samples=[];
 for(let i=0;i<1920;i++){s.time=i/240;const pose=motion.advance(s,s.time);samples.push({time:s.time,stroke:pose.rightZ});}
 for(let beat=4;beat<13;beat++){
  const at=beat*60/112,near=samples.filter(sample=>Math.abs(sample.time-at)<.15),low=near.reduce((a,b)=>a.stroke<b.stroke?a:b);
  assert.ok(Math.abs(low.time-at)<.055,JSON.stringify({beat,at,low}));
 }
});
