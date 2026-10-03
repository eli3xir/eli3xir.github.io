import * as THREE from 'three';
import {mesh} from './materials.js';

export function recordLabel(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#d5b77a';ctx.fillRect(0,0,512,512);ctx.fillStyle='#293a30';ctx.textAlign='center';
  ctx.font='22px monospace';ctx.fillText('ELI3XIR / 112 BPM',256,124);ctx.font='italic 51px Georgia';ctx.fillText('After Hours',256,220);
  ctx.font='19px monospace';ctx.fillText('A / CURIOSITY',256,332);ctx.fillText('AN ORIGINAL SCORE',256,365);
  ctx.strokeStyle='#53634d';ctx.lineWidth=3;for(const radius of [191,220]){ctx.beginPath();ctx.arc(256,256,radius,0,Math.PI*2);ctx.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

function meterFace(name){
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=224;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#d8ceb1';ctx.fillRect(0,0,384,224);ctx.textAlign='center';ctx.fillStyle='#344034';ctx.font='22px monospace';ctx.fillText(name,192,37);
  for(let i=0;i<=12;i++){
    const angle=-Math.PI*.78+i/12*Math.PI*.56;
    ctx.strokeStyle=i>9?'#a06446':'#344034';ctx.lineWidth=i%3?2:4;
    ctx.beginPath();ctx.moveTo(192+Math.cos(angle)*140,205+Math.sin(angle)*140);ctx.lineTo(192+Math.cos(angle)*(i%3?130:122),205+Math.sin(angle)*(i%3?130:122));ctx.stroke();
  }
  ctx.font='15px monospace';ctx.fillText('STEM LEVEL',192,208);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function createMeters(deck,metal){
  return ['PADS','BASS','LEAD','DRUMS'].map((name,i)=>{
    const root=new THREE.Group();root.position.set(-.85+i*.56,-.455,.905);root.userData.action=`stem:${i}`;deck.add(root);
    mesh(new THREE.BoxGeometry(.5,.29,.028),metal,root);
    const face=mesh(new THREE.PlaneGeometry(.454,.251),new THREE.MeshBasicMaterial({map:meterFace(name),toneMapped:false}),root,[0,0,.018]);face.castShadow=false;
    const pivot=new THREE.Group();pivot.position.set(0,-.098,.029);root.add(pivot);
    const needle=mesh(new THREE.BoxGeometry(.006,.132,.006),new THREE.MeshStandardMaterial({color:0x314035,roughness:.45}),pivot,[0,.064,0]);needle.castShadow=false;
    mesh(new THREE.SphereGeometry(.012,12,8),metal,root,[0,-.098,.029]);
    return{root,pivot,level:0};
  });
}
