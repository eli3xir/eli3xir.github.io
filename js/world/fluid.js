import * as THREE from 'three';
import {BPM} from '../audio/composition.js';
import {createFluidCell} from './fluid-cell.js';
import {createGpuFluid} from './fluid-gpu.js';
import {createCpuFluid} from './fluid-cpu.js';
import {PIGMENTS} from './fluid-state.js';
export function createFluid(renderer){
 const cell=createFluidCell(),root=new THREE.Group(),simulation=(renderer&&createGpuFluid(renderer))||createCpuFluid();root.add(cell.root);cell.root.rotation.y=-.18;
 let last=null,active=true,paused=false,accumulator=0,color=1,drop=null,pending=null,disposed=false;
 const duration=60/BPM,updateTexture=()=>{cell.uniforms.dye.value=simulation.texture;const d=simulation.diagnostics();cell.uniforms.resolution.value.set(d.width,d.height);};
 const model={root,cell,simulation,actorAnchor:cell.actorAnchor,actorScale:.55,actorPosition:[-1.29,-1,.22],actorMotion:{grounded:true},
  layoutBounds:new THREE.Box3(new THREE.Vector3(-1.84,-1.35,-.7),new THREE.Vector3(1.84,1.76,.7)),
  setActive(value){active=value;last=null;},setPaused(value){paused=Boolean(value);model.onState?.(model.diagnostics());},
  select(value){if(!Number.isInteger(value)||value<0||value>=PIGMENTS.length)return;color=value;cell.bulb.material.color.set(PIGMENTS[color].hex);model.onState?.(model.diagnostics());},
  pick(ray){root.updateMatrixWorld(true);for(let i=0;i<cell.controls.length;i++)if(ray.intersectObject(cell.controls[i],true).length)return{kind:'color',index:i};const hit=ray.intersectObject(cell.surface)[0];return hit?{kind:'drop',uv:hit.uv.toArray()}:null;},
  hitUV(ray){root.updateMatrixWorld(true);return ray.intersectObject(cell.surface)[0]?.uv||null;},
  inject(uv,velocity=[0,-.18],amount=.65,radius=.035,ink=color){if(disposed||!active)return;simulation.inject(THREE.MathUtils.clamp(uv[0],.015,.985),THREE.MathUtils.clamp(uv[1],.015,.985),velocity[0],velocity[1],ink,amount,radius);updateTexture();},
  addDrop({uv=[.58,.74],delay=0,reduced=false}={}){if(disposed||!active)return;const item={uv:[THREE.MathUtils.clamp(uv[0],.04,.96),THREE.MathUtils.clamp(uv[1],.04,.90)],color,elapsed:-Math.max(0,delay)};
   if(reduced){model.inject(item.uv,[.08,-.22],1.8,.055,item.color);model.onDrop?.();return;}if(drop)pending=item;else drop=item;model.onState?.(model.diagnostics());
  },
  clear(){if(!active)return;drop=pending=null;cell.drop.visible=false;simulation.clear();updateTexture();model.onState?.(model.diagnostics());},
  snapshot(){return{field:simulation.snapshot(),color,paused,accumulator,nozzleX:cell.nozzle.position.x,drop:drop?structuredClone(drop):null,pending:pending?structuredClone(pending):null};},
  restore(state){if(!state||!simulation.restore(state.field))return false;color=Number.isInteger(state.color)?THREE.MathUtils.clamp(state.color,0,4):1;paused=Boolean(state.paused);accumulator=Number.isFinite(state.accumulator)?Math.min(1/60,Math.max(0,state.accumulator)):0;
   const safeDrop=item=>item&&Array.isArray(item.uv)&&item.uv.length===2&&item.uv.every(Number.isFinite)&&Number.isFinite(item.elapsed)&&Number.isInteger(item.color)&&item.color>=0&&item.color<5?{uv:item.uv.map(v=>THREE.MathUtils.clamp(v,0,1)),color:item.color,elapsed:THREE.MathUtils.clamp(item.elapsed,-1,duration)}:null;
   drop=safeDrop(state.drop);pending=safeDrop(state.pending);last=null;if(Number.isFinite(state.nozzleX))cell.nozzle.position.x=THREE.MathUtils.clamp(state.nozzleX,-1.36,1.36);cell.bulb.material.color.set(PIGMENTS[color].hex);updateTexture();model.onState?.(model.diagnostics());return true;
  },
  update(t,beat,scroll,now=0,reduced=false){if(disposed)return;const dt=last===null?0:Math.max(0,now-last);last=now;
   if(active&&drop){drop.elapsed+=dt;const p=reduced?1:THREE.MathUtils.clamp(drop.elapsed/duration,0,1),x=(drop.uv[0]-.5)*2.72,y=(drop.uv[1]-.5)*1.70+.03;
    cell.nozzle.position.x=x;cell.drop.visible=!reduced&&drop.elapsed>=0;cell.drop.material.color.set(PIGMENTS[drop.color].hex);cell.drop.position.set(x,THREE.MathUtils.lerp(1.03,y,p*p),.13);cell.drop.scale.set(1,1+Math.sin(p*Math.PI)*.8,1);
    cell.bulb.scale.y=1.3-(reduced?0:Math.sin(p*Math.PI)*.16);
    if(p===1){model.inject(drop.uv,[.06,-.24],1.8,.055,drop.color);drop=pending;pending=null;cell.drop.visible=false;model.onDrop?.();model.onState?.(model.diagnostics());}
   }
   if(active&&!paused&&!reduced){accumulator=Math.min(.067,accumulator+dt);while(accumulator>=1/60){simulation.step(1/60);accumulator-=1/60;}}
   cell.controls.forEach((knob,i)=>{knob.position.y=i===color?-1.076:-1.064;});updateTexture();
  },
  diagnostics(){return{...simulation.diagnostics(),color,paused,active,nozzleX:cell.nozzle.position.x,drop:drop?{...drop}:null,pending:Boolean(pending)};},
  dispose(){disposed=true;drop=pending=null;model.onPick=model.onDrop=model.onState=null;simulation.dispose();}
 };updateTexture();return model;
}
