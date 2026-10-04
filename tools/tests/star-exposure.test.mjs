import test from 'node:test';
import assert from 'node:assert/strict';
import {createExposure,exposureAngle,rotateStar,starSeeds} from '../../js/world/star-exposure.js';
test('an illustrative hour turns every star through the same sidereal hour angle',()=>{
 const angle=exposureAngle(1);assert.ok(Math.abs(angle*180/Math.PI-15.04105)<.00001);
 for(const star of [{r:.8,z:.6,angle:0},{r:.6,z:.8,angle:0}]){const p=rotateStar(star,angle);assert.ok(Math.abs(Math.atan2(p[1],p[0])-angle)<1e-12);assert.ok(Math.abs(p[2]-star.z)<1e-12);}
 for(const star of starSeeds(900))assert.ok(Math.abs(Math.hypot(...rotateStar(star,.7,[.8,-.65]))-1)<1e-12);
});
test('exposure timing survives coarse frames, pause and ownership transfer',()=>{
 const a=createExposure();a.select(6);assert.equal(a.launch({wait:.2}),true);assert.equal(a.launch(),false);a.update(.1);assert.equal(a.state.recorded,0);a.update(1.1);assert.equal(a.state.elapsed,1);a.pause(true);a.update(4);assert.equal(a.state.elapsed,1);
 const b=createExposure();assert.equal(b.restore(a.snapshot()),true);b.pause(false);assert.equal(b.update(4),true);assert.equal(b.state.recorded,6);assert.equal(b.state.mode,'complete');
 b.select(1);const c=createExposure();c.restore(b.snapshot());assert.equal(c.state.recorded,6);assert.equal(c.state.hours,1);assert.equal(c.launch({reduced:true}),true);assert.equal(c.state.recorded,1);assert.ok(Math.abs(c.state.start-exposureAngle(6))<1e-12);assert.equal(c.state.mode,'complete');
 assert.equal(c.restore({...c.snapshot(),recorded:NaN}),false);
});
test('equal observation time gives equal arcs at different frame rates',()=>{
 const a=createExposure(),b=createExposure();a.launch();b.launch();for(let i=0;i<60;i++)a.update(1/30);for(let i=0;i<240;i++)b.update(1/120);assert.ok(Math.abs(a.state.angle-b.state.angle)<1e-12);
});
