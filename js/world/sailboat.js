import * as THREE from 'three';
import {mesh,brass} from './materials.js';

const beam=z=>.275*Math.sqrt(Math.max(0,1-((z+.12)/.92)**2));
function hullGeometry(){
  const positions=[],uv=[],indices=[],rows=56,cols=24;
  for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){
    const z=-.78+i/rows*1.58,angle=-Math.PI/2+j/cols*Math.PI,w=beam(z);
    positions.push(Math.sin(angle)*w,.12-Math.cos(angle)*(.25+Math.sin(i/rows*Math.PI)*.09),z);uv.push(j/cols,i/rows);
    if(i<rows&&j<cols){const a=i*(cols+1)+j,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function deckTexture(){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#c5a075';ctx.fillRect(0,0,256,512);
  for(let x=0;x<256;x++){
    ctx.fillStyle=`rgba(62,37,16,${.035+.045*(Math.sin(x*12.31)*.5+.5)})`;ctx.fillRect(x,0,1,512);
    if(x%32===0){ctx.fillStyle='#5f4a32';ctx.fillRect(x,0,1,512);}
  }
  for(let row=0;row<4;row++)for(let col=0;col<8;col++){ctx.fillStyle='#70543a';ctx.fillRect(col*32,row*128+(col%2)*48,32,1);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function cloth(root,{height,length,forward=false},uniforms){
  const geometry=new THREE.PlaneGeometry(1,1,24,32);
  // Plane UVs provide a rectangular parameter domain which tapers to a triangle.
  const point=`vec3 sailPoint(vec2 uv){float u=uv.x,v=uv.y;
    float billow=sin(u*3.14159265)*pow(max(0.,1.-v),.7)*(.035+.13*uSailWind);
    float flutter=sin(u*19.+v*7.-uSailTime*5.)*u*(1.-v)*.009*uSailWind;
    return vec3(.014+billow+flutter,.24+v*${height.toFixed(3)},.12+${forward?'1.':'-1.'}*u*(1.-v)*${length.toFixed(3)});}`;
  const material=new THREE.MeshStandardMaterial({color:forward?0xe6dfc9:0xf1e7cd,roughness:.9,side:THREE.DoubleSide});
  const apply=shader=>{
    Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform float uSailTime,uSailWind;\n'+point+'\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec2 nUV=vec2(uv.x,min(uv.y,.999));objectNormal=normalize(cross(sailPoint(nUV+vec2(.001,0.))-sailPoint(nUV-vec2(.001,0.)),sailPoint(nUV+vec2(0.,.001))-sailPoint(nUV-vec2(0.,.001))));');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed=sailPoint(uv);');
  };
  material.onBeforeCompile=shader=>{
    apply(shader);shader.vertexShader='varying vec2 vCloth;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nvCloth=uv;');
    shader.fragmentShader='varying vec2 vCloth;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float seam=1.-smoothstep(.005,.011,abs(fract(vCloth.y*5.+.5)-.5));
      float edge=max(1.-smoothstep(.01,.035,vCloth.x),smoothstep(.965,.99,vCloth.x));diffuseColor.rgb*=1.-.13*max(seam,edge);`);
  };
  material.customProgramCacheKey=()=>`sail-${height}-${length}-${forward}`;
  const sail=mesh(geometry,material,root);sail.name=forward?'sailboat-jib':'sailboat-main';sail.frustumCulled=false;
  sail.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});sail.customDepthMaterial.onBeforeCompile=apply;
  sail.customDepthMaterial.customProgramCacheKey=material.customProgramCacheKey;
  // The deformed extent is independent of the original unit plane.
  geometry.boundingBox=new THREE.Box3(new THREE.Vector3(-.03,.20,-.75),new THREE.Vector3(.28,1.65,.82));geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.8,0),1.25);
  return sail;
}
export function createSailboat(){
  const root=new THREE.Group();root.name='sailboat';const metal=brass(),wood=new THREE.MeshStandardMaterial({map:deckTexture(),color:0xe4c393,roughness:.61});
  const hull=mesh(hullGeometry(),new THREE.MeshPhysicalMaterial({color:0x29464a,roughness:.29,clearcoat:.6,side:THREE.DoubleSide}),root);hull.name='sailboat-hull';
  const outline=[];for(let i=0;i<=56;i++){const z=-.78+i/56*1.58;outline.push(new THREE.Vector2(beam(z),-z));}for(let i=56;i>=0;i--){const z=-.78+i/56*1.58;outline.push(new THREE.Vector2(-beam(z),-z));}
  const deckGeometry=new THREE.ExtrudeGeometry(new THREE.Shape(outline),{depth:.025,bevelEnabled:false}).rotateX(-Math.PI/2);
  const coords=deckGeometry.attributes.position,uv=deckGeometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,coords.getX(i)/.55+.5,(coords.getZ(i)+.78)/1.58);
  mesh(deckGeometry,wood,root,[0,.12,0]).name='sailboat-deck';
  const edgePoints=outline.map(p=>new THREE.Vector3(p.x,.155,-p.y));edgePoints.push(edgePoints[0]);mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePoints,false,'centripetal'),160,.014,8,false),wood,root);
  mesh(new THREE.BoxGeometry(beam(-.78)*2,.20,.022),wood,root,[0,.025,-.78]);
  mesh(new THREE.BoxGeometry(.26,.025,.32),new THREE.MeshStandardMaterial({color:0x263b38,roughness:.8}),root,[0,.155,-.30]);
  for(const x of [-.16,.16])mesh(new THREE.BoxGeometry(.065,.045,.4),wood,root,[x,.185,-.30]);
  mesh(new THREE.CylinderGeometry(.009,.017,1.52,20),metal,root,[0,.90,.12]);
  mesh(new THREE.CylinderGeometry(.008,.012,.76,16).rotateX(Math.PI/2),metal,root,[.012,.235,-.25]);
  for(const x of [-.2,.2]){
    const cable=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,.16,-.1),new THREE.Vector3(0,1.63,.12),new THREE.Vector3(0,.16,.76)]),new THREE.LineBasicMaterial({color:0xb6ad8e}));root.add(cable);
  }
  const uniforms={uSailTime:{value:0},uSailWind:{value:1}};
  const sails=[cloth(root,{height:1.36,length:.78},uniforms),cloth(root,{height:1.16,length:.60,forward:true},uniforms)];
  return{root,uniforms,update(time,wind=1){uniforms.uSailTime.value=time;uniforms.uSailWind.value=wind;},dispose(){sails.forEach(s=>s.customDepthMaterial.dispose());}};
}
