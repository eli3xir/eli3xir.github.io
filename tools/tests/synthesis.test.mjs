import test from 'node:test';import assert from 'node:assert/strict';
import { renderScore,renderCue,randomSequence,BPM } from '../../js/audio/synth.js';

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
test('composition and noise are deterministic, while cues have distinct envelopes',()=>{
  const first=renderScore(4000,1),second=renderScore(4000,1);
  first.stems.forEach((stem,i)=>assert.deepEqual(stem,second.stems[i]));
  const a=randomSequence(1),b=randomSequence(2);assert.notEqual(a(),b());
  const hover=renderCue('hover',4000),reveal=renderCue('reveal',4000);
  assert.ok(reveal.reduce((s,x)=>s+x*x,0)>hover.reduce((s,x)=>s+x*x,0)*2);
});
