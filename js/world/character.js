import * as THREE from 'three';
import { mesh, brass, ink, glass } from './materials.js';

export function createCharacter() {
  const root = new THREE.Group();
  const head = new THREE.Group();
  root.add(head);
  const shell = mesh(new THREE.SphereGeometry(.2, 40, 24), glass(0xe8e0b5), head);
  shell.castShadow=false;
  const core = mesh(new THREE.SphereGeometry(.11, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0xd0e7b6, emissive: 0x85b858, emissiveIntensity: .32, roughness: .24 }), head);
  const eyes = [];
  for (const x of [-.07, .07]) {
    const rim = mesh(new THREE.TorusGeometry(.04, .011, 10, 24), brass(), head, [x, .025, .178]);
    rim.rotation.y = x * 1.5;
    const eye = mesh(new THREE.SphereGeometry(.029, 16, 12), ink(), head, [x, .025, .19]);
    const glint = mesh(new THREE.SphereGeometry(.009, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), head, [x - .008, .034, .216]);
    eyes.push(eye, glint);
  }
  const antenna = mesh(new THREE.CylinderGeometry(.008, .013, .15, 12), brass(), head, [0, .24, 0]);
  const lamp = mesh(new THREE.SphereGeometry(.028, 16, 12), new THREE.MeshBasicMaterial({ color: 0xa5e8ac }), head, [0, .32, 0]);
  const limbs = [],feet=[];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group(); head.add(arm); arm.position.set(sign * .19, -.04, 0);
    const tube = mesh(new THREE.CapsuleGeometry(.012, .14, 4, 10), brass(), arm, [sign * .065, -.025, .025]);
    tube.rotation.z = sign * -.75;
    const hand=mesh(new THREE.SphereGeometry(.024, 12, 8), brass(), arm, [sign * .12, -.08, .03]);hand.name=sign===1?'mote-right-hand':'mote-left-hand';
    limbs.push(arm);
    const foot = mesh(new THREE.SphereGeometry(.035, 16, 12), brass(), head, [sign * .085, -.215, .055]);
    foot.scale.set(1, .5, 1.5);
    feet.push(foot);
  }
  const halo = mesh(new THREE.TorusGeometry(.26, .006, 8, 64), brass(), root);
  halo.rotation.x = Math.PI / 2; halo.position.y = -.32;
  let surprise = 0;
  const handDirection=new THREE.Vector3(.12,-.08,.03).normalize(),gripDirection=new THREE.Vector3(),gripRotation=new THREE.Quaternion(),headInverse=new THREE.Matrix4();
  const handLength=Math.hypot(.12,.08,.03);
  return { root, beacon:lamp, react() { surprise = 1; }, update(time, rhythm, pointer, large = false,dt=1/60,motion=null,expressionTime=time) {
    surprise *= Math.exp(-dt*2.2);
    const beat=rhythm.beat||0,mood=rhythm.energy??.55;
    head.position.y = (motion?.grounded?0:Math.sin(beat*Math.PI) * .026 + rhythm.pulse * .015) + surprise * .07;
    const action=Math.min(1,(motion?.run||0)+(motion?.swim||0)+(motion?.reach||0));
    head.rotation.y = (pointer.x * .35 + Math.sin(time * .5) * .12)*(1-action);
    head.rotation.z = Math.sin(beat*Math.PI) * .04*(.5+mood*.5);
    // A resting expression finishes even while the musical timeline is paused.
    const closing=(expressionTime%5.3-5.1)/.2;
    const blink=closing>0&&closing<1?1-.88*Math.sin(closing*Math.PI)**2:1;
    eyes.forEach(eye => { eye.scale.y = blink + surprise * .4; });
    limbs.forEach((arm,i)=>{
      const swing=Math.sin((motion?.phase||0)+i*Math.PI),run=motion?.run||0,swim=motion?.swim||0;
      arm.rotation.x=swing*(run*.7+swim*1.05);
      arm.rotation.z=i===1?(large&&!motion?Math.sin(beat*Math.PI)*.23*(.5+mood*.5)-.15:-surprise*.7)-(motion?.reach||0)*.9:0;
      arm.rotation.z+=(i===0?-1:1)*swim*.4;
      arm.scale.setScalar(1);
      if(i===1&&motion?.reach){
        head.updateMatrix();gripDirection.copy(motion.grip).applyMatrix4(headInverse.copy(head.matrix).invert()).sub(arm.position);const length=gripDirection.length();
        gripRotation.setFromUnitVectors(handDirection,gripDirection.normalize());arm.quaternion.slerp(gripRotation,motion.reach);
        arm.scale.setScalar(THREE.MathUtils.lerp(1,length/handLength,motion.reach));
      }
      feet[i].position.y=-.215+Math.max(0,-swing)*run*.06;
      feet[i].rotation.x=-swing*(run*.5+swim*.8);
    });
    halo.visible=!motion?.grounded;
    core.scale.setScalar(1 + rhythm.pulse * .08*(.5+mood*.5));
    lamp.scale.setScalar(1 + rhythm.pulse * .15*(.5+mood*.5));
    halo.rotation.z = time * .3;
    shell.rotation.y = time * .05;
    antenna.rotation.z = Math.sin(time * 2) * .04;
  } };
}
