import * as THREE from 'three';
import { brass, ink, paper, glass, mesh, ring, liquidMaterial } from './materials.js';
import { createExperiment } from './experiments.js';
import { createBook } from './book.js';
import { createSignalBench } from './signal-bench.js';
import {createPhonograph} from './phonograph.js';

function plinth(root, radius = 1) {
  mesh(new THREE.CylinderGeometry(radius, radius * 1.04, .14, 96), ink(), root, [0, -1.16, 0]);
  ring(root, radius * 1.01, .012, -1.09);
}

function potion() {
  const root = new THREE.Group();
  let flight=null,queued=null,disposed=false;
  const shape = [[.05,-.85],[.38,-.84],[.58,-.68],[.62,-.3],[.58,.12],[.3,.45],[.18,.67],[.18,1.05],[.23,1.08]];
  const vesselMaterial=glass(0xe7f1eb);
  Object.assign(vesselMaterial,{opacity:.34,transmission:.55,roughness:.07,thickness:.1});
  const vessel = mesh(new THREE.LatheGeometry(shape.map(p => new THREE.Vector2(...p)), 112), vesselMaterial, root);
  const fillShape=[[0,-.81],[.35,-.8],[.55,-.64],[.57,-.3],[.54,0],[.535,.035],[0,.035]];
  const liquid = mesh(new THREE.LatheGeometry(fillShape.map(p=>new THREE.Vector2(...p)),96),liquidMaterial('#63dcb4'),root);
  mesh(new THREE.CylinderGeometry(.17, .17, .06, 64), brass(), root, [0, 1.1, 0]);
  const cap = mesh(new THREE.CylinderGeometry(.22, .2, .15, 64), ink(), root, [0, 1.27, 0]);
  ring(root, .58, .013, -.48);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const leg = mesh(new THREE.CylinderGeometry(.025, .04, .55, 12), brass(), root, [Math.cos(a)*.56,-.9,Math.sin(a)*.56]);
    leg.rotation.z = Math.cos(a) * -.2; leg.rotation.x = Math.sin(a) * .2;
  }
  const orbit = ring(root, 1.02, .008, .05); orbit.rotation.x = 1.1; orbit.rotation.z = .32;
  plinth(root, .87);
  function begin(options){flight={start:options.now+options.delay,duration:options.duration};options.onStart?.(options.delay);}
  return { root, actorPosition: [.72, 1.33, .1],
    hitTest(ray){root.updateMatrixWorld(true);return ray.intersectObjects([vessel,cap],false).length>0;},
    next(options){if(disposed)return false;if(flight){queued=options;return false;}begin(options);return true;},
    update(t,beat,scroll,now=0,reduced=false){
      if(disposed)return;
      // Interaction completes on the UI clock even when the score is suspended.
      const p=flight?(reduced?1:THREE.MathUtils.clamp((now-flight.start)/flight.duration,0,1)):0;
      const reaction=Math.sin(p*Math.PI)**2;
      liquid.material.uniforms.uTime.value=t;liquid.material.uniforms.uBeat.value=beat.pulse+reaction*.25;
      cap.position.y=1.27+Math.sin(t*.7)*.05+reaction*.29;
      cap.rotation.z=Math.sin(p*Math.PI*6)*reaction*.13;
      orbit.rotation.y=t*.12;vessel.rotation.y=Math.sin(t*.2)*.04;
      if(flight&&p===1){flight=null;if(queued&&!reduced){const next=queued;queued=null;begin({...next,now,delay:0});}else queued=null;}
    },
    dispose(){disposed=true;flight=queued=null;}
  };
}

function about() {
  const root = new THREE.Group();
  plinth(root,1.05);
  const arch = mesh(new THREE.TorusGeometry(1.35,.012,8,112,Math.PI*1.65),brass(),root,[0,.2,-.35]);
  const chess = mesh(new THREE.LatheGeometry([[.21,0],[.25,.04],[.16,.13],[.085,.42],[.15,.48],[.12,.56],[.07,.63]].map(p=>new THREE.Vector2(...p)),48),brass(),root,[-.75,-1.08,.3]);
  mesh(new THREE.SphereGeometry(.12,24,16),brass(),chess,[0,.73,0]);
  const book = mesh(new THREE.BoxGeometry(.55,.08,.4),paper(),root,[.75,-.97,.2]); book.rotation.y=.3;
  return { root, actorPosition:[0,.1,0], actorScale:3.1, update(t) { arch.rotation.z=Math.sin(t*.3)*.08; } };
}

function skin() {
  const root = new THREE.Group();
  const panels = [];
  const colors = [0xddbc7a,0xc7866d,0x789f86,0x829fbf,0xe7dbc1];
  let selected=0;
  colors.forEach((color,i)=>{
    const group = new THREE.Group();root.add(group);
    group.position.set((i-2)*.58,Math.sin(i*.9)*.2,Math.cos(i*.7)*.3);
    group.rotation.set(.1,(i-2)*-.13,(i-2)*.045);
    mesh(new THREE.BoxGeometry(.48,1.76,.05),new THREE.MeshPhysicalMaterial({color,roughness:.3,metalness:.25,clearcoat:1}),group);
    mesh(new THREE.BoxGeometry(.48,.035,.065),brass(),group,[0,-.68,.03]);
    mesh(new THREE.SphereGeometry(.115,32,20),glass(color),group,[0,-.43,.12]);
    panels.push(group);
  });
  return { root, actorPosition:[0,1.15,.3],applySkin(id){selected=['default','brick','forest','ocean','cream'].indexOf(id);},update(t,beat) { panels.forEach((p,i)=>{p.position.y=Math.sin(t*.65+i*.6)*.1+(i===selected?.18:0);p.position.z=Math.cos(i*.7)*.3+(i===selected?.16:0);p.rotation.y=(i-2)*-.13+Math.sin(t*.4+i)*.08;}); } };
}

export function createModel(route) {
  if(route.experiment)return createExperiment(route.experimentId);
  return ({ lab:potion, blog:()=>createBook(route.contentTitle,route.readingEntries), radio:()=>createPhonograph(route.radioPlayback), projects:()=>createSignalBench(route.relay), about, skin }[route.id] || potion)();
}
