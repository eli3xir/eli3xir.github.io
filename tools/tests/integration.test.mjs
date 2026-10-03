import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {integrate}=createRequire(import.meta.url)('../integrate-experience.cjs');

test('repeated integration preserves ES module experiments and the classic bootstrap',()=>{
  const original='<html><head></head><body><main></main><script type="module" src="/js/lab-breakout.js"></script><script src="/js/experience/lab-host.js"></script></body></html>';
  const first=integrate(original,true),second=integrate(first,true),third=integrate(second,true);
  assert.equal(first,second);assert.equal(second,third);
  assert.ok(second.includes('data-src="/js/lab-breakout.js" data-module="true"'));
  assert.equal((second.match(/<script src="\/js\/experience\/lab-host.js">/g)||[]).length,1);
  assert.equal((second.match(/type="importmap"/g)||[]).length,1);
  assert.equal((second.match(/src="\/js\/experience\/entry.js"/g)||[]).length,1);
  assert.ok(!second.includes('data-src="/js/experience/lab-host.js"'));
});

test('a classic canvas experiment stays classic and gets one bootstrap',()=>{
  const result=integrate('<html><head></head><body><script src="/js/lab-fluid.js"></script></body></html>',true);
  assert.ok(result.includes('data-src="/js/lab-fluid.js" data-module="false"'));
  assert.equal((result.match(/<script src="\/js\/experience\/lab-host.js">/g)||[]).length,1);
});
