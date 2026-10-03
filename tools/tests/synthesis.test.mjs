import test from 'node:test';import assert from 'node:assert/strict';
import { renderScore,renderCue,randomSequence,BPM } from '../../js/audio/synth.js';
import { movementAt } from '../../js/audio/composition.js';

test('score produces four audible finite PCM stems with a complete musical phrase',()=>{
  const score=renderScore(8000,4);
  assert.equal(score.stems.length,4);
  assert.ok(Math.abs(score.duration-4*4*60/BPM)<1/8000);
  for(const stem of score.stems){
    let energy=0,peak=0;
    for(const sample of stem){assert.ok(Number.isFinite(sample));energy+=sample*sample;peak=Math.max(peak,Math.abs(sample));}
    assert.ok(Math.sqrt(energy/stem.length)>.006,'stem is audible');
    assert.ok(peak<1,'PCM does not clip');
    assert.ok(stem[0]===0);assert.ok(stem.at(-1)===0);
  }
});
test('the complete score has four movements with an audible breathing section and a distinct answer',()=>{
  const rate=8000,score=renderScore(rate);
  assert.ok(Math.abs(score.musicalDuration-128*60/BPM)<1e-10);
  const rms=(stem,first,last)=>{
    const start=Math.round(first*4*60/BPM*rate),end=Math.round(last*4*60/BPM*rate);let sum=0;
    for(let i=start;i<end;i++)sum+=stem[i]**2;
    return Math.sqrt(sum/(end-start));
  };
  assert.ok(rms(score.stems[3],16,24)<rms(score.stems[3],8,16)*.4,'breathing section is quieter than lift');
  const first=score.stems[2].subarray(0,Math.round(4*60/BPM*rate));
  const answer=score.stems[2].subarray(Math.round(24*4*60/BPM*rate),Math.round(25*4*60/BPM*rate));
  assert.notDeepEqual(first,answer,'answer changes melody and texture');
  for(const stem of score.stems)assert.ok(stem.every(sample=>Number.isFinite(sample)&&Math.abs(sample)<1));
});
test('musical movement boundaries and loop wrap retain a finite shared mood',()=>{
  const titles=['opening','lift','breath','return'];
  titles.forEach((movement,i)=>assert.equal(movementAt(i*32*60/BPM).movement,movement));
  assert.equal(movementAt(128*60/BPM).movement,'opening');
  for(const time of [NaN,Infinity,-2,0,68.57142857142857]){
    const mood=movementAt(time);assert.ok(Number.isFinite(mood.energy));assert.ok(mood.energy>=.34&&mood.energy<=1);
  }
});
test('composition and noise are deterministic, while cues have distinct envelopes',()=>{
  const first=renderScore(4000,1),second=renderScore(4000,1);
  first.stems.forEach((stem,i)=>assert.deepEqual(stem,second.stems[i]));
  const a=randomSequence(1),b=randomSequence(2);assert.notEqual(a(),b());
  const hover=renderCue('hover',4000),reveal=renderCue('reveal',4000);
  assert.ok(reveal.reduce((s,x)=>s+x*x,0)>hover.reduce((s,x)=>s+x*x,0)*2);
});
