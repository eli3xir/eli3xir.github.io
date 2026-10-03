import * as THREE from 'three';

export function casing(width,height,depth,radius=.06){
  const x=-width/2,y=-height/2,w=width,h=height,r=Math.min(radius,width/3,height/3),s=new THREE.Shape();
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:depth-.04,bevelEnabled:true,bevelSize:.015,bevelThickness:.02,bevelSegments:3,curveSegments:6,steps:1});
  g.translate(0,0,-depth/2+.02);return g;
}

