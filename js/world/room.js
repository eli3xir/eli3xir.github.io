import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SKINS, readSetting } from '../experience/domain.js';
import { batchStatic } from './batch.js';
import { createRoomEffects } from './room-effects.js';
import { createRoomLighting, tuneRoomMaterial } from './room-lighting.js';

const ZONES = {
  lab: [4.7,7.1,.25,1.6,-1.2,.15], blog: [3,4.7,.25,1.4,-1.2,.15],
  radio: [1.9,3,.25,2.2,-1.2,.15], about: [.3,.9,1.35,1.89,-.4,.15], projects:[.7,2.05,1.9,2.55,-.4,.15], skin: [.55,1.85,.55,1.35,-.4,.15],
};
export const ROOM_VIEWS = {
  lab: { camera:[1.85,.3,-2.8], target:[1.85,-.15,-.5] },
  blog: { camera:[-.15,.3,-2.8], target:[-.15,-.2,-.5] },
  radio: { camera:[-1.55,.4,-2.4], target:[-1.55,.05,-.45] },
  about: { camera:[-2.85,.8,-2.4], target:[-2.85,.8,-.05] },
  projects:{camera:[-2.75,.95,-2.65],target:[-2.75,.92,-.05]},
  skin: { camera:[-2.8,.15,-2.2], target:[-2.8,-.05,-.06] },
};
let cached = null;
function deadline(promise,ms){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('材质加载超时')),ms);})]).finally(()=>clearTimeout(timer));}

export function createRoom(status) {
  if (cached) { if(cached.loaded)status(1, '房间已就绪');else if(cached.failed)cached.retry();return cached; }
  const root = new THREE.Group();
  const room = new THREE.Group(); room.position.set(-4,-1.1,0);root.add(room);
  const effects=createRoomEffects(room);let vinyl=null;let focused=null;
  createRoomLighting(room);
  const model = { root, room, persistent:true, loaded:false, actorPosition:[.2,.1,-1.3],
    focus(id){focused=id;effects.setFocus(id);},update(t,beat){effects.update(t,beat);if(vinyl&&focused==='radio')vinyl.rotation.y=-t*2.4;} };
  cached = model;
  model.applySkin = id => {
    const skin = SKINS[id] || SKINS.default;
    room.traverse(object => {
      if (!object.isMesh) return;
      for (const mat of [object.material].flat()) {
        if (!mat.color) continue;
        const original = mat.userData.originalColor;
        if (original) mat.color.copy(original);
        if (id !== 'default' && /wall_plaster|ceiling|trim|rug|cork/.test(mat.name)) mat.color.setRGB(...skin.wall);
      }
    });
  };
  model.pick = ray => {
    if (!model.loaded) return null;
    for (const hit of ray.intersectObject(room, true)) {
      const p = room.worldToLocal(hit.point.clone());
      for (const id of ['about','projects','skin','radio','blog','lab']) {
        const [x0,x1,y0,y1,z0,z1] = ZONES[id];
        if (p.x>=x0&&p.x<=x1&&p.y>=y0&&p.y<=y1&&p.z>=z0&&p.z<=z1) return id;
      }
    }
    return null;
  };
  const loadRoom = async()=>{
    model.failed=false;
    status(.05,'正在点亮工作室');
    const loader = new GLTFLoader();
    const response=await fetch('/assets/room/room.glb',{signal:AbortSignal.timeout(18000)});
    if(!response.ok)throw new Error(`房间模型 HTTP ${response.status}`);
    const gltf=await loader.parseAsync(await response.arrayBuffer(),'/assets/room/');
    status(.65,'正在点亮材质');
    room.add(gltf.scene);
    const manifest = await fetch('/assets/room/lightmaps/manifest.json',{signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():{}).catch(()=>({}));
    const lightmaps = new Map();
    const textures = new THREE.TextureLoader();
    const entries = Object.fromEntries(Object.entries(manifest).map(([k,v])=>[k.replaceAll('.',''),v]));
    const pending = [];
    const materials=new Map();
    gltf.scene.traverse(object=>{
      if(object.isLight){object.visible=false;return;}
      if(!object.isMesh)return;
      const entry=entries[object.name]||entries[object.name.replace(/_\d+$/,'')];
      const key=object.material.uuid+'/'+(entry?.file||'none');
      if(!materials.has(key)){
        const clone=object.material.clone();clone.userData.originalColor=clone.color?.clone();tuneRoomMaterial(clone);materials.set(key,clone);
      }
      object.material=materials.get(key);
      if(entry){
        if(!lightmaps.has(entry.file)) lightmaps.set(entry.file,deadline(textures.loadAsync('/assets/room/lightmaps/'+entry.file),12000).then(texture=>{
          texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.channel=1;return texture;
        }));
        pending.push(lightmaps.get(entry.file).then(texture=>{
          object.material.lightMap=texture;
          object.material.lightMapIntensity=1.05*(Number.isFinite(entry.scale)&&entry.scale>0?entry.scale:1);
          object.material.needsUpdate=true;
        }));
      }
      if(/glass|lamp.*tube|light.*glass/i.test(object.material.name)) {
        object.material.emissive?.set(0xffd095);object.material.emissiveIntensity=.55;
      }
    });
    const results=await Promise.allSettled(pending);
    // Keep the turntable independent; merge the hundreds of tiny static lamp details.
    gltf.scene.updateWorldMatrix(true,true);const center=new THREE.Vector3(2.39,1.155,-.45);
    const parts=[];const box=new THREE.Box3();const point=new THREE.Vector3();
    gltf.scene.traverse(object=>{if(object.isMesh){box.setFromObject(object).getCenter(point);gltf.scene.worldToLocal(point);if(point.distanceTo(center)<.09)parts.push(object);}});
    vinyl=new THREE.Group();vinyl.position.copy(center);gltf.scene.add(vinyl);gltf.scene.updateWorldMatrix(true,true);
    parts.forEach(object=>vinyl.attach(object));
    model.batching=batchStatic(gltf.scene,new Set(parts));
    model.loaded=true;
    model.applySkin(readSetting('room-skin','default'));
    status(1,results.some(result=>result.status==='rejected')?'灯亮了，部分材质暂时未能加载':'灯亮了，欢迎进来');
    return model;
  };
  model.retry=()=>{
    model.ready=loadRoom();
    model.ready.catch(error=>{model.failed=true;status(-1,'房间暂时没能加载，文字入口仍可使用；返回房间时会重试',error);});
    return model.ready;
  };
  model.retry();
  return model;
}
