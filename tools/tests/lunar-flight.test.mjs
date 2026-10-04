import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlight,flightSample,APPROACH_HEIGHT,APPROACH_DURATION,LUNAR_GRAVITY} from '../../js/world/lunar-flight.js';
test('final approach reaches rest without penetrating the landing surface',()=>{
 let previous=APPROACH_HEIGHT;
 for(let i=0;i<=600;i++){const s=flightSample(APPROACH_DURATION*i/600);assert.ok(s.altitude<=previous+1e-10);assert.ok(s.altitude>=0);assert.ok(s.velocity<=0);assert.ok(s.thrust>=0);if(i&&i<600){const h=.00001,t=APPROACH_DURATION*i/600,a=flightSample(t-h),b=flightSample(t+h);assert.ok(Math.abs((b.altitude-a.altitude)/(2*h)-s.velocity)<1e-6);assert.ok(Math.abs((b.velocity-a.velocity)/(2*h)+LUNAR_GRAVITY-s.thrust)<1e-6);}previous=s.altitude;}
 const touchdown=flightSample(APPROACH_DURATION);assert.equal(touchdown.altitude,0);assert.equal(Math.abs(touchdown.velocity),0);assert.equal(touchdown.thrust,0);
});
test('approach resumes the same progress after transfer and does not queue repeated starts',()=>{
 const a=createFlight(),b=createFlight();assert.equal(a.start(.2),true);assert.equal(a.start(),false);for(let i=0;i<60;i++)a.step(1/30);assert.equal(b.restore(a.snapshot()),true);for(let i=0;i<240;i++){a.step(1/120);b.step(1/120);}assert.deepEqual(a.sample(),b.sample());assert.equal(b.restore({mode:'descending',elapsed:NaN,delay:0}),false);assert.deepEqual(a.sample(),b.sample());
 let landings=0;for(let i=0;i<1200;i++)landings+=Number(b.step(1/120));assert.equal(landings,1);assert.equal(b.sample().mode,'landed');assert.equal(b.sample().altitude,0);b.reset();assert.equal(b.sample().mode,'ready');assert.equal(b.sample().altitude,APPROACH_HEIGHT);
});
