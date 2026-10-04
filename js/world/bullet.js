import * as THREE from 'three';
import {createBulletState} from './bullet-state.js';
import {createBulletStage} from './bullet-stage.js';
import {createBulletField} from './bullet-field.js';
export function createBullet(){const stage=createBulletStage(),state=createBulletState(),field=createBulletField(stage.stage),motion={grounded:true};let active=true,last=null,key='',disposed=false;
 const model={root:stage.root,stage,state,field,background:[.016,.031,.04],floor:false,displayScale:.67,actorScale:.24,actorPosition:[0,-1.16,.08],actorAnchor:stage.anchor,actorMotion:motion,layoutBounds:new THREE.Box3(new THREE.Vector3(-2.12,-2.6,-.23),new THREE.Vector3(2.12,2.6,.6)),
 move:(x,y)=>state.move(x,y),choose:v=>state.choose(v),pause:v=>state.pause(v),launch:o=>state.launch(o),reset(){state.reset();field.invalidate();},snapshot:()=>state.snapshot(),restore(v){last=null;field.invalidate();return state.restore(v);},setActive(v){active=Boolean(v);last=null;},
 pick(ray){stage.root.updateMatrixWorld(true);const hit=ray.intersectObject(stage.face)[0];if(!hit)return null;const p=stage.stage.worldToLocal(hit.point.clone());return{x:p.x,y:p.y};},
 update(t,beat,scroll,now=0,reduced=false){if(disposed)return;const dt=last===null?0:Math.max(0,now-last);last=now;for(const e of active?state.update(dt):[])model.onEvent?.(e);const s=state.state;stage.draw(s,reduced);field.draw(s,state.data,reduced);const next=[s.status,s.paused,s.lives,s.graze,s.choice,s.mode,s.tx,s.ty,Math.floor(s.tick/12)].join(':');if(next!==key){key=next;model.onState?.(s);}},
 diagnostics:()=>({...state.state,active}),dispose(){disposed=true;model.onEvent=model.onState=model.onPick=null;stage.ticks.dispose();}
 };model.update(0,{},0,0,true);return model;
}
