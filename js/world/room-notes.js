import * as THREE from 'three';
import {canvas,texture,printOn,paper} from './room-print.js';
import {ROOM_PROJECTS} from './room-projects.js';

const notes=[['compiler','PASCAL-S','03'],['curious','still curious',''],['face','FACE / API','02'],['recognition','MTCNN','FaceNet'],['detection','detect','embed'],['database','MySQL',''],['chat','C++ CHAT','01'],['llvm','LLVM',''],['parser','lex','yacc'],['message','hello,','world']];
const projectIds=['project-compiler',null,'project-face','project-face','project-face','project-chat','project-chat','project-compiler','project-compiler','project-chat'];
function line(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}
function text(ctx,value,x,y,size=17,font='monospace'){ctx.font=`${size}px ${font}`;ctx.fillText(value,x,y);}
function draw(ctx,[kind,title,sub]){
 ctx.fillStyle=ctx.strokeStyle='#303a35';ctx.lineWidth=1.7;ctx.lineCap='round';ctx.lineJoin='round';ctx.textAlign='center';
 if(kind==='compiler'){
  text(ctx,title,64,41,20);text(ctx,':=',64,68,24);line(ctx,[[55,74],[40,86]]);line(ctx,[[73,74],[88,86]]);text(ctx,'x',38,109,25);text(ctx,'1',90,109,25);text(ctx,sub,113,122,9);
 }else if(kind==='chat'){
  text(ctx,title,64,42,20);for(const [x,y] of [[32,70],[94,70],[64,102]]){circle(ctx,x,y,9);}line(ctx,[[41,70],[85,70]]);line(ctx,[[38,78],[57,96]]);line(ctx,[[89,78],[71,96]]);text(ctx,sub,109,118,10);
 }else if(kind==='face'){
  text(ctx,title,64,41,18);for(const [x,y,sx,sy] of [[36,53,1,1],[92,53,-1,1],[36,106,1,-1],[92,106,-1,-1]])line(ctx,[[x,y+sy*12],[x,y],[x+sx*12,y]]);
  circle(ctx,53,73,2);circle(ctx,75,73,2);line(ctx,[[64,74],[61,85],[65,85]]);line(ctx,[[53,94],[64,98],[75,93]]);text(ctx,sub,109,118,10);
 }else if(kind==='database'){
  text(ctx,title,64,43,22);for(const y of [60,77,94]){ctx.beginPath();ctx.ellipse(64,y,30,8,0,0,Math.PI*2);ctx.stroke();}line(ctx,[[34,60],[34,94]]);line(ctx,[[94,60],[94,94]]);
 }else if(kind==='parser'){
  text(ctx,title,45,51,28);line(ctx,[[44,60],[44,81],[70,81]]);line(ctx,[[63,75],[70,81],[63,87]]);text(ctx,sub,79,105,23);
 }else if(kind==='llvm'){
  text(ctx,title,64,48,27);text(ctx,'IR',64,80,22);line(ctx,[[29,99],[94,99]]);line(ctx,[[86,91],[94,99],[86,107]]);
 }else if(kind==='recognition'){
  text(ctx,title,64,49,22);line(ctx,[[64,60],[64,76]]);line(ctx,[[59,70],[64,76],[69,70]]);text(ctx,sub,64,102,22);
 }else if(kind==='detection'){
  text(ctx,title,60,46,22,'Georgia,serif');line(ctx,[[35,57],[90,57]]);text(ctx,sub,64,80,22,'Georgia,serif');for(let i=0;i<5;i++)circle(ctx,40+i*12,103,2);
 }else if(kind==='message'){
  text(ctx,title,62,49,25,'Georgia,serif');text(ctx,sub,65,79,25,'Georgia,serif');line(ctx,[[22,32],[22,96],[70,96],[81,107],[82,95],[108,95],[108,32]]);
 }else{
  text(ctx,'?',64,80,66,'Georgia,serif');text(ctx,title,64,111,12,'Georgia,serif');
 }
}
export function installRoomNotes(asset,renderer){
 const sheet=canvas(1024,1024),map=texture(sheet.canvas,'eli3xir-project-notes',renderer),meshes=[];asset.updateWorldMatrix(true,true);
 notes.forEach((content,i)=>{
  const object=asset.getObjectByName(`note${i}`);if(!object)return;const column=i%4,row=Math.floor(i/4),ctx=sheet.ctx;
  ctx.save();ctx.translate(column*256,row*256);paper(ctx,256,256,'#'+object.material.color.getHexString());ctx.scale(2,2);draw(ctx,content);ctx.restore();
  object.geometry.computeBoundingBox();const size=object.geometry.boundingBox.getSize(new THREE.Vector3());
  // Two texel gutters keep neighbouring ink out of the paper edge under filtering.
  printOn(object,map,size.x,size.y,[(column*256+2)/1024,1-((row+1)*256-2)/1024,252/1024,252/1024]);
  object.userData.roomProject=projectIds[i]||'projects';meshes.push(object);
 });
 const views={};for(const project of ROOM_PROJECTS){
  const note=asset.getObjectByName(project.note);if(!note)continue;const p=note.getWorldPosition(new THREE.Vector3());
  views[project.id]={target:p.toArray(),camera:[p.x,p.y+.02,p.z-1.6],actor:[p.x+.23,p.y+.22,p.z-.10],actorScale:.28,minDistance:.75};
 }
 return{map,meshes,views};
}
