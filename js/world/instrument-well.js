import * as THREE from 'three';
import {mesh} from './materials.js';
import {casing} from './hardware.js';

export function createInstrumentWell(bench,{metal,dark,finish}){
  const deck=-.75,localPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-deck),plane=localPlane.clone();
  // Four separate walls leave a real opening. A parked instrument's own pallet
  // closes it; the dark floor is visible between instruments.
  for(const x of [-1.775,1.775]){
    mesh(casing(.17,.24,2.5,.05),finish,bench,[x,-.875,.25]);
    mesh(new THREE.BoxGeometry(.12,.025,2.44),metal,bench,[x,-.743,.25]);
  }
  for(const z of [-.94,1.44]){
    mesh(casing(3.38,.24,.12,.05),finish,bench,[0,-.875,z]);
    mesh(new THREE.BoxGeometry(3.44,.025,.10),metal,bench,[0,-.743,z]);
  }
  mesh(new THREE.BoxGeometry(3.44,.035,2.30),new THREE.MeshBasicMaterial({color:0x070c0a}),bench,[0,-.973,.25]);
  for(const x of [-1.53,1.53])for(const z of [-.63,1.11])mesh(new THREE.CylinderGeometry(.09,.07,.15,16),dark,bench,[x,-1.035,z]);
  const shared=new Set([metal,dark,finish]),clones=new Map();
  function clipped(material){
    if(shared.has(material)){
      if(!clones.has(material))clones.set(material,material.clone());
      material=clones.get(material);
    }
    material.clippingPlanes=[plane];material.clipShadows=true;return material;
  }
  return{
    plane,
    attach(group){
      const pallet=mesh(new THREE.BoxGeometry(3.4,.04,2.24),dark,group,[0,-.74,.25]);pallet.name='instrument-pallet';
      group.traverse(object=>{if(object.material)object.material=Array.isArray(object.material)?object.material.map(clipped):clipped(object.material);});
    },
    update(){plane.copy(localPlane).applyMatrix4(bench.matrixWorld);}
  };
}
