import test from 'node:test';
import assert from 'node:assert/strict';
import {createGalaxyState} from '../../js/world/galaxy-state.js';
import {galaxyData} from '../../js/world/galaxy-density.js';
test('galaxy band reveal preserves an interrupted blend and finishes after four beats',()=>{
 const a=createGalaxyState();a.selectBand(1,{wait:.25});a.update(.2);assert.equal(a.state.band,0);a.update(.9);assert.ok(a.state.band>0&&a.state.band<1);
 const b=createGalaxyState();assert.equal(b.restore(a.snapshot()),true);assert.equal(b.state.band,a.state.band);b.update(4);assert.equal(b.state.band,1);assert.equal(b.state.changing,false);
 b.selectBand(0);b.update(.6);const midway=b.state.band;b.selectBand(1);assert.equal(b.state.band,midway);b.update(4);assert.equal(b.state.band,1);assert.equal(b.selectBand(1),false);
});
test('galaxy impulse and view response use elapsed time and accept bounded input',()=>{
 const a=createGalaxyState(),b=createGalaxyState();for(const m of [a,b]){m.orbit(.7,1.4);m.zoom(1.4);m.push({wait:.2});}
 for(let i=0;i<30;i++)a.update(1/30);for(let i=0;i<120;i++)b.update(1/120);for(const key of ['angle','spin','yaw','tilt','zoom'])assert.ok(Math.abs(a.state[key]-b.state[key])<1e-10,key);
 a.pause(true);const angle=a.state.angle;a.update(10);assert.equal(a.state.angle,angle);a.orbit(9,-9);a.zoom(20);a.update(0,true);assert.equal(a.state.yaw,Math.PI);assert.equal(a.state.tilt,.035);assert.equal(a.state.zoom,1.5);assert.equal(a.restore({...a.snapshot(),band:NaN}),false);
});
test('galaxy seed buffers are deterministic, finite and contain sixty thousand bounded stars',()=>{
 const a=galaxyData(60000,32),b=galaxyData(60000,32);assert.deepEqual(a,b);assert.equal(a.positions.length,180000);assert.ok(a.positions.every(Number.isFinite));let max=0;for(let i=0;i<60000;i++)max=Math.max(max,Math.hypot(a.positions[i*3],a.positions[i*3+2]));assert.ok(max<=2.1);assert.ok(a.density.some(v=>v>0&&v<255));
});
