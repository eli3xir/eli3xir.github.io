import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { readSetting } from '../experience/domain.js';
import {roomSkinColor} from './room-palette.js';
import { batchStatic } from './batch.js';
import { createRoomEffects } from './room-effects.js';
import { createRoomLighting, tuneRoomMaterial } from './room-lighting.js';
import { downloadRoom } from './room-download.js';
import { createRoomLightmaps } from './room-lightmaps.js';
import {loadRoomReflections,bindRoomReflection} from './room-reflections.js';
import {roomFocusBounds} from './room-framing.js';
import {loadRoomProfile,installRoomArtwork,roomPaletteX} from './room-artwork.js';
import {installRoomNotes} from './room-notes.js';
import {ROOM_VIEWS} from './room-views.js';
export {ROOM_VIEWS} from './room-views.js';

const ZONES = {
  lab: [4.7,7.1,.25,1.6,-1.2,.15], blog: [3,4.7,.25,1.4,-1.2,.15],
  radio: [1.9,3,.25,2.2,-1.2,.15], about: [.3,.9,1.35,1.89,-.4,.15], projects:[.7,2.05,1.9,2.55,-.4,.15], skin: [.55,1.85,.55,1.35,-.4,.15],
};
let cached = null;

export function createRoom(status,renderer) {
  if (cached) {
    cached.onStatus=status;
    if(cached.loaded)status(1,'房间已就绪');
    else if(cached.failed)cached.retry();
    else status(cached.progress??.05,cached.message||'正在搬入工作室');
    return cached;
  }
  const root = new THREE.Group();
  const room = new THREE.Group(); room.position.set(-4,-1.1,0);root.add(room);
  const effects=createRoomEffects(room);let vinyl=null;let focused=null;
  createRoomLighting(room);
  const model = { root, room, persistent:true, loaded:false, onStatus:status, actorPosition:[.2,.1,-1.3],
    focus(id){focused=id;effects.setFocus(id);},update(t,beat){effects.update(t,beat);if(vinyl&&focused==='radio')vinyl.rotation.y=-t*2.4;} };
  cached = model;
  const report=(progress,message,error)=>{model.progress=progress;model.message=message;model.onStatus(progress,message,error);};
  model.applySkin = id => {
    model.reflections?.set(id);
    if(model.artwork?.cursor)model.artwork.cursor.position.x=roomPaletteX(id);
    room.traverse(object => {
      if (!object.isMesh) return;
      for (const mat of [object.material].flat()) {
        if (!mat.color) continue;
        roomSkinColor(mat,id,mat.color);
      }
    });
  };
  model.pick = ray => {
    if (!model.loaded) return null;
    for (const hit of ray.intersectObject(room, true)) {
      if(hit.object.userData.roomProject)return hit.object.userData.roomProject;
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
    report(.05,'正在点亮工作室');
    const reflections=renderer?loadRoomReflections(renderer).catch(error=>{model.reflectionError=error.message;return null;}):Promise.resolve(null);
    const profile=loadRoomProfile();
    const loader = new GLTFLoader();
    const bytes=await downloadRoom(progress=>report(.05+progress*.55,progress?`正在搬入工作室 · ${Math.round(progress*100)}%`:'正在搬入工作室'));
    const gltf=await loader.parseAsync(bytes,'/assets/room/');
    report(.65,'正在点亮材质');
    // Keep partially lit surfaces out of the live scene while maps arrive.
    gltf.scene.visible=false;
    room.add(gltf.scene);
    const [manifest,textures]=await Promise.all([
      fetch('/assets/room/lightmaps/manifest.json',{signal:AbortSignal.timeout(15000)}).then(r=>r.ok?r.json():{}).catch(()=>({})),
      createRoomLightmaps(progress=>report(.65+progress*.2,'正在铺开房间的光')),
    ]);
    model.lightmapSource=textures.stats;
    const lightmaps = new Map();
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
        if(!lightmaps.has(entry.file))lightmaps.set(entry.file,textures.load(entry.file));
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
    model.artwork=installRoomArtwork(gltf.scene,await profile,renderer);
    model.notes=installRoomNotes(gltf.scene,renderer);Object.assign(ROOM_VIEWS,model.notes.views);
    model.reflections=await reflections;
    if(model.reflections)materials.forEach(material=>bindRoomReflection(material,model.reflections.texture));
    if(model.reflections&&model.artwork.cursor)bindRoomReflection(model.artwork.cursor.material,model.reflections.texture);
    // Keep the turntable independent; merge the hundreds of tiny static lamp details.
    gltf.scene.updateWorldMatrix(true,true);const center=new THREE.Vector3(2.39,1.155,-.45);
    const parts=[];const box=new THREE.Box3();const point=new THREE.Vector3();
    gltf.scene.traverse(object=>{if(object.isMesh){box.setFromObject(object).getCenter(point);gltf.scene.worldToLocal(point);if(point.distanceTo(center)<.09)parts.push(object);}});
    vinyl=new THREE.Group();vinyl.position.copy(center);gltf.scene.add(vinyl);gltf.scene.updateWorldMatrix(true,true);
    parts.forEach(object=>vinyl.attach(object));
    model.focusBounds=roomFocusBounds(gltf.scene);
    model.ceilingY=new THREE.Box3().setFromObject(gltf.scene.getObjectByName('ceiling')).min.y;
    model.batching=batchStatic(gltf.scene,new Set(parts));
    model.asset=gltf.scene;
    model.loaded=true;
    model.applySkin(readSetting('room-skin','default'));
    gltf.scene.visible=true;
    report(1,results.some(result=>result.status==='rejected')?'灯亮了，部分材质暂时未能加载':'灯亮了，欢迎进来');
    return model;
  };
  model.retry=()=>{
    model.ready=loadRoom();
    model.ready.catch(error=>{model.failed=true;report(-1,'房间暂时没能加载，文字入口仍可使用；返回房间时会重试',error);});
    return model.ready;
  };
  model.retry();
  return model;
}
