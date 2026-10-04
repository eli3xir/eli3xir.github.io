// A directional height field; the CPU and GPU use these same wave coefficients.
export const WAVES=[
  {x:.96,z:.28,amplitude:.052,length:2.15,speed:1.12},
  {x:.42,z:.91,amplitude:.031,length:1.17,speed:1.57},
  {x:-.65,z:.76,amplitude:.016,length:.64,speed:2.08},
  {x:.83,z:-.56,amplitude:.007,length:.31,speed:2.71}
];
export function waveSample(x,z,time,strength=1){
  let height=0,dx=0,dz=0;
  for(const w of WAVES){const k=Math.PI*2/w.length,p=k*(w.x*x+w.z*z)-w.speed*time,a=w.amplitude*strength;
    height+=a*Math.sin(p);const slope=a*k*Math.cos(p);dx+=slope*w.x;dz+=slope*w.z;}
  return{height,dx,dz};
}
const number=value=>Number(value).toFixed(9);
export const waveGLSL=`vec3 oceanWave(vec2 p,float time,float strength){vec3 result=vec3(0.);
 ${WAVES.map(w=>`{vec2 d=vec2(${number(w.x)},${number(w.z)});float k=${number(Math.PI*2/w.length)},phase=k*dot(d,p)-${number(w.speed)}*time,a=${number(w.amplitude)}*strength;result+=vec3(a*sin(phase),a*k*cos(phase)*d);}`).join('\n')}
 return result;}`;
export function floatBoat(boat,x,z,heading,time,strength=1,scale=1,base=0,footprint=1){
  const s=Math.sin(heading),c=Math.cos(heading),sample=(right,forward)=>waveSample(x/scale+(right*c+forward*s)*footprint,z/scale+(-right*s+forward*c)*footprint,time,strength).height;
  const front=sample(0,.55),back=sample(0,-.55),left=sample(-.20,0),right=sample(.20,0);
  boat.position.set(x,base+(front+back+left+right)*.25*scale,z);
  boat.rotation.set(-Math.atan2(front-back,1.1*footprint),heading,Math.atan2(right-left,.4*footprint),'YXZ');
  return{front,back,left,right};
}
