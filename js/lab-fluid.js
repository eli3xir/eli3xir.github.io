import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createFluid} from './world/fluid.js';
import {createCharacter} from './world/character.js';
import {fluidControls} from './experience/fluid-controls.js';
let canvas=document.getElementById('scene'),renderer=null;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true});}catch{const replacement=canvas.cloneNode();canvas.replaceWith(replacement);canvas=replacement;}
document.body.classList.add('fluid-playing');canvas.classList.add('fluid-canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','混色玻璃：按住拖动，方向键移动滴色点，空格滴色');canvas.style.touchAction='none';
const model=createFluid(renderer),events=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)');let active=parent===window,epoch=0,frames=0,drag=null,point=[.58,.74],scene,camera,actor,ctx,image,small,smallContext;
model.setActive(active);
const notify=()=>{if(parent!==window){const d=model.diagnostics();parent.postMessage({type:'fluid-settings',epoch,color:d.color,paused:d.paused},location.origin);}};
const controls=fluidControls({signal:events.signal,onColor:value=>model.select(value),onDrop:()=>model.addDrop({uv:point,reduced:reduced.matches}),onClear:()=>{model.clear();controls.announce('清水已备好，再给一点颜色。');},onPause:value=>model.setPaused(value)});document.body.append(controls.element);
model.onState=state=>{controls.set(state);notify();};model.onDrop=()=>{controls.announce('这一滴已融入，拖动看看它的去向。');if(parent!==window)parent.postMessage({type:'lab-reveal'},location.origin);};controls.set(model.diagnostics());
if(renderer){
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.96;renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.3:1.6));scene=new THREE.Scene();scene.background=new THREE.Color(0x13251e);
 const environmentScene=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer),environment=generator.fromScene(environmentScene,.04);scene.environment=environment.texture;scene.environmentIntensity=.4;environmentScene.dispose();generator.dispose();scene.add(new THREE.HemisphereLight(0xd9e6ce,0x302714,.7));const key=new THREE.DirectionalLight(0xffe7c3,1.7);key.position.set(-3,4,5);scene.add(key);camera=new THREE.PerspectiveCamera(38,1,.05,30);scene.add(model.root);
 actor=createCharacter();actor.root.scale.setScalar(.55);model.actorAnchor.add(actor.root);
}else{
 ctx=canvas.getContext('2d');small=document.createElement('canvas');small.width=128;small.height=80;smallContext=small.getContext('2d');image=smallContext.createImageData(128,80);document.querySelector('.demo-hud p').textContent='平面画布 · 按住拖动；方向键和空格也能滴色。';
}
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),neutral={beat:0,pulse:0,energy:.5};let targetVisible=false;
canvas.addEventListener('focus',()=>{targetVisible=true;});canvas.addEventListener('blur',()=>{targetVisible=false;});
function locate(event){const box=canvas.getBoundingClientRect();if(renderer){mouse.set((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2);ray.setFromCamera(mouse,camera);return model.hitUV(ray)?.toArray()||null;}return[(event.clientX-box.left)/box.width,1-(event.clientY-box.top)/box.height];}
canvas.addEventListener('pointerdown',event=>{const uv=locate(event);if(!uv||drag)return;canvas.setPointerCapture(event.pointerId);canvas.focus({preventScroll:true});model.select((model.diagnostics().color+1)%5);point=uv;drag={id:event.pointerId,uv};model.inject(uv,[0,-.14],.8,.04);});
canvas.addEventListener('pointermove',event=>{if(drag?.id!==event.pointerId)return;const uv=locate(event);if(!uv)return;point=uv;const delta=[THREE.MathUtils.clamp((uv[0]-drag.uv[0])*14,-1.2,1.2),THREE.MathUtils.clamp((uv[1]-drag.uv[1])*9,-1.2,1.2)];const distance=Math.hypot(uv[0]-drag.uv[0],uv[1]-drag.uv[1]),samples=Math.min(20,Math.max(1,Math.ceil(distance/.014)));
 for(let i=1;i<=samples;i++)model.inject([THREE.MathUtils.lerp(drag.uv[0],uv[0],i/samples),THREE.MathUtils.lerp(drag.uv[1],uv[1],i/samples)],delta,.18/samples,.031);drag.uv=uv;
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,event=>{if(drag?.id===event.pointerId)drag=null;});addEventListener('blur',()=>{drag=null;});
canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(event.key))return;event.preventDefault();if(event.key===' '||event.key==='Enter'){model.addDrop({uv:point,reduced:reduced.matches});return;}point=[THREE.MathUtils.clamp(point[0]+(event.key==='ArrowLeft'?-.06:event.key==='ArrowRight'?.06:0),.05,.95),THREE.MathUtils.clamp(point[1]+(event.key==='ArrowUp'?.06:event.key==='ArrowDown'?-.06:0),.05,.95)];controls.announce(`滴色点：横向 ${Math.round(point[0]*100)}%，纵向 ${Math.round(point[1]*100)}%。`);});
function resize(){const width=innerWidth,height=Math.max(190,innerHeight-200);canvas.style.width=width+'px';canvas.style.height=height+'px';if(renderer){renderer.setSize(width,height,false);camera.aspect=width/height;camera.position.set(0,.12,Math.max(5.35,5.5/camera.aspect));camera.lookAt(0,.04,0);camera.updateProjectionMatrix();}else{canvas.width=width;canvas.height=height;}draw(performance.now());}
function draw(now){model.update(0,neutral,0,now/1000,false);if(renderer){model.cell.target.visible=targetVisible;model.cell.target.position.set((point[0]-.5)*2.72,(point[1]-.5)*1.70+.03,.14);actor.update(0,neutral,mouse,false,0,{grounded:true},reduced.matches?0:now/1000);renderer.render(scene,camera);}else{const data=model.simulation.data;for(let i=0;i<data.length;i+=4){for(let c=0;c<3;c++){const base=[.74,.66,.51][c];image.data[i+c]=Math.min(255,(base*Math.exp(-data[i+c]*.8))**(1/2.2)*255);}image.data[i+3]=255;}smallContext.putImageData(image,0,0);ctx.save();ctx.translate(0,canvas.height);ctx.scale(1,-1);ctx.drawImage(small,0,0,canvas.width,canvas.height);ctx.restore();if(targetVisible){ctx.beginPath();ctx.arc(point[0]*canvas.width,(1-point[1])*canvas.height,8,0,Math.PI*2);ctx.strokeStyle='#eee1b9';ctx.stroke();}}frames++;}
let handle=0;function cpuFrame(now){if(!active||document.hidden)return;draw(now);handle=requestAnimationFrame(cpuFrame);}
function rendering(){model.setActive(active&&!document.hidden);if(renderer)renderer.setAnimationLoop(active&&!document.hidden?draw:null);else{cancelAnimationFrame(handle);if(active&&!document.hidden)handle=requestAnimationFrame(cpuFrame);}}
document.addEventListener('visibilitychange',()=>{drag=null;rendering();});addEventListener('resize',resize);
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;const data=event.data;if(data?.type!=='fluid-owner'||!Number.isSafeInteger(data.epoch)||typeof data.active!=='boolean')return;epoch=data.epoch;active=data.active;drag=null;
 if(active){if(data.snapshot)model.restore(data.snapshot);else{if(Number.isInteger(data.color))model.select(data.color);model.setPaused(data.paused);}}
 rendering();if(!active){const snapshot=model.snapshot(),f=snapshot.field;parent.postMessage({type:'fluid-state',epoch,snapshot},location.origin,[f.velocity.buffer,f.pressure.buffer,f.dye.buffer]);}else draw(performance.now());
});
resize();rendering();if(parent!==window)parent.postMessage({type:'fluid-ready'},location.origin);
window.fluidExperiment={model,renderer,actor,camera,diagnostics:()=>({...model.diagnostics(),frames,drag,epoch,point:[...point],resources:renderer?{...renderer.info.memory}:null})};
