import test from 'node:test';
import assert from 'node:assert/strict';
import {Score} from '../../js/audio/score.js';

test('stem controls survive blocked storage and respect subsequent chapter mixes',()=>{
  const score=new Score();assert.deepEqual(score.stemEnabled,[true,true,true,true]);
  const changes=[];score.context={currentTime:12};score.gains=Array.from({length:4},(_,i)=>({gain:{setTargetAtTime:(value,time,constant)=>changes.push({i,value,time,constant})}}));
  score.toggleStem(2);assert.equal(score.stemEnabled[2],false);
  score.scene('lab');assert.equal(changes.at(-2).value,0);
  score.toggleStem(2);assert.equal(changes.at(-1).value,score.mix[2]);
  const before=score.stemEnabled.slice();score.toggleStem(-1);score.toggleStem(5);assert.deepEqual(score.stemEnabled,before);
  assert.deepEqual(Array.from(score.levels()),[0,0,0,0]);
});
