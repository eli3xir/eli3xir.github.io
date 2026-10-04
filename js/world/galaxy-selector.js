import * as THREE from 'three';
import {mesh,brass,ink} from './materials.js';
import {casing} from './hardware.js';
export function createGalaxySelector(){
 const root=new THREE.Group(),metal=brass(),dark=ink();root.position.set(1.25,-1.52,.25);
 mesh(casing(.95,.08,.48,.06),dark,root,[0,-.10,0]);
 const wheel=new THREE.Group();wheel.position.set(.23,.18,.04);root.add(wheel);
 mesh(new THREE.TorusGeometry(.205,.019,12,72),metal,wheel);
 mesh(new THREE.BoxGeometry(.35,.012,.015),metal,wheel);
 for(const [x,color] of [[-.10,0x74c3cb],[.10,0xcc6b37]]){
  const glass=new THREE.MeshPhysicalMaterial({color,roughness:.16,metalness:.12,transparent:true,opacity:.65});
  mesh(new THREE.CircleGeometry(.083,36),glass,wheel,[x,0,.01]);
  mesh(new THREE.TorusGeometry(.086,.008,8,40),metal,wheel,[x,0,.01]);
 }
 const axle=mesh(new THREE.CylinderGeometry(.027,.027,.15,16),metal,root,[.23,.18,0]);axle.rotation.x=Math.PI/2;
 mesh(new THREE.BoxGeometry(.055,.26,.06),dark,root,[.23,.01,-.05]);
 const handle=mesh(new THREE.SphereGeometry(.023,16,12),metal,wheel,[-.16,.12,.065]);
 const actorAnchor=new THREE.Object3D();actorAnchor.position.set(-.18,.065,.12);root.add(actorAnchor);
 return{root,wheel,handle,actorAnchor};
}
