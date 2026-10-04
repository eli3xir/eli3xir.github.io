import * as THREE from 'three';
import { brass, ink, paper, mesh, ring } from './materials.js';
import { createExperiment } from './experiments.js';
import { createBook } from './book.js';
import { createSignalBench } from './signal-bench.js';
import {createPhonograph} from './phonograph.js';
import {createPotion} from './potion.js';
import {createSkinPreview} from './skin-preview.js';

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

export function createModel(route) {
  if(route.experiment)return createExperiment(route.experimentId);
  return ({ lab:createPotion, blog:()=>createBook(route.contentTitle,route.readingEntries), radio:()=>createPhonograph(route.radioPlayback), projects:()=>createSignalBench(route.relay), about, skin:createSkinPreview }[route.id] || createPotion)();
}
