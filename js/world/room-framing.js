import * as THREE from 'three';

const objects={lab:['labware'],blog:['notebook'],radio:['gramophone'],projects:['sticky_board','sticky_frame'],about:['photo_card','photo_img','pin_photo'],skin:['painting_frame','painting_canvas']};
export const roomFocusActor=view=>view.actor||[view.target[0],view.target[1]+.4,view.target[2]-.18];
export function roomFocusBounds(asset){
  asset.updateWorldMatrix(true,true);const bounds={};
  for(const [id,names] of Object.entries(objects)){
    const box=new THREE.Box3();names.forEach(name=>{const object=asset.getObjectByName(name);if(object)box.expandByObject(object);});
    if(!box.isEmpty())bounds[id]=box;
  }
  return bounds;
}

export function frameRoomCorner(world,view){
  const width=innerWidth,height=innerHeight;
  const preview=document.querySelector('.object-preview'),panel=preview&&!preview.hidden?preview.getBoundingClientRect():null;
  const header=document.querySelector('.studio-header')?.getBoundingClientRect();
  const landscape=width>height*1.25&&height<600;
  const desktop=width>850,dock=document.querySelector('.chapter-dock')?.getBoundingClientRect();
  const frame={left:landscape||desktop?(panel?.right??width*.4)+24:width*.07,right:width*.93,top:Math.max(84,header?.bottom??84)+12,bottom:landscape?height-78:desktop?(dock?.top??height-105)-24:(panel?.top??height-241)-18};
  frame.bottom=Math.max(frame.top+100,frame.bottom);frame.right=Math.max(frame.left+100,frame.right);
  const box=world.model.focusBounds?.[world.focused]?.clone()||new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(...view.target),new THREE.Vector3(.7,.5,.4));
  const actor=new THREE.Vector3(...roomFocusActor(view));
  box.union(new THREE.Box3().setFromCenterAndSize(actor,new THREE.Vector3(.52,.7,.48)));
  const center=box.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(...view.camera).sub(new THREE.Vector3(...view.target)).normalize();
  const right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right),offset=new THREE.Vector3();
  const tangent=Math.tan(THREE.MathUtils.degToRad(world.camera.fov/2));
  const horizontal=tangent*(frame.right-frame.left)/height*.9,vertical=tangent*(frame.bottom-frame.top)/height*.9;
  let distance=0;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    offset.set(x,y,z).sub(center);distance=Math.max(distance,offset.dot(direction)+Math.max(Math.abs(offset.dot(right))/horizontal,Math.abs(offset.dot(up))/vertical));
  }
  world.desiredTarget.copy(center);world.desiredCamera.copy(center).addScaledVector(direction,Math.max(1.4,distance));
  return{...frame,offsetX:width/2-(frame.left+frame.right)/2,offsetY:height/2-(frame.top+frame.bottom)/2};
}
