import * as THREE from 'three';
import {BRICKS,BRICK_COLORS} from './breakout-state.js';
export function createBreakoutEffects(parent){
 // Six chipped shards per hit, pooled in one draw. Cosmetic ballistic motion has no gameplay collisions.
 const shards=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.36,metalness:.16}),270);shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);shards.castShadow=true;shards.frustumCulled=false;parent.add(shards);const d=new THREE.Object3D();
 const trail=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),new THREE.MeshBasicMaterial({color:0x96c9ae,transparent:true,opacity:.18,depthWrite:false}),10);trail.frustumCulled=false;parent.add(trail);const colors=BRICK_COLORS.map(c=>new THREE.Color(c));
 // Keep the vertex-color shader variant stable before the first collision.
 shards.setColorAt(0,colors[0]);shards.instanceColor.setUsage(THREE.DynamicDrawUsage);
 function draw(s,reduced){let used=0;if(!reduced)for(const burst of s.bursts){const age=s.time-burst.time,brick=BRICKS[burst.id],fade=Math.max(0,1-age/1.35);for(let i=0;i<6;i++){const angle=i*Math.PI/3+burst.id*.73,v=.25+(i%3)*.12;d.position.set(brick.x+Math.cos(angle)*v*age,brick.y+Math.sin(angle)*v*age,.1+Math.max(0,.65*age-1.5*age*age));d.rotation.set(angle+age*(i%2?4:-3),age*2,angle);d.scale.set(.07*fade,.055*fade,.048*fade);d.updateMatrix();shards.setMatrixAt(used,d.matrix);shards.setColorAt(used,colors[brick.row]);used++;}}
  shards.count=used;shards.instanceMatrix.needsUpdate=true;if(shards.instanceColor)shards.instanceColor.needsUpdate=true;
  const positions=reduced?[]:s.trail;trail.count=positions.length;positions.forEach((p,i)=>{d.position.set(p.x,p.y,.15);d.rotation.set(0,0,0);d.scale.setScalar(.047*(1-i/11));d.updateMatrix();trail.setMatrixAt(i,d.matrix);});trail.instanceMatrix.needsUpdate=true;
 }
 return{shards,trail,draw,dispose(){shards.dispose();trail.dispose();}};
}
