import * as THREE from 'three';
import {mesh,brass,ink,glass} from './materials.js';
import {casing} from './hardware.js';
import {batchStatic} from './batch.js';
function strut(parent,a,b,r,material){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),line=mesh(new THREE.CylinderGeometry(r,r,from.distanceTo(to),12),material,parent);line.position.copy(from.add(to).multiplyScalar(.5));line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return line;}
export function createObservatory(){
 const root=new THREE.Group(),metal=brass(),dark=ink(),wood=new THREE.MeshStandardMaterial({color:0x302a22,roughness:.6,metalness:.05}),sky=new THREE.Group();sky.position.set(0,.43,-.25);sky.scale.z=.4;root.add(sky);
 mesh(casing(3.45,.16,2.3,.15),wood,root,[0,-1.72,.15]);
 const skyMaterial=new THREE.MeshStandardMaterial({color:0x101c28,roughness:.64,metalness:.08,emissive:0x06111a,emissiveIntensity:.16});
 const surface=mesh(new THREE.SphereGeometry(1.406,80,48,0,Math.PI*2,0,Math.PI/2),skyMaterial,sky);surface.rotation.x=Math.PI/2;surface.castShadow=false;surface.receiveShadow=false;
 mesh(new THREE.TorusGeometry(1.437,.018,12,144),metal,sky);
 const rim=new THREE.MeshStandardMaterial({color:0x526579,roughness:.55,metalness:.45});
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2,line=mesh(new THREE.BoxGeometry(.006,i%4===0?.06:.024,.014),rim,sky,[Math.sin(a)*1.48,Math.cos(a)*1.48,0]);line.rotation.z=-a;}
 for(const x of [-1.20,1.20]){strut(root,[x,-1.64,-.15],[x,-.44,-.15],.032,metal);mesh(new THREE.CylinderGeometry(.078,.11,.08,20),metal,root,[x,-1.61,-.15]);}
 const cameraRig=new THREE.Group();cameraRig.position.set(0,-.81,1.02);cameraRig.lookAt(0,.40,-.25);root.add(cameraRig);
 mesh(casing(.92,.55,.32,.065),dark,cameraRig);mesh(casing(.91,.075,.34,.025),metal,cameraRig,[0,.264,0]);mesh(casing(.91,.05,.34,.025),metal,cameraRig,[0,-.258,0]);
 const barrel=mesh(new THREE.CylinderGeometry(.245,.26,.34,48),dark,cameraRig,[.03,0,.27]);barrel.rotation.x=Math.PI/2;
 for(const z of [.16,.29,.42]){const ring=mesh(new THREE.TorusGeometry(.245,.017,10,48),metal,cameraRig,[.03,0,z]);ring.castShadow=false;}
 const coating=glass(0x547b7f);coating.opacity=.5;coating.thickness=.05;const lens=mesh(new THREE.SphereGeometry(.215,32,16),coating,cameraRig,[.03,0,.43]);lens.scale.z=.22;lens.castShadow=false;
 const aperture=mesh(new THREE.CircleGeometry(.20,32),new THREE.MeshBasicMaterial({color:0x02070d}),cameraRig,[.03,0,.44]);aperture.castShadow=false;
 const shine=mesh(new THREE.CircleGeometry(.065,24),new THREE.MeshBasicMaterial({color:0x46716e,transparent:true,opacity:.6}),cameraRig,[-.035,.035,.447]);shine.castShadow=false;
 const rear=mesh(casing(.36,.25,.018,.02),new THREE.MeshStandardMaterial({color:0x142323,roughness:.23,metalness:.2}),cameraRig,[0,.0,-.17]);
 for(const x of [-.38,.38])mesh(new THREE.CylinderGeometry(.09,.09,.07,28),metal,cameraRig,[x,.32,0]);
 const shutter=mesh(new THREE.CylinderGeometry(.05,.056,.033,24),new THREE.MeshStandardMaterial({color:0xa98462,roughness:.36,metalness:.7}),cameraRig,[.26,.31,0]);
 const led=mesh(new THREE.SphereGeometry(.025,16,10),new THREE.MeshBasicMaterial({color:0x819c76}),cameraRig,[-.3,.15,-.177]);
 const lever=mesh(new THREE.BoxGeometry(.20,.022,.037),metal,cameraRig,[.25,.36,0]);
 mesh(new THREE.SphereGeometry(.11,24,16),metal,root,[0,-1.09,.98]);
 const feet=[[-.56,-1.635,1.28],[.56,-1.635,1.28],[0,-1.635,.40]];
 for(const foot of feet){strut(root,[0,-1.12,.97],foot,.023,metal);mesh(new THREE.SphereGeometry(.05,12,8),dark,root,foot);}
 const release=mesh(new THREE.SphereGeometry(.06,20,12),new THREE.MeshStandardMaterial({color:0x394743,roughness:.9}),root,[-.83,-1.60,.91]);release.scale.set(.7,.7,1.8);
 const cable=new THREE.CatmullRomCurve3([new THREE.Vector3(-.8,-1.56,.88),new THREE.Vector3(-.61,-1.58,.70),new THREE.Vector3(-.50,-1.35,.63),new THREE.Vector3(-.35,-.82,.96)]);mesh(new THREE.TubeGeometry(cable,36,.012,8,false),dark,root);
 const actorAnchor=new THREE.Object3D();actorAnchor.position.set(-1.13,-1.51,.91);root.add(actorAnchor);
 const exclude=new Set([surface,shutter,led,lever,...cameraRig.children]);batchStatic(root,exclude);
 return{root,sky,surface,cameraRig,shutter,led,lever,release,actorAnchor,rear};
}
