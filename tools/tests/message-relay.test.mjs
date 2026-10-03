import test from 'node:test';
import assert from 'node:assert/strict';
import {createMessageRelay} from '../../js/experience/message-relay.js';

test('a message reaches the relay before both receivers and cannot be overwritten in flight',()=>{
  const relay=createMessageRelay(),phases=[];relay.subscribe(state=>phases.push(state.phase));
  relay.select(1);assert.equal(relay.send('  好奇心已接通  ',{now:10,delay:.25,duration:2}),true);
  assert.deepEqual(relay.state.clients,['','好奇心已接通','']);
  assert.equal(relay.select(2),false);assert.equal(relay.send('overwrite',{now:10}),false);
  relay.advance(10.1);assert.equal(relay.state.progress,0);
  relay.advance(10.9);assert.equal(relay.state.phase,'relay');assert.equal(relay.state.clients[0],'');
  relay.advance(11.3);assert.equal(relay.state.phase,'delivering');assert.equal(relay.state.clients[2],'');
  relay.advance(12.25);assert.equal(relay.state.phase,'delivered');assert.equal(relay.state.busy,false);
  assert.deepEqual(relay.state.clients,Array(3).fill('好奇心已接通'));assert.equal(phases.filter(phase=>phase==='delivered').length,1);
});

test('empty messages do not start, Unicode stays bounded, reduced motion and disposal settle safely',()=>{
  const relay=createMessageRelay();assert.equal(relay.send(' \n ',{now:0}),false);
  assert.equal(relay.select(-1),false);assert.equal(relay.select(3),false);
  relay.send('🙂'.repeat(50),{now:0,reduced:true});assert.equal(Array.from(relay.state.message).length,32);
  assert.equal(relay.state.phase,'delivered');assert.equal(relay.state.clients[0],relay.state.clients[2]);
  relay.send('second',{now:1,duration:2});let calls=0;relay.subscribe(()=>calls++);relay.dispose();relay.advance(99);assert.equal(calls,0);
});
