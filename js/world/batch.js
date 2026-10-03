import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* Bake static transforms into geometry without changing the material or lightmap. */
export function batchStatic(root,exclude=new Set()) {
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert();const groups=new Map();const removed=[];
  root.traverse(object=>{
    if(!object.isMesh||Array.isArray(object.material)||exclude.has(object)||object.isSkinnedMesh)return;
    const signature=Object.entries(object.geometry.attributes).map(([name,attribute])=>`${name}:${attribute.itemSize}:${attribute.normalized}`).sort().join('|');
    const key=object.material.uuid+'/'+signature+'/'+Boolean(object.geometry.index);
    if(!groups.has(key))groups.set(key,[]);groups.get(key).push(object);
  });
  for(const objects of groups.values()){
    if(objects.length<2)continue;
    const geometries=objects.map(object=>{
      const geometry=object.geometry.clone();const matrix=inverse.clone().multiply(object.matrixWorld);
      geometry.applyMatrix4(matrix);
      // A reflected transform reverses the triangle winding.
      if(matrix.determinant()<0&&geometry.index){const index=geometry.index;for(let i=0;i<index.count;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b);}}
      return geometry;
    });
    const geometry=mergeGeometries(geometries,false);
    geometries.forEach(item=>item.dispose());
    if(!geometry)continue;
    const merged=new THREE.Mesh(geometry,objects[0].material);
    merged.name='batch_'+objects[0].material.name;merged.castShadow=objects[0].castShadow;merged.receiveShadow=objects[0].receiveShadow;
    root.add(merged);objects.forEach(object=>{object.removeFromParent();removed.push(object.geometry);});
  }
  const retained=new Set();root.traverse(object=>{if(object.geometry)retained.add(object.geometry);});
  new Set(removed).forEach(geometry=>{if(!retained.has(geometry))geometry.dispose();});
  return {groups:groups.size,removed:removed.length};
}
