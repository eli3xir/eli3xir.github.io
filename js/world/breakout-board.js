import * as THREE from 'three';
import {casing} from './hardware.js';
import {mesh,brass,ink} from './materials.js';
import {BREAKOUT,BRICKS,BRICK_COLORS} from './breakout-state.js';
export function createBreakoutBoard(){
 const root=new THREE.Group(),stage=new THREE.Group();root.add(stage);stage.rotation.set(-.13,-.10,-.045);
 mesh(casing(3.96,4.8,.22,.16),ink(),stage,[0,0,-.18]);
 const face=mesh(casing(3.7,4.39,.07,.06),new THREE.MeshStandardMaterial({color:0x223730,roughness:.66,metalness:.08}),stage,[0,-.02,-.045]);
 const railMaterial=brass();railMaterial.roughness=.64;railMaterial.metalness=.5;railMaterial.color.setHex(0x947a52);for(const x of [-1.865,1.865])mesh(casing(.10,4.3,.16,.025),railMaterial,stage,[x,-.03,.02]);mesh(casing(3.66,.10,.16,.025),railMaterial,stage,[0,2.065,.02]);
 for(const x of [-1.82,1.82])for(const y of [-2.25,2.25]){const screw=mesh(new THREE.CylinderGeometry(.024,.024,.022,12),railMaterial,stage,[x,y,-.025]);screw.rotation.x=Math.PI/2;}
 const tileMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.48,metalness:.06,clearcoat:.25,clearcoatRoughness:.45,envMapIntensity:.45}),tiles=new THREE.InstancedMesh(casing(.30,.15,.15,.015),tileMaterial,45);tiles.castShadow=tiles.receiveShadow=true;stage.add(tiles);tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);const dummy=new THREE.Object3D();for(const brick of BRICKS)tiles.setColorAt(brick.id,new THREE.Color(BRICK_COLORS[brick.row]));
 const slots=new THREE.InstancedMesh(casing(.31,.16,.025,.015),new THREE.MeshStandardMaterial({color:0x121e1a,roughness:.8}),45);for(const brick of BRICKS){dummy.position.set(brick.x,brick.y,-.004);dummy.updateMatrix();slots.setMatrixAt(brick.id,dummy.matrix);}stage.add(slots);slots.computeBoundingSphere();
 const paddle=new THREE.Group();stage.add(paddle);paddle.position.y=BREAKOUT.paddleY;const pad=mesh(casing(BREAKOUT.paddleW-.03,BREAKOUT.paddleH-.03,.17,.028),brass(),paddle,[0,0,.055]);mesh(casing(.62,.025,.025,.008),new THREE.MeshBasicMaterial({color:0xa8d9bd}),paddle,[0,.026,.148]);const handle=mesh(new THREE.SphereGeometry(.025,16,12),brass(),paddle,[0,-.20,.12]);const link=mesh(new THREE.CylinderGeometry(.013,.013,.14,10),brass(),paddle,[0,-.12,.12]);
 const anchor=new THREE.Object3D();anchor.position.set(-.11,-.27,.15);paddle.add(anchor);
 const ball=mesh(new THREE.SphereGeometry(BREAKOUT.radius,28,18),new THREE.MeshPhysicalMaterial({color:0xcfe4cb,emissive:0x649d7a,emissiveIntensity:.2,metalness:.25,roughness:.12,clearcoat:1}),stage);ball.castShadow=true;
 const target=mesh(new THREE.RingGeometry(.028,.038,24),new THREE.MeshBasicMaterial({color:0xc3bf91,transparent:true,opacity:.6,side:THREE.DoubleSide}),stage,[0,0,.008]);
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=120;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const label=mesh(new THREE.PlaneGeometry(3.48,.348),new THREE.MeshBasicMaterial({map:texture,transparent:true}),stage,[0,2.3,-.055]);label.castShadow=false;let previous='';
 function draw(s,reduced){const key=s.bricks.map(Number).join('');if(key!==previous){previous=key;for(const brick of BRICKS){dummy.position.set(brick.x,brick.y,.082);dummy.scale.setScalar(s.bricks[brick.id]?1:0);dummy.updateMatrix();tiles.setMatrixAt(brick.id,dummy.matrix);}tiles.instanceMatrix.needsUpdate=true;tiles.computeBoundingSphere();ctx.clearRect(0,0,1200,120);ctx.fillStyle='#d6c6a5';ctx.font='30px monospace';ctx.fillText('BREAK / MAKE ROOM',12,49);ctx.font='25px monospace';ctx.fillText(String(s.hits).padStart(2,'0')+' / 45',997,49);texture.needsUpdate=true;}
  paddle.position.x=s.paddle;const impulse=reduced?0:Math.exp(-Math.max(0,s.time-s.paddleHit)*22)*.12;pad.scale.set(1+impulse,1-impulse,1);ball.position.set(s.x,s.y,.15);ball.visible=s.status!=='over';target.position.set(s.paddle+Math.sin(s.aim)*.42,BREAKOUT.paddleY+.16+Math.cos(s.aim)*.42,.009);target.visible=s.status==='ready';
 }
 return{root,stage,face,tiles,slots,tileMaterial,paddle,ball,handle,anchor,label,texture,draw,dummy};
}
