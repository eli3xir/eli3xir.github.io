import * as THREE from 'three';
import { brass, ink, paper, glass, mesh, ring, liquidMaterial } from './materials.js';
import { createExperiment } from './experiments.js';
import { createBook } from './book.js';
import { createSignalBench } from './signal-bench.js';

function plinth(root, radius = 1) {
  mesh(new THREE.CylinderGeometry(radius, radius * 1.04, .14, 96), ink(), root, [0, -1.16, 0]);
  ring(root, radius * 1.01, .012, -1.09);
}

function potion() {
  const root = new THREE.Group();
  let touched=-100,lastTime=0;
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
  return { root, actorPosition: [0, 1.72, 0],interact(){touched=lastTime;},update(t, beat) {
    lastTime=t;const reaction=Math.exp(-Math.max(0,t-touched)*2.2);
    liquid.material.uniforms.uTime.value = t; liquid.material.uniforms.uBeat.value = beat.pulse;
    cap.position.y = 1.27 + Math.sin(t * .7) * .05+reaction*.24;
    cap.rotation.z=Math.sin((t-touched)*8)*reaction*.18;
    orbit.rotation.y = t * .12; vessel.rotation.y = Math.sin(t * .2) * .04;
  } };
}

function radio() {
  const root = new THREE.Group();
  const deck = new THREE.Group(); root.add(deck); deck.rotation.set(.3, -.3, -.04);
  mesh(new THREE.BoxGeometry(2.5, .27, 1.75), ink(), deck, [0, -.45, 0]);
  mesh(new THREE.BoxGeometry(2.52, .035, 1.77), brass(), deck, [0, -.3, 0]);
  const record = mesh(new THREE.CylinderGeometry(.78,.78,.034,112), ink(), deck, [-.25,-.25,0]);
  for (let i = 0; i < 22; i++) ring(record, .18+i*.025, .0025, .019, new THREE.MeshStandardMaterial({ color: 0x3b4340, metalness: .62, roughness: .3 }));
  mesh(new THREE.CylinderGeometry(.16,.16,.008,64), paper(), record, [0,.023,0]);
  mesh(new THREE.CylinderGeometry(.022,.022,.1,24), brass(), record, [0,.06,0]);
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(.93,-.18,.55),new THREE.Vector3(.92,.07,.2),new THREE.Vector3(.56,.08,-.08),new THREE.Vector3(.15,-.14,-.38)]);
  mesh(new THREE.TubeGeometry(path, 40,.025,12,false), brass(), deck);
  mesh(new THREE.BoxGeometry(.09,.06,.18), ink(), deck, [.15,-.15,-.38]);
  const horn = new THREE.Group(); root.add(horn); horn.position.set(.84,.01,.1); horn.rotation.z = -.46;
  const profile = [[.045,0],[.05,.3],[.075,.5],[.15,.7],[.28,.92],[.5,1.14],[.72,1.35],[.78,1.39]];
  mesh(new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)),96), new THREE.MeshStandardMaterial({ color: 0xbe8650, metalness:.9, roughness:.25, side:THREE.DoubleSide }), horn);
  ring(horn, .78,.017,1.39);
  const wave = ring(root,1.28,.008,.5); wave.rotation.x = .9;
  return { root, displayScale:.88, actorPosition: [-.8,.8,.2], update(t, beat) { record.rotation.y = -t*1.6; wave.scale.setScalar(1+beat.pulse*.055); wave.rotation.z = t*.1; } };
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
  return ({ lab:potion, blog:()=>createBook(route.contentTitle,route.readingEntries), radio, projects:()=>createSignalBench(route.relay), about, skin }[route.id] || potion)();
}
