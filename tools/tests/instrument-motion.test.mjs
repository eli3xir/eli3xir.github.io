import test from 'node:test';
import assert from 'node:assert/strict';
import {createInstrumentMotion} from '../../js/experience/instrument-motion.js';
const ids=['signal','compiler','vision'];
function bounded(levels){
  assert.ok(Object.values(levels).every(v=>Number.isFinite(v)&&v>=0&&v<=1),JSON.stringify(levels));
  assert.ok(Object.values(levels).filter(v=>v>0).length<=1,'two rigid instruments share the opening');
}
test('each pair clears the shaft before emergence and completes on its finite deadline',()=>{
  for(const from of ids)for(const to of ids.filter(id=>id!==from)){
    const motion=createInstrumentMotion();motion.select(from,{now:0,reduced:true});motion.advance(0,true);
    const initial={...motion.levels};motion.select(to,{now:1,delay:.25,duration:2});assert.deepEqual(motion.levels,initial);
    for(let i=0;i<=400;i++)bounded(motion.advance(1+i/200));
    assert.deepEqual(motion.advance(3.25),Object.fromEntries(ids.map(id=>[id,Number(id===to)])));
  }
});
test('rapid reversals inherit position and velocity, brake within bounds and keep one shaft occupant',()=>{
  const motion=createInstrumentMotion();let now=0;motion.select('vision',{now,duration:1});
  let seed=713;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let i=0;i<180;i++){
    const end=now+.01+random()*.31;for(let t=now;t<end;t+=.0007)bounded(motion.advance(t));now=end;
    const before={...motion.advance(now)},velocity=motion.velocities(now);
    const id=ids.filter(id=>id!==motion.selected)[i%2];motion.select(id,{now,duration:.4+random()});
    assert.deepEqual(motion.levels,before);motion.advance(now);
    for(const key of ids){assert.ok(Math.abs(motion.levels[key]-before[key])<1e-12);assert.ok(Math.abs(motion.velocities(now)[key]-velocity[key])<1e-9);}
  }
  bounded(motion.advance(now+3));assert.equal(motion.levels[motion.selected],1);
});
test('beat waiting continues old motion, future choices replace cleanly, and skipped RAF samples exact boundaries',()=>{
  const dense=createInstrumentMotion(),sparse=createInstrumentMotion();
  for(const m of [dense,sparse])m.select('vision',{now:0,duration:1});
  dense.advance(.13);sparse.advance(.13);
  for(const m of [dense,sparse])m.select('compiler',{now:.13,delay:.2,duration:1});
  const before=dense.levels.signal;dense.advance(.2);assert.ok(dense.levels.signal<before,'waiting for music froze the old motion');
  for(const m of [dense,sparse])m.select('signal',{now:.23,delay:.12,duration:1});
  for(let t=.24;t<=.6;t+=.001)dense.advance(t);
  assert.deepEqual(sparse.advance(.6),dense.advance(.6));
  assert.deepEqual(sparse.advance(2),{signal:1,compiler:0,vision:0});
  // A due command cannot be erased just because its RAF has not run yet.
  const m=createInstrumentMotion();m.select('vision',{now:0,duration:1});m.select('compiler',{now:.2,duration:1});
  const reference=createInstrumentMotion();reference.select('vision',{now:0,duration:1});reference.advance(.2);reference.select('compiler',{now:.2,duration:1});
  assert.deepEqual(m.advance(.5),reference.advance(.5));
});
test('reduced motion settles the latest delayed choice and zero duration remains finite',()=>{
  const motion=createInstrumentMotion();motion.select('vision',{now:0,delay:.4});motion.select('compiler',{now:.1,delay:.5});
  assert.deepEqual(motion.advance(.2,true),{signal:0,compiler:1,vision:0});
  motion.select('signal',{now:1,duration:0});assert.deepEqual(motion.advance(1),{signal:1,compiler:0,vision:0});
  motion.select('missing',{now:2});assert.equal(motion.selected,'signal');
});
