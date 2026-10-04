import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createLander} from './world/lunar-lander.js';
import {createLunarTerrain} from './world/lunar-terrain.js';
import {createLunarEffects} from './world/lunar-effects.js';
import {createFlight} from './world/lunar-flight.js';
import {createCharacter} from './world/character.js';
import {randomSequence} from './audio/synth.js';

const canvas=document.getElementById('scene'),stat=document.getElementById('stat'),button=document.getElementById('land-btn');let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch{
 const message=document.createElement('p');message.className='ocean-unavailable';message.textContent='当前设备无法显示 3D 月面。可以返回实验室继续探索。';canvas.replaceWith(message);button.disabled=true;stat.textContent='3D 暂不可用';
}
if(renderer){
 document.body.classList.add('moon-playing');canvas.tabIndex=0;canvas.setAttribute('aria-label','月面视角：拖拽或用方向键环视，Home 恢复视角');canvas.style.touchAction='none';
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.4:1.75));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x05070b);scene.add(new THREE.HemisphereLight(0xa6b6c5,0x5e5545,.48));
 const sun=new THREE.DirectionalLight(0xfff0d7,3.2);sun.position.set(-20,19,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=sun.shadow.camera.bottom=-13;sun.shadow.camera.right=sun.shadow.camera.top=13;sun.shadow.camera.near=.5;sun.shadow.camera.far=80;sun.shadow.normalBias=.022;sun.shadow.bias=-.00006;scene.add(sun);
 const environmentScene=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(environmentScene,.08);scene.environment=environment.texture;scene.environmentIntensity=.28;environmentScene.dispose();generator.dispose();
 const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,400),terrain=createLunarTerrain(),lander=createLander(),flight=createFlight();scene.add(terrain.root,lander.root);
 const effects=createLunarEffects(scene,lander.root),crew=createCharacter();crew.root.scale.setScalar(1.25);lander.anchor.add(crew.root);
 const random=randomSequence(349),stars=new Float32Array(500*3);
 for(let i=0;i<500;i++){const angle=(random()+1)*Math.PI,y=.16+(random()+1)*.4;stars.set([Math.cos(angle)*180,30+y*150,Math.sin(angle)*180],i*3);}
 const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.BufferAttribute(stars,3));scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xadb2bd,size:.7,sizeAttenuation:false,transparent:true,opacity:.35})));
 const earthMaterial=new THREE.MeshStandardMaterial({color:0x346e9e,roughness:1});
 earthMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 globe;').replace('#include <begin_vertex>','#include <begin_vertex>\nglobe=normalize(position);');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 globe;').replace('#include <color_fragment>',`#include <color_fragment>
  float cloud=sin(globe.x*17.+sin(globe.z*12.))*sin(globe.y*23.+globe.z*7.);diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.82,.8),smoothstep(.05,.54,cloud)*.92);`);};earthMaterial.customProgramCacheKey=()=> 'lunar-earth-v1';
 const earth=new THREE.Mesh(new THREE.SphereGeometry(1.7,40,24),earthMaterial);earth.position.set(-29,22,-68);scene.add(earth);
 let yaw=.42,pitch=.36,zoom=1,drag=null,active=parent===window,epoch=0,last=performance.now(),frames=0,lastMode='',lastStat=-1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),pointer=new THREE.Vector2(),neutral={beat:0,pulse:0,energy:.5};
 const notify=()=>{if(parent!==window)parent.postMessage({type:'moon-state',epoch,snapshot:flight.snapshot()},location.origin);};
 function hud(state){
  if(state.mode!==lastMode){button.disabled=state.mode==='descending';button.textContent=state.mode==='landed'?'再来一次':state.mode==='descending'?'着陆中…':'开始着陆';
   if(state.mode==='landed'&&stat.textContent!=='着陆成功 · 月面安静，好奇心还亮着。')stat.textContent='着陆成功 · 月面安静，好奇心还亮着。';lastMode=state.mode;notify();}
  if(state.mode!=='landed'&&state.elapsed-lastStat>.12){stat.textContent=`高度 ${state.altitude.toFixed(1)} m · 下降 ${Math.abs(state.velocity).toFixed(2)} m/s`;lastStat=state.elapsed;}
 }
 function draw(now){
  const dt=Math.max(0,(now-last)/1000);last=now;if(active)flight.step(dt);const state=flight.sample();lander.root.position.y=state.altitude;effects.update(state,canvas.height,reduced.matches);hud(state);
  const distance=(innerWidth/innerHeight<1?25:20)*zoom,lookY=2.4+state.altitude*.75;
  camera.position.set(Math.sin(yaw)*Math.cos(pitch)*distance,lookY+Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance);camera.lookAt(0,lookY,0);
  crew.update(reduced.matches?0:state.elapsed,neutral,pointer,false,reduced.matches?0:dt,{grounded:true},reduced.matches?0:now/1000);renderer.render(scene,camera);frames++;
 }
 const rendering=()=>{last=performance.now();renderer.setAnimationLoop(active&&!document.hidden?draw:null);};
 button.addEventListener('click',()=>{if(flight.sample().mode==='landed'){flight.reset();lastStat=-1;}else flight.start();hud(flight.sample());draw(performance.now());});
 canvas.addEventListener('pointerdown',event=>{if(drag)return;canvas.setPointerCapture(event.pointerId);drag={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.focus({preventScroll:true});});
 canvas.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;yaw-=(event.clientX-drag.x)*.006;pitch=THREE.MathUtils.clamp(pitch+(event.clientY-drag.y)*.004,.13,1.05);drag.x=event.clientX;drag.y=event.clientY;});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>{if(drag?.id===event.pointerId)drag=null;});
 canvas.addEventListener('wheel',event=>{event.preventDefault();zoom=THREE.MathUtils.clamp(zoom+event.deltaY*.0005,.8,1.7);},{passive:false});
 canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;event.preventDefault();if(event.key==='Home'){yaw=.42;pitch=.36;zoom=1;}else{yaw+=event.key==='ArrowLeft'?-.12:event.key==='ArrowRight'?.12:0;pitch=THREE.MathUtils.clamp(pitch+(event.key==='ArrowUp'?.08:event.key==='ArrowDown'?-.08:0),.13,1.05);}});
 addEventListener('blur',()=>{drag=null;});document.addEventListener('visibilitychange',()=>{drag=null;rendering();});
 addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;const data=event.data;if(data?.type!=='moon-owner'||typeof data.active!=='boolean'||!Number.isSafeInteger(data.epoch))return;epoch=data.epoch;active=data.active;drag=null;
  if(active&&data.snapshot){flight.restore(data.snapshot);lastMode='';lastStat=-1;}rendering();if(!active)notify();else draw(performance.now());
 });
 addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(!active)draw(performance.now());});
 draw(performance.now());rendering();if(parent!==window)parent.postMessage({type:'moon-ready'},location.origin);
 window.moonExperiment={flight,lander,terrain,effects,renderer,scene,camera,crew,diagnostics:()=>({...flight.sample(),...effects.diagnostics(),active,epoch,frames,drag,yaw,pitch,zoom,resources:{...renderer.info.memory},calls:renderer.info.render.calls})};
}
