import * as THREE from 'three';
import {mesh} from './materials.js';

export function createConductorBaton(root,metal,black){
  const baton=new THREE.Group();baton.name='conductor-baton';root.add(baton);
  const grip=new THREE.Group();grip.rotation.z=-.55;baton.add(grip);
  mesh(new THREE.CylinderGeometry(.014,.016,.046,12),black,grip,[0,.006,0]);
  mesh(new THREE.CylinderGeometry(.004,.007,.19,12),new THREE.MeshStandardMaterial({color:0xe6d8af,roughness:.32}),grip,[0,.121,0]);
  const tip=mesh(new THREE.SphereGeometry(.007,10,8),metal,grip,[0,.216,0]);tip.name='conductor-baton-tip';
  baton.position.set(-.55,.92,.25);baton.updateMatrix();baton.matrixAutoUpdate=false;
  let hand=null;
  return{baton,follow(actor){
    hand??=actor.root.getObjectByName('mote-right-hand');
    actor.root.updateWorldMatrix(true,true);root.updateWorldMatrix(true,false);
    baton.matrix.copy(root.matrixWorld).invert().multiply(hand.matrixWorld);baton.matrixWorldNeedsUpdate=true;
  }};
}
