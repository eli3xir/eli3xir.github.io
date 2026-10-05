import test from 'node:test';
import assert from 'node:assert/strict';
import {createPoolWaves} from '../../js/experience/pool-waves.js';
test('still, dry, outside, and inactive palms leave a calm pool',()=>{
 for(const [y,z,strength] of [[-.03,0,0],[.1,0,1],[-.3,0,1],[-.03,.5,1]]){
  const water=createPoolWaves();for(let i=0;i<120;i++)water.advance(i/60,[[i/600-.1,y,z]],strength);
  assert.equal(water.diagnostics().injections,0);assert.equal(water.diagnostics().energy,0);
 }
 const still=createPoolWaves();for(let i=0;i<120;i++)still.advance(i/60,[[0,-.03,0]],1);assert.equal(still.diagnostics().injections,0);
});
test('moving palms leave a bounded, volume-neutral wake that propagates and dissipates',()=>{
 const water=createPoolWaves();for(let i=0;i<=120;i++)water.advance(i/120,[[-.2+i/1200,-.025,0]],1);
 const disturbed=water.diagnostics();assert.ok(disturbed.peak>.0001&&disturbed.peak<.03);assert.ok(disturbed.injections>0);
 const start=water.heights.slice();for(let i=1;i<=60;i++)water.advance(1+i/120,[],0);
 assert.ok(water.diagnostics().energy>0);assert.notDeepEqual(water.heights,start);
 assert.ok(Math.abs(water.heights.reduce((sum,value)=>sum+value,0)/water.heights.length)<1e-7);
 for(let i=61;i<=1080;i++)water.advance(1+i/120,[],0);
 assert.ok(water.diagnostics().energy<disturbed.energy*.0001);assert.ok(water.pixels.every(Number.isFinite));
});
test('fixed-step propagation agrees at 30, 60 and 120 Hz for the same linear stroke',()=>{
 const fields=[30,60,120].map(rate=>{
  const water=createPoolWaves();for(let i=0;i<=rate*2;i++)water.advance(i/rate,[[-.25+i/rate*.12,-.025,.04]],1);
  return water.heights;
 });
 for(const field of fields.slice(1))assert.ok(Math.max(...field.map((value,i)=>Math.abs(value-fields[0][i])))<1e-7);
});
test('missing time never connects distant palms and reduced motion clears residual water',()=>{
 const water=createPoolWaves();for(let i=0;i<=60;i++)water.advance(i/60,[[i/600-.1,-.025,0]],1);
 const before=water.diagnostics();water.advance(5,[[.4,-.025,.2]],1);
 assert.equal(water.diagnostics().injections,before.injections);assert.ok(water.diagnostics().energy<before.energy);
 water.advance(5.02,[[.4,-.025,.2]],1,true);assert.equal(water.diagnostics().energy,0);assert.ok(water.pixels.every(value=>value===0));
});
