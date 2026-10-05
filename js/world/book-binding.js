import * as THREE from 'three';
import {mesh} from './materials.js';
import {casing} from './hardware.js';

function hash(x,y){let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
let pixels;
function bindingPixels(){
 if(pixels)return pixels;
 const cloth=new Uint8Array(256*256*4),fiber=new Uint8Array(cloth.length),edge=new Uint8Array(128*512*4),relief=new Uint8Array(edge.length);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){
  const i=(y*256+x)*4,grain=hash(x,y),weft=Math.sin(x*Math.PI/3)*Math.cos(y*Math.PI/3);
  cloth[i]=128+weft*38+(grain-.5)*14;cloth[i+1]=215+grain*30;cloth[i+3]=255;
  const pulp=hash(Math.floor(x/3),y)*.35+grain*.65;
  fiber[i]=112+pulp*35;fiber[i+1]=222+pulp*25;fiber[i+3]=255;
 }
 for(let y=0;y<512;y++)for(let x=0;x<128;x++){
  const phase=y/512*96+Math.sin(x/128*Math.PI*2)*.1,groove=Math.exp(-Math.pow((phase-Math.floor(phase))/.16,2));
  const sectionPhase=y/512*12,section=Math.exp(-Math.pow((sectionPhase-Math.floor(sectionPhase))/.055,2));
  const grain=hash(x,y),tone=.94-groove*.095-section*.045+(grain-.5)*.025,i=(y*128+x)*4;
  edge[i]=232*tone;edge[i+1]=219*tone;edge[i+2]=190*tone;edge[i+3]=255;
  relief[i]=155-groove*60-section*25+(grain-.5)*12;relief[i+1]=230;relief[i+3]=255;
 }
 pixels={cloth,fiber,edge,relief};return pixels;
}
function texture(data,width,height,name,color=false){
 const map=new THREE.DataTexture(data,width,height);map.name=name;map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;
 map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.anisotropy=4;map.needsUpdate=true;return map;
}
function boardGeometry(){
 const geometry=casing(1.4,1.91,.095,.035),p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
 for(let i=0;i<p.count;i++){
  const side=Math.abs(n.getX(i))>.7,top=Math.abs(n.getY(i))>.7;
  uv.setXY(i,side?p.getZ(i)/.095+.5:p.getX(i)/1.43+.5,top?p.getZ(i)/.095+.5:p.getY(i)/1.94+.5);
 }
 return geometry;
}

// A closed text block joins the unchanged reading surface to its tilted board.
// Side UVs follow paper depth, so leaf edges stay parallel to the curved face.
function textBlock(sign,width,height,curve){
 const positions=[],uvs=[],groups=[];
 const boardFace=x=>-.18+Math.tan(.13)*(x-.72)+.0475/Math.cos(.13)+.001;
 const point=(x,y,layer)=>[sign*x,y,THREE.MathUtils.lerp(boardFace(x),curve(x)+.061,layer)];
 function quad(a,b,c,d,uv,material,reverse=false){
  const start=positions.length/3;
  for(const i of reverse?[0,2,1,0,3,2]:[0,1,2,0,2,3]){positions.push(...[a,b,c,d][i]);uvs.push(...uv[i]);}
  groups.push({start,count:6,materialIndex:material});
 }
 const x0=.004,x1=width-.003,y0=-height/2+.004,y1=height/2-.004;
 for(let i=0;i<32;i++){
  const a=THREE.MathUtils.lerp(x0,x1,i/32),b=THREE.MathUtils.lerp(x0,x1,(i+1)/32);
  for(const layer of [0,1])quad(point(a,y0,layer),point(b,y0,layer),point(b,y1,layer),point(a,y1,layer),[[0,0],[1,0],[1,1],[0,1]],0,sign*(layer?1:-1)<0);
  for(const y of [y0,y1])quad(point(a,y,0),point(b,y,0),point(b,y,1),point(a,y,1),[[i/32,0],[(i+1)/32,0],[(i+1)/32,1],[i/32,1]],1,sign*(y===y0?1:-1)<0);
 }
 for(const x of [x0,x1])quad(point(x,y0,0),point(x,y1,0),point(x,y1,1),point(x,y0,1),[[0,0],[1,0],[1,1],[0,1]],1,sign*(x===x0?-1:1)<0);
 const geometry=new THREE.BufferGeometry();
 // Merge consecutive groups; a side material must not create one draw per quad.
 const ordered=[],orderedUV=[];
 for(const materialIndex of [0,1]){
  const start=ordered.length/3;
  for(const group of groups.filter(group=>group.materialIndex===materialIndex)){
   ordered.push(...positions.slice(group.start*3,(group.start+group.count)*3));orderedUV.push(...uvs.slice(group.start*2,(group.start+group.count)*2));
  }
  geometry.addGroup(start,ordered.length/3-start,materialIndex);
 }
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(ordered,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(orderedUV,2));geometry.computeVertexNormals();return geometry;
}

export function createBookBinding(pivot,width,height,curve){
 const data=bindingPixels(),clothMap=texture(data.cloth,256,256,'book-cloth-relief'),paperMap=texture(data.fiber,256,256,'book-paper-relief');
 const edgeMap=texture(data.edge,128,512,'book-edge-color',true),edgeRelief=texture(data.relief,128,512,'book-edge-relief');
 const cloth=new THREE.MeshStandardMaterial({color:0x233830,roughness:.92,bumpMap:clothMap,bumpScale:.002,roughnessMap:clothMap});cloth.name='book-cloth';
 const paper=new THREE.MeshStandardMaterial({color:0xe7d5ae,roughness:.92,side:THREE.DoubleSide});
 const edges=new THREE.MeshStandardMaterial({map:edgeMap,bumpMap:edgeRelief,bumpScale:.0014,roughness:.95,roughnessMap:edgeRelief,side:THREE.DoubleSide});edges.name='book-leaf-edges';
 for(const sign of [-1,1]){
  const cover=mesh(boardGeometry(),cloth,pivot,[sign*.72,0,-.18]);cover.rotation.y=sign*-.13;cover.name='book-board';
  const block=mesh(textBlock(sign,width,height,curve),[paper,edges],pivot);block.name='book-text-block';
 }
 const spine=mesh(new THREE.CylinderGeometry(.095,.095,1.91,24),cloth,pivot,[0,0,-.17]);spine.name='book-spine';
 for(const y of [-.94,.94]){
  const band=mesh(new THREE.TorusGeometry(.092,.01,6,40),paper,pivot,[0,y,-.17]);band.rotation.x=Math.PI/2;
 }
 return{pageMaterial(map,side=THREE.DoubleSide){
  return new THREE.MeshStandardMaterial({map,roughness:.9,bumpMap:paperMap,bumpScale:.0008,roughnessMap:paperMap,side});
 }};
}
