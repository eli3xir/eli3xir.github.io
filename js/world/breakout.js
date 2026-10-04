import * as THREE from 'three';
import {createBreakoutState} from './breakout-state.js';
import {createBreakoutBoard} from './breakout-board.js';
import {createBreakoutEffects} from './breakout-effects.js';
export function createBreakout(){
 const board=createBreakoutBoard(),state=createBreakoutState(),effects=createBreakoutEffects(board.stage),motion={grounded:true,reach:1,grip:new THREE.Vector3()},point=new THREE.Vector3();let active=true,last=null,disposed=false,key='';
 const model={root:board.root,floor:false,board,state,effects,actorAnchor:board.anchor,actorScale:.33,displayScale:.66,actorPosition:[-.11,-2,.15],actorMotion:motion,layoutBounds:new THREE.Box3(new THREE.Vector3(-2.08,-2.52,-.3),new THREE.Vector3(2.08,2.55,.7)),
  move:value=>state.move(value),aim:value=>state.aim(value),pause:value=>state.pause(value),launch:options=>state.launch(options),reset(){state.reset();},snapshot:()=>state.snapshot(),restore(value){last=null;return state.restore(value);},setActive(value){active=Boolean(value);last=null;},
  pick(ray){board.root.updateMatrixWorld(true);const hit=ray.intersectObject(board.face)[0];if(!hit)return null;const p=board.stage.worldToLocal(hit.point.clone());return{x:p.x,y:p.y};},
  update(t,beat,scroll,now=0,reduced=false){if(disposed)return;const dt=last===null?0:Math.max(0,now-last);last=now;const events=active?state.update(dt):[];for(const event of events)model.onEvent?.(event);const s=state.state;board.draw(s,reduced);effects.draw(s,reduced);board.handle.getWorldPosition(point);board.anchor.worldToLocal(point);motion.grip.copy(point).divideScalar(model.actorScale/model.displayScale);const next=[s.status,s.paused,s.score,s.lives,s.aim,s.target].join(':');if(next!==key){key=next;model.onState?.(s);}},
  diagnostics:()=>({...state.state,active}),dispose(){disposed=true;model.onState=model.onEvent=model.onPick=null;effects.dispose();board.tiles.dispose();board.slots.dispose();}
 };model.update(0,{},0,0,true);return model;
}
