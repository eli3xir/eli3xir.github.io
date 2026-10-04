import * as THREE from 'three';
import {SKINS} from '../experience/domain.js';
import {createRoom} from './room.js';
import {ROOM_FINISH,roomSkinColor} from './room-palette.js';
import {brass,ink,mesh} from './materials.js';
import {casing} from './hardware.js';
import {bindRoomReflection} from './room-reflections.js';

export function createSkinPreview(renderer){
  const root=new THREE.Group(),display=new THREE.Group();root.add(display);display.rotation.x=.2;
  const keys=Object.keys(SKINS),tiles=[],materials=new Map(),surfaces=[];
  let selected='default',flight=null,preview=null,disposed=false,generation=0,reflections=null;
  const reflectionRotation=new THREE.Matrix3(),rotationMatrix=new THREE.Matrix4();
  const base=mesh(casing(3.18,.18,2.42,.07),ink(),display,[0,-.95,.08]);base.name='finish-table';
  mesh(casing(3.1,.025,2.34,.055),brass(),display,[0,-.845,.08]);
  mesh(casing(3.02,.025,2.25,.045),new THREE.MeshStandardMaterial({color:0x293129,roughness:.82}),display,[0,-.82,.08]);
  const tileGeometry=casing(.44,.13,.34,.035);
  keys.forEach((id,i)=>{
    const tile=mesh(tileGeometry,new THREE.MeshPhysicalMaterial({color:SKINS[id].colors[0],roughness:.38,metalness:.12,clearcoat:.25}),display,[(i-2)*.56,-.69,1.055]);
    tile.name='finish-sample-'+id;tile.userData.skin=id;tiles.push(tile);
    mesh(new THREE.BoxGeometry(.17,.006,.012),brass(),tile,[0,.072,.08]);
  });
  const marker=mesh(new THREE.SphereGeometry(.016,16,10),new THREE.MeshBasicMaterial({color:0xe4d59c}),display,[-1.12,-.81,1.28]);
  function setColors(){surfaces.forEach(s=>{roomSkinColor(s.material,selected,s.to);s.material.color.copy(s.to);s.from.copy(s.to);});}
  function setTiles(){tiles.forEach((tile,i)=>{tile.position.y=-.69+(keys[i]===selected?.075:0);});marker.position.x=(keys.indexOf(selected)-2)*.56;}
  const model={root,bakedLighting:true,actorPosition:[1.24,.91,.1],actorScale:.85,previewStatus:'loading',selected,
    pick(ray){root.updateMatrixWorld(true);return ray.intersectObjects(tiles,false)[0]?.object.userData.skin??null;},
    applySkin(id,options){
      if(disposed)return;id=SKINS[id]?id:'default';selected=id;model.selected=id;
      if(!options||options.reduced){flight=null;setColors();setTiles();reflections?.set(id);return;}
      reflections?.begin(id);
      surfaces.forEach(s=>{s.from.copy(s.material.color);roomSkinColor(s.material,id,s.to);});
      flight={start:options.now+options.delay,duration:options.duration,from:tiles.map(tile=>tile.position.y),marker:marker.position.x};
    },
    update(t,beat,scroll,now=0,reduced=false){
      if(!flight||disposed)return;
      const p=reduced?1:THREE.MathUtils.clamp((now-flight.start)/flight.duration,0,1),ease=p*p*(3-2*p);
      surfaces.forEach(s=>s.material.color.lerpColors(s.from,s.to,ease));
      reflections?.blend(ease);
      tiles.forEach((tile,i)=>{tile.position.y=THREE.MathUtils.lerp(flight.from[i],-.69+(keys[i]===selected?.075:0),ease);});
      marker.position.x=THREE.MathUtils.lerp(flight.marker,(keys.indexOf(selected)-2)*.56,ease);
      if(p===1)flight=null;
    },
    afterTransform(){if(preview&&reflections){preview.updateWorldMatrix(true,false);rotationMatrix.extractRotation(preview.matrixWorld);reflectionRotation.setFromMatrix4(rotationMatrix).invert();}},
    dispose(){
      disposed=true;generation++;flight=null;model.onStatus=model.onPick=null;
      // Geometry and lightmaps belong to the persistent source room. Detach them
      // before World's normal disposal of this page's table and sample tiles.
      preview?.removeFromParent();materials.forEach(material=>material.dispose());materials.clear();surfaces.length=0;
    },
    retryPreview(){
      if(disposed)return;const token=++generation;model.previewStatus='loading';model.onStatus?.();
      const source=createRoom(()=>{},renderer);
      model.ready=source.ready.then(()=>{
        if(disposed||token!==generation)return;
        const asset=source.asset.clone(true);reflections=source.reflections;model.reflections=reflections;reflections?.set(selected);
        asset.traverse(object=>{
          if(!object.isMesh)return;object.castShadow=object.receiveShadow=false;
          const copy=original=>{
            if(materials.has(original))return materials.get(original);
            const material=original.clone();
            if(reflections)bindRoomReflection(material,reflections.texture,reflectionRotation);
            if(original.userData.originalColor)material.userData.originalColor=original.userData.originalColor.clone();
            materials.set(original,material);
            if(material.color){roomSkinColor(material,selected,material.color);if(ROOM_FINISH.test(material.name))surfaces.push({material,from:material.color.clone(),to:material.color.clone()});}
            return material;
          };
          object.material=Array.isArray(object.material)?object.material.map(copy):copy(object.material);
        });
        const bounds=new THREE.Box3().setFromObject(asset),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
        asset.position.sub(center);preview=new THREE.Group();preview.name='same-room-preview';preview.add(asset);
        preview.scale.setScalar(.345);preview.rotation.y=Math.PI+.10;preview.position.y=-.795+size.y*.345/2;
        display.add(preview);setColors();model.previewStatus='ready';model.onStatus?.();
      }).catch(error=>{if(!disposed&&token===generation){model.previewStatus='failed';model.previewError=error.message;model.onStatus?.();}});
      return model.ready;
    }
  };
  setTiles();model.retryPreview();return model;
}
