import * as THREE from 'three';
import {brass,ink,mesh} from './materials.js';
import {terminal,display} from './signal-hardware.js';
import {batchStatic} from './batch.js';
import {createCompilerBench} from './compiler-bench.js';
import {createVisionBench} from './vision-bench.js';
import {createInstrumentWell} from './instrument-well.js';
import {createInstrumentMotion} from '../experience/instrument-motion.js';

export function createSignalBench(relay,compiler,vision){
  const root=new THREE.Group(),bench=new THREE.Group();root.add(bench);bench.rotation.set(.24,-.23,0);
  const metal=brass(),dark=ink();
  const finish=new THREE.MeshPhysicalMaterial({color:0x23372e,metalness:.45,roughness:.35,clearcoat:.5});
  const well=createInstrumentWell(bench,{metal,dark,finish});
  const circuit=new THREE.Group();bench.add(circuit);
  const terminals=[terminal(circuit,'A',[-1.15,-.23,.08],.19),terminal(circuit,'B',[1.15,-.23,.08],-.19),terminal(circuit,'C',[.13,-.23,1.05],0)];
  const relayRoot=new THREE.Group();circuit.add(relayRoot);relayRoot.position.set(0,-.68,-.38);
  mesh(new THREE.CylinderGeometry(.34,.41,.16,48),dark,relayRoot,[0,.08,0]);
  mesh(new THREE.CylinderGeometry(.36,.36,.045,48),metal,relayRoot,[0,.185,0]);
  const tube=mesh(new THREE.CylinderGeometry(.275,.29,.98,48,1,true),new THREE.MeshPhysicalMaterial({color:0xc5ddce,transparent:true,opacity:.24,roughness:.12,metalness:.1,depthWrite:false,side:THREE.DoubleSide}),relayRoot,[0,.7,0]);tube.castShadow=false;
  const cage=new THREE.Group();relayRoot.add(cage);
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2+.4;mesh(new THREE.CylinderGeometry(.017,.017,1.05,10),metal,cage,[Math.cos(a)*.29,.71,Math.sin(a)*.29]);
    mesh(new THREE.CylinderGeometry(.15,.15,.023,32),metal,relayRoot,[0,.34+i*.21,0]);
  }
  mesh(new THREE.CylinderGeometry(.31,.28,.08,48),metal,relayRoot,[0,1.23,0]);
  const filament=mesh(new THREE.CylinderGeometry(.055,.055,.73,20),new THREE.MeshStandardMaterial({color:0xd6ad67,emissive:0xffa24c,emissiveIntensity:.55}),relayRoot,[0,.72,0]);
  const spiral=[];for(let i=0;i<=160;i++){const a=i/160*Math.PI*16;spiral.push(new THREE.Vector3(Math.cos(a)*.18,.3+i/160*.85,Math.sin(a)*.18));}
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral),160,.007,6,false),metal,relayRoot);
  const gauge=display(512,160),plate=mesh(new THREE.PlaneGeometry(.54,.17),new THREE.MeshBasicMaterial({map:gauge.texture,toneMapped:false}),circuit,[-.05,.68,-.37]);plate.castShadow=false;
  gauge.draw('MESSAGE RELAY','READY','AFTER HOURS / 04');
  const hub=new THREE.Vector3(0,.12,-.38);
  const paths=terminals.map((terminal,i)=>{
    const p=terminal.root.position;
    const points=[new THREE.Vector3(p.x+(i===0?-.4:.4),-.47,p.z+.12),new THREE.Vector3(i===0?-1.66:1.66,-.22,p.z+.12),new THREE.Vector3(p.x*.52,.27,-.16),hub];
    if(i===2){points[0].set(.53,-.47,1.15);points[1].set(.78,-.21,1.25);points[2].set(.68,.1,.24);}
    const path=new THREE.CatmullRomCurve3(points);
    mesh(new THREE.TubeGeometry(path,48,.022,8,false),metal,circuit);
    for(const point of [points[0],hub]){const port=mesh(new THREE.TorusGeometry(.043,.01,6,18),metal,circuit,point.toArray());port.rotation.x=Math.PI/2;}
    return path;
  });
  const packets=new THREE.InstancedMesh(new THREE.SphereGeometry(.034,10,8),new THREE.MeshBasicMaterial({color:0xbff5c5,toneMapped:false}),27);circuit.add(packets);packets.frustumCulled=false;
  const dummy=new THREE.Object3D();
  const moving=new Set([packets,filament]);for(const part of [...terminals.map(t=>t.root),cage])part.traverse(object=>moving.add(object));
  batchStatic(circuit,moving);batchStatic(cage);
  const staticCircuit=new Set();circuit.traverse(obj=>staticCircuit.add(obj));batchStatic(bench,staticCircuit);
  const syntax=createCompilerBench(compiler);bench.add(syntax.root);
  const optical=createVisionBench(vision);bench.add(optical.root);
  // Travel includes each instrument's highest part, including the relay label.
  const instruments=[['signal',circuit,1.6],['compiler',syntax.root,1.92],['vision',optical.root,2.16]];
  for(const [,group] of instruments)well.attach(group);
  const anchor=new THREE.Object3D();root.add(anchor);const rest=new THREE.Vector3(),destination=new THREE.Vector3(),contactPoint=new THREE.Vector3();
  const actorMotion={grounded:false,reach:0,grip:new THREE.Vector3()};
  const lift=createInstrumentMotion(),levels=lift.levels;
  // Below-deck storage must not enlarge the portrait composition. Capture all
  // instruments at their working height, before the initial retraction.
  const compositionBounds=new THREE.Box3().setFromObject(root).union(new THREE.Box3(new THREE.Vector3(-2.05,-1.17,-1.3),new THREE.Vector3(1.86,1.9,1.55)));
  const state=relay.state;let stamp='',disposed=false;
  function refresh(){
    const next=[state.serial,state.phase,state.sender].join(':');if(next===stamp)return;stamp=next;
    terminals.forEach((terminal,i)=>{
      const outgoing=state.busy&&i===state.sender,received=state.phase==='delivered';
      terminal.screen.draw(`TERMINAL ${'ABC'[i]}`,state.clients[i],outgoing?'TRANSMITTING':received?'MESSAGE RECEIVED':'LISTENING');
      terminal.led.material.emissiveIntensity=i===state.sender?2:.4;
    });
    gauge.draw('MESSAGE RELAY',state.busy?'ROUTING':state.serial?String(state.serial).padStart(3,'0'):'READY','A LOCAL CIRCUIT');
  }
  refresh();
  const model={root,syntax,circuit,optical,actorPosition:[.9,1.42,-.15],actorMobilePosition:[1.12,1.42,-.15],actorAnchor:anchor,actorMotion,displayScale:.92,onPick:null,
    compositionBounds,localClipping:true,clipPlane:well.plane,
    get instrument(){return lift.selected;},get instrumentBlend(){return levels.compiler;},get instrumentLevels(){return{...levels};},
    setInstrument(id,options){lift.select(id,options);},
    get relay(){return relay;},
    pick(ray){if(lift.selected!=='signal'||levels.signal<.99)return null;root.updateMatrixWorld(true);const hit=ray.intersectObjects(terminals.map(t=>t.root),true)[0];if(!hit)return null;return terminals.findIndex(t=>{let object=hit.object;while(object){if(object===t.root)return true;object=object.parent;}return false;});},
    update(t,beat,scroll,now,reduced){
      if(disposed)return;relay.advance(now,reduced);refresh();
      lift.advance(now,reduced);
      for(const [id,group,travel] of instruments){group.visible=levels[id]>0;group.position.y=-travel*(1-levels[id]);}
      syntax.update(now,reduced);optical.update(now,reduced);
      const approach=THREE.MathUtils.smoothstep(levels.vision,.65,1);
      rest.set((innerWidth<=850?1.12:.9)/.92,1.42/.92,-.15/.92);bench.updateMatrix();destination.copy(optical.actorHome).applyMatrix4(bench.matrix);anchor.position.lerpVectors(rest,destination,approach);
      actorMotion.grounded=approach>.01;actorMotion.reach=THREE.MathUtils.smoothstep(levels.vision,.94,1);
      const p=state.progress;filament.material.emissiveIntensity=.55+(state.busy?Math.sin(Math.PI*p)**2*3:0);
      cage.rotation.y=state.busy?Math.sin(p*Math.PI)*.08:0;
      terminals.forEach((terminal,i)=>{terminal.root.rotation.z=state.busy&&i===state.sender?Math.sin(Math.min(1,p/.3)*Math.PI)*-.015:0;});
      for(let branch=0;branch<3;branch++)for(let trail=0;trail<9;trail++){
        const outgoing=branch===state.sender;
        const phase=outgoing?p/.3:(p-.46)/.54;
        const at=phase-trail*.025;
        const visible=state.busy&&at>=0&&at<=1&&(outgoing?p<.3:p>=.46);
        if(visible){dummy.position.copy(paths[branch].getPointAt(outgoing?at:1-at));dummy.position.y+=.052;}
        dummy.scale.setScalar(visible?(1-trail/11)*(trail===0?1.5:1):0);dummy.updateMatrix();packets.setMatrixAt(branch*9+trail,dummy.matrix);
      }
      packets.instanceMatrix.needsUpdate=true;
    },
    afterTransform(){root.updateMatrixWorld(true);well.update();optical.contact.getWorldPosition(contactPoint);actorMotion.grip.copy(anchor.worldToLocal(contactPoint)).multiplyScalar(.92);},
    dispose(){disposed=true;model.onPick=null;relay.dispose();compiler.dispose();vision.dispose();}
  };
  model.update(0,{},0,0,true);
  return model;
}
