import * as THREE from 'three';
import {brass,mesh} from './materials.js';
import {batchStatic} from './batch.js';

export function casing(width,height,depth,radius=.06){
  const x=-width/2,y=-height/2,w=width,h=height,r=Math.min(radius,width/3,height/3),s=new THREE.Shape();
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:depth-.04,bevelEnabled:true,bevelSize:.015,bevelThickness:.02,bevelSegments:3,curveSegments:6,steps:1});
  g.translate(0,0,-depth/2+.02);return g;
}

export function display(width=512,height=320){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  function draw(label,message,footer='LISTENING'){
    ctx.fillStyle='#102a27';ctx.fillRect(0,0,width,height);
    const gradient=ctx.createRadialGradient(width*.4,height*.3,0,width*.5,height*.5,width*.7);
    gradient.addColorStop(0,'#295244');gradient.addColorStop(1,'#081815');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#92bba2';ctx.font='20px monospace';ctx.fillText(label,28,36);
    ctx.fillStyle='#d7e8bc';ctx.font='36px "Microsoft YaHei",monospace';
    const lines=[];let line='';
    for(const char of Array.from(message||'…')){
      if(ctx.measureText(line+char).width>width-56&&line){lines.push(line);line=char;}else line+=char;
    }
    if(line)lines.push(line);
    lines.slice(0,4).forEach((line,i)=>ctx.fillText(line,28,98+i*42));
    ctx.font='17px monospace';ctx.fillStyle='#8ca78d';ctx.fillText(footer,28,height-22);
    ctx.fillStyle='#001d1818';for(let y=0;y<height;y+=4)ctx.fillRect(0,y,width,1);
    texture.needsUpdate=true;
  }
  draw('','');return{texture,draw};
}

export function terminal(parent,name,position,yaw){
  const root=new THREE.Group();root.position.set(...position);root.rotation.y=yaw;parent.add(root);
  const enamel=new THREE.MeshPhysicalMaterial({color:0x31463d,roughness:.3,metalness:.5,clearcoat:.55});
  const metal=brass(),rubber=new THREE.MeshStandardMaterial({color:0x121b17,roughness:.8});
  mesh(casing(.83,.65,.43),enamel,root);
  mesh(casing(.735,.53,.025,.065),metal,root,[0,.025,.23]);
  mesh(casing(.68,.465,.02,.05),new THREE.MeshStandardMaterial({color:0x0b1713,roughness:.28}),root,[0,.025,.25]);
  const screen=display(),geometry=new THREE.PlaneGeometry(.624,.39,20,12),pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setZ(i,.025*(1-Math.pow(pos.getX(i)/.32,2))*(1-Math.pow(pos.getY(i)/.2,2)));
  geometry.computeVertexNormals();
  const face=mesh(geometry,new THREE.MeshBasicMaterial({map:screen.texture,toneMapped:false}),root,[0,.025,.269]);face.castShadow=false;face.receiveShadow=false;
  mesh(casing(.91,.1,.58,.035),enamel,root,[0,-.39,.06]);
  const keys=new THREE.InstancedMesh(new THREE.BoxGeometry(.05,.012,.04),metal,24),matrix=new THREE.Matrix4();
  for(let i=0;i<24;i++){matrix.makeTranslation((i%8-3.5)*.075,-.328,.15+Math.floor(i/8)*.054);keys.setMatrixAt(i,matrix);}root.add(keys);
  const led=mesh(new THREE.SphereGeometry(.018,10,8),new THREE.MeshStandardMaterial({color:0x95ddac,emissive:0x4a9c66,emissiveIntensity:.6}),root,[.33,-.277,.241]);
  for(const x of [-.37,.37])for(const y of [-.28,.28]){
    const screw=mesh(new THREE.CylinderGeometry(.015,.015,.012,12),metal,root,[x,y,.225]);screw.rotation.x=Math.PI/2;
  }
  for(const x of [-.32,.32])for(const z of [-.13,.27])mesh(new THREE.CylinderGeometry(.035,.035,.055,12),rubber,root,[x,-.46,z]);
  batchStatic(root,new Set([keys,led]));
  screen.draw(`TERMINAL ${name}`,'…');
  return{root,screen,led,face};
}
