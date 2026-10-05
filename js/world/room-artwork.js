import * as THREE from 'three';
import {SKINS} from '../experience/domain.js';
import {canvas,texture,printOn,paper} from './room-print.js';

const ids=Object.keys(SKINS),names=['WARM','BRICK','FOREST','OCEAN','CREAM'];
export const roomPaletteX=id=>(.5-(138+ids.indexOf(SKINS[id]?id:'default')*183)/1024)*1.05;
let profile;
export function loadRoomProfile(){
  return profile??=fetch('/assets/profile/github-avatar.png',{signal:AbortSignal.timeout(5000)})
    .then(response=>{if(!response.ok)throw Error('Profile image unavailable');return response.blob();})
    .then(blob=>createImageBitmap(blob)).catch(()=>null);
}

function arch(ctx,x,y,width,height,color){
  const radius=width/2;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y+height);ctx.lineTo(x,y+radius);ctx.arc(x+radius,y+radius,radius,Math.PI,Math.PI*2);ctx.lineTo(x+width,y+height);ctx.closePath();ctx.fill();
}
export function installRoomArtwork(asset,image,renderer){
  const card=asset.getObjectByName('photo_card'),photo=asset.getObjectByName('photo_img'),painting=asset.getObjectByName('painting_canvas');
  if(!card||!photo||!painting)return{profile:'unavailable'};
  const portrait=canvas(512,460);paper(portrait.ctx,512,460,'#efede5');
  if(image)portrait.ctx.drawImage(image,58,32,396,396);
  else{portrait.ctx.fillStyle='#dc9284';portrait.ctx.textAlign='center';portrait.ctx.font='italic 160px Georgia,serif';portrait.ctx.fillText('e3',256,288);}
  printOn(photo,texture(portrait.canvas,'eli3xir-public-profile',renderer),.2,.18);
  const border=canvas(512,640);paper(border.ctx,512,640,'#eee6d4');border.ctx.fillStyle='#39423a';border.ctx.font='italic 55px Georgia,serif';border.ctx.textAlign='center';border.ctx.fillText('eli3xir',256,572);border.ctx.font='14px monospace';border.ctx.fillText('AFTER HOURS / STILL CURIOUS',256,602);
  printOn(card,texture(border.canvas,'eli3xir-signed-card',renderer),.24,.3);
  const print=canvas(1024,732),ctx=print.ctx;paper(ctx,1024,732,'#ede3ca');
  ctx.fillStyle='#354035';ctx.font='18px monospace';ctx.fillText('ELI3XIR / ROOM NOTES',64,66);ctx.textAlign='right';ctx.font='48px Georgia,serif';ctx.fillText('06',957,77);ctx.textAlign='left';
  ctx.font='italic 90px Georgia,serif';ctx.fillText('Five ways',59,177);ctx.font='60px Georgia,serif';ctx.fillText('to feel at home.',63,247);
  ids.forEach((id,i)=>{
    const x=64+i*183,colors=SKINS[id].colors;arch(ctx,x,296,148,270,colors[0]);ctx.strokeStyle='#35403566';ctx.lineWidth=1.5;ctx.stroke();
    ctx.save();ctx.beginPath();ctx.rect(x,431,148,135);ctx.clip();arch(ctx,x+20,393,108,174,colors[1]);ctx.restore();
    ctx.fillStyle=colors[2];ctx.fillRect(x,546,148,20);ctx.fillStyle='#354035';ctx.font='17px monospace';ctx.textAlign='center';ctx.fillText(names[i],x+74,625);
  });
  ctx.textAlign='left';ctx.strokeStyle='#35403566';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(64,660);ctx.lineTo(960,660);ctx.stroke();ctx.font='15px monospace';ctx.fillText('SAME ROOM. DIFFERENT LIGHT.',64,694);
  printOn(painting,texture(print.canvas,'five-room-palettes',renderer),1.05,.75);
  painting.material.emissive.set(0xffffff);painting.material.emissiveMap=painting.material.map;painting.material.emissiveIntensity=.07;
  const cursor=new THREE.Mesh(new THREE.ConeGeometry(.012,.024,3),new THREE.MeshStandardMaterial({color:0x9c733c,metalness:.72,roughness:.3}));
  cursor.name='room-palette-pointer';cursor.position.set(roomPaletteX('default'),(.5-590/732)*.75,-.026);painting.add(cursor);
  return{profile:image?'github':'monogram',cursor,textureCount:3};
}
