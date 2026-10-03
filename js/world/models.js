import * as THREE from 'three';
import { brass, ink, paper, glass, mesh, ring } from './materials.js';
import { createExperiment } from './experiments.js';
import { createBook } from './book.js';
import { createSignalBench } from './signal-bench.js';
import {createPhonograph} from './phonograph.js';
import {createPotion} from './potion.js';

function plinth(root, radius = 1) {
  mesh(new THREE.CylinderGeometry(radius, radius * 1.04, .14, 96), ink(), root, [0, -1.16, 0]);
  ring(root, radius * 1.01, .012, -1.09);
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
  return ({ lab:createPotion, blog:()=>createBook(route.contentTitle,route.readingEntries), radio:()=>createPhonograph(route.radioPlayback), projects:()=>createSignalBench(route.relay), about, skin }[route.id] || createPotion)();
}
