import test from 'node:test';import assert from 'node:assert/strict';
import {createGlassState} from '../../js/world/glass-state.js';
import {lensOffset} from '../../js/experience/glass-optics.js';
test('glass spring preserves elapsed-time behavior, freeze and exact snapshots',()=>{
 const slow=createGlassState(),fast=createGlassState();for(const [model,hz]of [[slow,30],[fast,120]]){model.move(.8,-.6);model.focus(.95);for(let i=0;i<hz;i++)model.update(1/hz);}for(const key of ['x','y','vx','vy','power'])assert.ok(Math.abs(slow.state[key]-fast.state[key])<1e-10,key);slow.freeze(true);const before=slow.snapshot();slow.update(.25);assert.equal(slow.state.x,before.x);assert.equal(slow.state.y,before.y);const clone=createGlassState();assert.ok(clone.restore(slow.snapshot()));assert.deepEqual(clone.snapshot(),slow.snapshot());assert.equal(clone.restore({...before,x:NaN}),false);
});
test('glass stamp keeps one queued impression and counts real completion',()=>{
 const model=createGlassState();model.press('stamp',{wait:.2});model.update(.1);assert.equal(model.state.stampElapsed,0);model.press('stamp');model.press('stamp');assert.equal(model.state.stampQueued,true);model.update(.7);assert.equal(model.state.stampCount,1);assert.equal(model.state.stampElapsed,0);model.update(.6);assert.equal(model.state.stampCount,2);assert.equal(model.state.stampQueued,false);model.press('stamp',{reduced:true});assert.equal(model.state.stampCount,3);model.press('ink');model.press('count');assert.equal(model.state.ink,1);assert.equal(model.state.count,1);
});
test('single-interface lens field stays inward, finite and symmetric',()=>{
 assert.ok(lensOffset(0,0).every(value=>Math.abs(value)===0));assert.deepEqual(lensOffset(1,0),[0,0]);for(let i=1;i<100;i++){const x=i/100,offset=lensOffset(x,0),opposite=lensOffset(-x,0);assert.ok(offset.every(Number.isFinite));assert.ok(offset[0]<0&&Math.abs(offset[0])<=.32);assert.equal(offset[0],-opposite[0]);assert.ok(Math.abs(offset[1])<1e-10);const air=lensOffset(x,0,1);assert.ok(Math.abs(air[0])<1e-10);}
});
