import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFor, beatState, nextBeatDelay, readSetting, writeSetting, CHAPTERS } from '../../js/experience/domain.js';

test('every public chapter resolves through clean and index.html routes',()=>{
  for(const chapter of CHAPTERS){
    assert.equal(routeFor(chapter.path).id,chapter.id);
    assert.equal(routeFor(chapter.path+'index.html').id,chapter.id);
    assert.equal(routeFor(chapter.path).detail,false);
  }
  assert.equal(routeFor('/blog/50706.html').article,true);
  assert.equal(routeFor('/lab/moon.html').experiment,true);
  assert.equal(routeFor('/blog/50706.html').id,'blog');
});
test('beat synchronization stays bounded at phrase and floating-point boundaries',()=>{
  for(const time of [0,.01,60/112,32*60/112,101.437,10000]){
    const delay=nextBeatDelay(time);
    assert.ok(delay>=0&&delay<=60/112*.5+.02);
    const beat=(time+delay)*112/60;
    assert.ok(Math.abs(beat*2-Math.round(beat*2))<1e-7);
  }
  assert.equal(beatState(4*60/112).bar,1);
  assert.equal(beatState(-5).beat,0);
});
test('storage denial preserves navigation and explicit defaults',()=>{
  const denied={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');}};
  assert.equal(readSetting('theme','default',denied),'default');
  assert.equal(writeSetting('theme','forest',denied),false);
});
