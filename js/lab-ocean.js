import {configureLabQuality} from './experience/lab-quality.js';
/* Sailing shares the miniature's boat and height field; W/S, A/D and orbit remain. */
import * as THREE from 'three';
import {createSailboat} from './world/sailboat.js';
import {createOceanWater} from './world/ocean-water.js';
import {createOceanSky} from './world/ocean-sky.js';
import {floatBoat} from './world/ocean-waves.js';
import {createCharacter} from './world/character.js';

const canvas=document.getElementById('scene');let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch{
  const message=document.createElement('p');message.className='ocean-unavailable';message.textContent='当前设备无法显示 3D 海面。可以返回实验室，继续探索其他内容。';canvas.replaceWith(message);
}
if(renderer){
const redrawQuality=configureLabQuality(renderer,{mobile:1.25,desktop:1.6,shadows:false});
document.body.classList.add('ocean-playing');
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;
const scene=new THREE.Scene();scene.fog=new THREE.Fog(new THREE.Color().setRGB(.61,.68,.62),85,240);
scene.add(new THREE.HemisphereLight(0xc4d5d1,0x24433d,1.1));
const sunlight=new THREE.DirectionalLight(0xffe2b0,2.5);sunlight.position.set(-55,28,80);scene.add(sunlight);
const camera=new THREE.PerspectiveCamera(53,innerWidth/innerHeight,.1,1000),sky=createOceanSky();scene.add(sky);
const generator=new THREE.PMREMGenerator(renderer),environmentScene=new THREE.Scene();
environmentScene.add(sky.clone());const environment=generator.fromScene(environmentScene,.03,.1,1000);scene.environment=environment.texture;scene.environmentIntensity=.8;generator.dispose();
const sea=createOceanWater(600,600,{segments:innerWidth<700?144:220,scale:12,concentrate:true});scene.add(sea.water);
const vessel=createSailboat(),boat=vessel.root;boat.scale.setScalar(4);scene.add(boat);
const crew=createCharacter();crew.root.position.set(.145,.33,-.60);crew.root.scale.setScalar(.58);boat.add(crew.root);
const neutral={beat:0,pulse:0,energy:.5},pointer=new THREE.Vector2(),grounded={grounded:true};

const gulls=[],gullMaterial=new THREE.MeshStandardMaterial({color:0xdad8c3,side:THREE.DoubleSide,roughness:.8});
for(let i=0;i<5;i++){
  const gull=new THREE.Group();
  for(const sign of [-1,1]){const wing=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.16),gullMaterial);wing.position.x=sign*.47;wing.rotation.x=-Math.PI/2;gull.add(wing);}
  scene.add(gull);gulls.push(gull);
}
let speed=0,heading=-.42,camYaw=.35,camPitch=.29,drag=null,time=0,last=performance.now(),wind=.8,targetWind=.8,visible=true,renderedFrames=0;
const keyboard=new Set(),touches=new Map(),codes={ArrowUp:'KeyW',ArrowDown:'KeyS',ArrowLeft:'KeyA',ArrowRight:'KeyD'};
const controls=document.createElement('div');controls.className='ocean-helm';controls.setAttribute('role','group');controls.setAttribute('aria-label','驾驶帆船');
for(const [code,label,glyph] of [['KeyA','向左转舵','←'],['KeyW','加速','↑'],['KeyS','减速','↓'],['KeyD','向右转舵','→']]){
  const button=document.createElement('button');button.type='button';button.dataset.helm=code;button.textContent=glyph;button.setAttribute('aria-label',label);
  button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);touches.set(event.pointerId,code);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,event=>touches.delete(event.pointerId));
  button.addEventListener('keydown',event=>{if(event.code==='Space'||event.code==='Enter'){event.preventDefault();keyboard.add(code);}});
  button.addEventListener('keyup',()=>keyboard.delete(code));button.addEventListener('blur',()=>keyboard.delete(code));controls.append(button);
}
document.body.append(controls);document.querySelector('.demo-hud p').textContent='W/S 控速 · A/D 转舵 · 拖拽环视 · 也可按住方向按钮';
addEventListener('keydown',event=>{const code=codes[event.code]||event.code;if(['KeyW','KeyA','KeyS','KeyD'].includes(code)){event.preventDefault();keyboard.add(code);}});
addEventListener('keyup',event=>keyboard.delete(codes[event.code]||event.code));
const clearInput=()=>{keyboard.clear();touches.clear();drag=null;};addEventListener('blur',clearInput);document.addEventListener('visibilitychange',clearInput);
canvas.style.touchAction='none';
canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);drag={id:event.pointerId,x:event.clientX,y:event.clientY};});
canvas.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;camYaw-=(event.clientX-drag.x)*.006;camPitch=THREE.MathUtils.clamp(camPitch+(event.clientY-drag.y)*.005,.07,1.1);drag.x=event.clientX;drag.y=event.clientY;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(drag?.id===event.pointerId)drag=null;});
const rendering=()=>{last=performance.now();renderer.setAnimationLoop(visible&&!document.hidden?frame:null);};
document.addEventListener('visibilitychange',rendering);
addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==parent)return;
  if(event.data?.type==='ocean-weather'&&Number.isFinite(event.data.strength))targetWind=THREE.MathUtils.clamp(event.data.strength,0,1.6);
  if(event.data?.type==='ocean-visibility'&&typeof event.data.active==='boolean'){visible=event.data.active;rendering();}
});
if(parent!==window)parent.postMessage({type:'ocean-ready'},location.origin);
const stat=document.getElementById('stat'),desired=new THREE.Vector3(),look=new THREE.Vector3();
let samples;
function frame(now){
  const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;time+=dt;wind=THREE.MathUtils.lerp(wind,targetWind,1-Math.exp(-dt*3));
  const held=code=>keyboard.has(code)||[...touches.values()].includes(code);
  if(held('KeyW'))speed=Math.min(8,speed+3*dt);if(held('KeyS'))speed=Math.max(0,speed-4*dt);
  if(held('KeyA'))heading+=(.5+speed*.08)*dt;if(held('KeyD'))heading-=(.5+speed*.08)*dt;
  const x=boat.position.x+Math.sin(heading)*speed*dt,z=boat.position.z+Math.cos(heading)*speed*dt;
  samples=floatBoat(boat,x,z,heading,time,wind,12,0,1/3);vessel.update(time,wind);
  sea.water.position.set(x,0,z);sea.update(time,wind,x,z);crew.update(time,neutral,pointer,false,dt,grounded,time);
  gulls.forEach((gull,i)=>{const a=time*(.10+i*.008)+i*1.7,r=22+i*5;gull.position.set(x+Math.cos(a)*r,10+i*1.7+Math.sin(a*2),z+Math.sin(a)*r);gull.rotation.y=-a;gull.children.forEach((wing,j)=>wing.rotation.z=(j?1:-1)*(.16+Math.sin(time*4+i)*.35));});
  const distance=17;desired.set(x-Math.sin(heading+camYaw)*distance*Math.cos(camPitch),boat.position.y+2.4+Math.sin(camPitch)*distance,z-Math.cos(heading+camYaw)*distance*Math.cos(camPitch));
  if(time===dt)camera.position.copy(desired);else camera.position.lerp(desired,1-Math.exp(-dt*5));look.set(x,boat.position.y+2.8,z);camera.lookAt(look);sky.position.copy(camera.position);
  stat.textContent=`航速 ${(speed*1.94).toFixed(1)} 节 · 航向 ${(((-heading*180/Math.PI)%360+360)%360).toFixed(0)}°`;
  renderer.render(scene,camera);renderedFrames++;
}
renderer.setAnimationLoop(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
redrawQuality(()=>renderer.render(scene,camera));
window.oceanExperiment={renderer,diagnostics:()=>({speed,heading,wind,targetWind,time,visible,renderedFrames,position:boat.position.toArray(),samples,held:[...keyboard,...touches.values()],calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),boat,water:sea.water};
}
