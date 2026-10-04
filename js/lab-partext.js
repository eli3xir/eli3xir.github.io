import {configureLabQuality} from './experience/lab-quality.js';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createWordMachine} from './world/word-machine.js';
import {wordControls} from './experience/word-controls.js';
import {cleanWords} from './world/glyph-cloud.js';
import {createCharacter} from './world/character.js';

document.body.classList.add('word-playing');const events=new AbortController(),signal=events.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)');
let renderer=null,model=null,selected='eli3xir',active=true,visible=true,last=performance.now(),frames=0,pointer=null,down=null;
const notify=()=>{if(parent!==window)parent.postMessage({type:'word-changed',text:selected},location.origin);};
const setText=(text,echo=true)=>{selected=text;model?.setText(text,{reduced:reduced.matches});document.getElementById('stat').textContent=model?`30,000 粒子 ·「${text}」`:`「${text}」· 当前设备显示文字预览`;if(echo)notify();};
const controls=wordControls({signal,onText:setText,onScatter:()=>model?.scatter({reduced:reduced.matches})});document.body.append(controls.element);
try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}catch{const fallback=document.createElement('p');fallback.className='word-unavailable';fallback.textContent='当前设备无法显示 3D 粒子，仍可输入和切换文字。';document.body.append(fallback);controls.element.querySelector('[data-word-scatter]').hidden=true;}
const updateLoop=()=>{active=visible&&!document.hidden;pointer=null;down=null;last=performance.now();renderer?.setAnimationLoop(active?render:null);};
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent)return;
 if(event.data?.type==='word-text'&&typeof event.data.text==='string'){const text=cleanWords(event.data.text);if(text&&text!==selected){setText(text,false);controls.setText(text);}}
 if(event.data?.type==='word-visibility'){visible=event.data.active===true;updateLoop();}
},{signal});document.addEventListener('visibilitychange',updateLoop,{signal});
let scene,camera,crew;const idlePointer=new THREE.Vector2();
function render(now){const dt=Math.max(0,Math.min((now-last)/1000,.05));last=now;model.pointer=pointer;model.update(0,{},0,now/1000,reduced.matches);crew.update(reduced.matches?0:now/1000,{pulse:0,energy:.3},idlePointer,false,dt,{grounded:true},reduced.matches?0:now/1000);renderer.render(scene,camera);frames++;}
if(renderer){
const redrawQuality=configureLabQuality(renderer,{mobile:1.25,desktop:1.6,shadows:false});
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.prepend(renderer.domElement);renderer.domElement.className='word-canvas';renderer.domElement.style.touchAction='none';
 scene=new THREE.Scene();scene.background=new THREE.Color(0x101e1c);const pmrem=new THREE.PMREMGenerator(renderer),environment=new RoomEnvironment();scene.environment=pmrem.fromScene(environment,.04).texture;scene.environmentIntensity=.6;environment.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xe4d8b4,0x12392f,1.7));const key=new THREE.DirectionalLight(0xffd8a4,3);key.position.set(-3,4,4);scene.add(key);const fill=new THREE.DirectionalLight(0x91c8c3,2);fill.position.set(3,1,-1);scene.add(fill);
 model=createWordMachine({count:30000});scene.add(model.root);crew=createCharacter();crew.root.scale.setScalar(model.actorScale);crew.root.position.copy(model.actorAnchor.position);model.root.add(crew.root);
 camera=new THREE.PerspectiveCamera(34,1,.1,40);const resize=()=>{const height=Math.max(170,innerHeight-230);renderer.setSize(innerWidth,height);camera.aspect=innerWidth/height;camera.position.set(.06,.35,Math.max(4.3,3.7/(2*Math.tan(17*Math.PI/180)*camera.aspect)));camera.lookAt(0,-.1,0);camera.updateProjectionMatrix();};resize();addEventListener('resize',resize,{signal});
 redrawQuality(()=>renderer.render(scene,camera));
 const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0),hit=new THREE.Vector3(),ndc=new THREE.Vector2();
 const move=event=>{if(event.pointerType==='touch'&&!down)return;const box=renderer.domElement.getBoundingClientRect();ndc.set((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2);ray.setFromCamera(ndc,camera);if(ray.ray.intersectPlane(plane,hit)&&Math.abs(hit.x)<1.48&&Math.abs(hit.y-.1)<.58)pointer={x:hit.x,y:hit.y-.1};else pointer=null;};
 const canvas=renderer.domElement;canvas.addEventListener('pointermove',move,{signal});canvas.addEventListener('pointerdown',event=>{down={id:event.pointerId,x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);move(event);},{signal});
 canvas.addEventListener('pointerup',event=>{const tap=down?.id===event.pointerId&&Math.hypot(event.clientX-down.x,event.clientY-down.y)<8;down=null;pointer=null;if(tap)controls.element.querySelector('[data-word-next]').click();},{signal});
 for(const type of ['pointerleave','pointercancel','lostpointercapture'])canvas.addEventListener(type,()=>{pointer=null;down=null;},{signal});addEventListener('blur',()=>{pointer=null;down=null;},{signal});
 document.fonts.load('700 180px "Cabinet Sans"').then(()=>model.setText(selected,{reduced:reduced.matches}));updateLoop();
}
setText(selected,false);if(parent!==window)parent.postMessage({type:'word-ready'},location.origin);
window.wordExperiment={renderer,model,camera,actor:crew,diagnostics:()=>({text:selected,frames,active,visible,pointer,cloud:model?.cloud.diagnostics(),resources:renderer?{...renderer.info.memory}:null})};
