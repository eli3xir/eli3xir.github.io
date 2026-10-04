import test from 'node:test';import assert from 'node:assert/strict';
import {sweepCircleRect} from '../../js/world/breakout-collision.js';
import {createBreakoutState,BRICKS,BREAKOUT} from '../../js/world/breakout-state.js';
import {renderCue} from '../../js/audio/synth.js';
test('swept circle finds faces and real rounded corners, without square-corner ghosts',()=>{
 const box={x:0,y:0,w:2,h:2};const face=sweepCircleRect(-3,0,20,0,.2,box,.2);assert.ok(Math.abs(face.time-.09)<1e-12);assert.equal(face.nx,-1);
 const corner=sweepCircleRect(-2,2,1,-1,.2,box,2);assert.ok(Math.abs(corner.time-(1-.2/Math.sqrt(2)))<1e-12);assert.ok(Math.abs(corner.nx+Math.SQRT1_2)<1e-12);assert.ok(Math.abs(corner.ny-Math.SQRT1_2)<1e-12);
 assert.equal(sweepCircleRect(-1.3,1.19,.2,0,.2,box,.5),null);assert.equal(sweepCircleRect(-1.2,0,-1,0,.2,box,1),null);
});
test('breakout fixed steps preserve collisions and snapshots at 30 and 120 Hz',()=>{
 const a=createBreakoutState(),b=createBreakoutState();for(const [m,hz]of [[a,30],[b,120]]){m.aim(.18);m.launch();for(let i=0;i<hz*4;i++)m.update(1/hz);}assert.deepEqual(a.snapshot(),b.snapshot());assert.ok(a.state.hits>0);assert.ok(a.state.lives<3);a.pause(true);const exact=a.snapshot();a.update(2);assert.deepEqual(a.snapshot(),exact);const c=createBreakoutState();assert.equal(c.restore(exact),true);assert.deepEqual(c.snapshot(),exact);assert.equal(c.restore({...exact,x:NaN}),false);assert.equal(c.restore({...exact,score:999}),false);
});
test('high-speed thin brick, paddle, miss and final brick have real state outcomes',()=>{
 const m=createBreakoutState(),s=m.state,brick=BRICKS[40];m.launch();Object.assign(s,{x:brick.x,y:brick.y-.3,vx:0,vy:50});const events=m.update(1/120);assert.equal(s.bricks[40],false);assert.equal(s.score,10);assert.ok(s.vy<0);assert.equal(events.filter(e=>e.kind==='brick').length,1);
 Object.assign(s,{x:0,y:BREAKOUT.paddleY+.13,paddle:0,target:0,vx:0,vy:-3,status:'playing'});assert.ok(m.update(.02).some(e=>e.kind==='paddle'));assert.ok(s.vy>0);
 Object.assign(s,{x:1.4,y:-2.12,vx:0,vy:-3,status:'playing',lives:1});m.update(.02);assert.equal(s.status,'over');assert.equal(s.lives,0);assert.equal(m.launch(),true);assert.equal(m.state.lives,3);assert.equal(m.state.hits,0);
 const n=createBreakoutState(),v=n.state;n.launch();v.bricks.fill(false);v.bricks[40]=true;v.hits=44;v.score=1340;Object.assign(v,{x:brick.x,y:brick.y-.2,vx:0,vy:3});n.update(.04);assert.equal(v.status,'won');assert.equal(v.score,1350);assert.equal(v.hits,45);
});
test('arcade cues are finite, bounded and distinct across impacts and musical harmony',()=>{
 for(const rate of [24000,32000]){const cues=['brick0','brick4','paddle','miss'].map(kind=>renderCue(kind,rate,0));for(const pcm of cues){assert.equal(pcm.length,rate*.3);assert.ok(pcm.every(Number.isFinite));const peak=Math.max(...pcm.map(Math.abs));assert.ok(peak>.005&&peak<.4);assert.ok(Math.abs(pcm.at(-1))<.001);}assert.notDeepEqual(cues[0],cues[1]);assert.notDeepEqual(cues[2],cues[3]);assert.notDeepEqual(cues[0],renderCue('brick0',rate,2));}
});
