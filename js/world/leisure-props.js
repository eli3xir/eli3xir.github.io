import * as THREE from 'three';
import {brass,ink,mesh} from './materials.js';
import {casing} from './hardware.js';
import {createLeisureWater} from './leisure-water.js';

export function createLeisureProps(root){
  const cream=new THREE.MeshStandardMaterial({color:0xdfd4b8,roughness:.57}),metal=brass();
  mesh(new THREE.CylinderGeometry(1,1,.16,128).scale(1.7,1,1.05),ink(),root,[0,-.87,0]);
  mesh(new THREE.CylinderGeometry(1,1,.025,128).scale(1.68,1,1.03),metal,root,[0,-.777,0]);
  mesh(new THREE.CylinderGeometry(1,1,.035,128).scale(1.64,1,.99),new THREE.MeshStandardMaterial({color:0x6d7461,roughness:.85}),root,[0,-.747,0]);
  const shape=new THREE.Shape();shape.absellipse(0,0,1.60,.95,0,Math.PI*2,false,0);
  const hole=new THREE.Path();hole.absellipse(0,0,1.13,.51,0,Math.PI*2,true,0);shape.holes.push(hole);
  const trackMaterial=new THREE.MeshStandardMaterial({color:0xa35f46,roughness:.93});
  trackMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uLaneColor={value:new THREE.Color(0xdfd4b8)};
    shader.vertexShader='varying vec2 vLanePoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvLanePoint=position.xz;');
    shader.fragmentShader=`varying vec2 vLanePoint;uniform vec3 uLaneColor;
      float lane(vec2 radii){float d=length(vLanePoint/radii)-1.,a=max(fwidth(d)*.65,.0001);
        return smoothstep(-.007-a,-.007+a,d)-smoothstep(.007-a,.007+a,d);}
      `+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
        float paint=max(lane(vec2(1.58,.93)),max(lane(vec2(1.36,.73)),lane(vec2(1.15,.53))));diffuseColor.rgb=mix(diffuseColor.rgb,uLaneColor,paint);`);
  };
  const track=mesh(new THREE.ShapeGeometry(shape,128).rotateX(-Math.PI/2),trackMaterial,root,[0,-.723,0]);
  track.name='leisure-track';track.userData.activity='run';
  for(let i=0;i<3;i++)mesh(new THREE.BoxGeometry(.025,.007,.068),cream,root,[-.04+i*.06,-.71,.805]);
  const pool=new THREE.Group();pool.position.x=-.52;root.add(pool);
  mesh(casing(1.10,.07,.76,.04),cream,pool,[0,-.81,0]);
  for(const sign of [-1,1]){
    mesh(casing(.04,.16,.74,.01),cream,pool,[sign*.53,-.72,0]);
    mesh(casing(1.10,.16,.04,.015),cream,pool,[0,-.72,sign*.35]);
  }
  const water=createLeisureWater(pool);water.water.userData.activity='swim';
  // A small pool ladder makes the scale and purpose legible from the room view.
  for(const x of [-.12,.12]){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,-.75,-.21),new THREE.Vector3(x,-.57,-.27),new THREE.Vector3(x,-.54,-.33),new THREE.Vector3(x,-.70,-.42)]);
    mesh(new THREE.TubeGeometry(curve,24,.009,8,false),metal,pool);
  }
  for(const z of [-.26,-.30])mesh(new THREE.CylinderGeometry(.009,.009,.24,8).rotateZ(Math.PI/2),metal,pool,[0,-.68,z]);
  const board=new THREE.Group();board.position.set(.63,0,0);root.add(board);
  const frame=mesh(casing(.82,.07,.82,.035),metal,board,[0,-.68,0]);frame.name='leisure-board';frame.userData.activity='chess';
  const squares=new THREE.InstancedMesh(new THREE.BoxGeometry(.115,.012,.115),new THREE.MeshStandardMaterial({roughness:.5}),36),dummy=new THREE.Object3D();
  for(let z=0;z<6;z++)for(let x=0;x<6;x++){
    dummy.position.set((x-2.5)*.115,-.635,(z-2.5)*.115);dummy.updateMatrix();squares.setMatrixAt(z*6+x,dummy.matrix);squares.setColorAt(z*6+x,new THREE.Color((x+z)%2?0x354840:0xe4d2aa));
  }
  squares.instanceMatrix.needsUpdate=true;squares.instanceColor.needsUpdate=true;squares.castShadow=squares.receiveShadow=true;board.add(squares);
  const profile=new THREE.CurvePath();
  profile.add(new THREE.CubicBezierCurve(new THREE.Vector2(.065,0),new THREE.Vector2(.10,.04),new THREE.Vector2(.028,.038),new THREE.Vector2(.028,.12)));
  profile.add(new THREE.CubicBezierCurve(new THREE.Vector2(.028,.12),new THREE.Vector2(.028,.16),new THREE.Vector2(.055,.16),new THREE.Vector2(.04,.18)));
  const pawnGeometry=new THREE.LatheGeometry(profile.getPoints(32),40);
  const pawn=new THREE.Group();pawn.name='leisure-pawn';board.add(pawn);pawn.position.set(-.115,-.628,.115);
  mesh(pawnGeometry,cream,pawn);mesh(new THREE.SphereGeometry(.048,24,16),cream,pawn,[0,.205,0]);
  const other=new THREE.Group();board.add(other);other.position.set(.23,-.628,-.23);
  const dark=new THREE.MeshStandardMaterial({color:0x273b34,roughness:.3});mesh(pawnGeometry,dark,other);mesh(new THREE.SphereGeometry(.048,24,16),dark,other,[0,.205,0]);
  return{track,pool,board:frame,pawn,water,squares};
}
