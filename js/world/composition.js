import * as THREE from 'three';

export function heroSlotKey(){
  const slot=document.querySelector('.project-scene'),rect=slot?.getBoundingClientRect();
  return rect?.height?[rect.top+scrollY,rect.width,rect.height].join(':'):null;
}

// Most portrait scenes follow the actual copy. Projects reserve a document slot
// above their active controls; its framing is independent of panel height.
export function composeHero(world) {
  const hero=document.querySelector('.world-hero');
  const slot=hero.querySelector('.project-scene')?.getBoundingClientRect();
  world.compact=innerWidth<=850||Boolean(slot?.height);
  const height=slot?.height?innerHeight:Math.max(innerHeight,hero?.offsetHeight||0);
  world.compositionSlot=heroSlotKey();
  world.heroHeight=height;world.layoutScale=1;world.heroOffset=0;
  if(!world.compact||world.route?.id==='home'){
    world.heroOffset=world.compact?-height*.12:0;return;
  }
  const copy=hero.querySelector('.hero-copy').getBoundingClientRect();
  const textBottom=copy.bottom-hero.getBoundingClientRect().top;
  world.layoutScale=slot?.height ? Math.min(2,.72*844/innerHeight) : .72*Math.min(1,innerWidth/390*844/height);
  const model=world.model,actor=world.actor.root;
  const position=model.actorMobilePosition||model.actorPosition;
  const place=()=>{
    model.root.position.y=-.3;
    model.root.scale.setScalar((model.displayScale||1)*world.layoutScale);
    actor.scale.setScalar((model.actorScale||1)*world.layoutScale);
    actor.position.set(position[0]*world.layoutScale,position[1]*world.layoutScale-.3,position[2]*world.layoutScale);
    model.root.updateMatrixWorld(true);
    if(model.actorAnchor){model.actorAnchor.getWorldPosition(actor.position);model.actorAnchor.getWorldQuaternion(actor.quaternion);}
    actor.updateMatrixWorld(true);
  };
  world.camera.aspect=innerWidth/innerHeight;
  world.camera.setViewOffset(innerWidth,height,0,0,innerWidth,innerHeight);
  world.camera.updateMatrixWorld(true);
  const bounds=()=>{
    const box=model.compositionBounds?model.compositionBounds.clone().applyMatrix4(model.root.matrixWorld):new THREE.Box3().setFromObject(model.root);
    if(!slot?.height)box.union(new THREE.Box3().setFromObject(actor));
    if(model.layoutBounds)box.union(model.layoutBounds.clone().applyMatrix4(model.root.matrixWorld));
    const result={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      const p=new THREE.Vector3(x,y,z).project(world.camera);
      const px=(p.x+1)*innerWidth/2,py=(1-p.y)*innerHeight/2;
      result.left=Math.min(result.left,px);result.right=Math.max(result.right,px);
      result.top=Math.min(result.top,py);result.bottom=Math.max(result.bottom,py);
    }
    return result;
  };
  place();let region=bounds();
  const available=slot?.height?slot.height-28:Math.max(160,height-textBottom-148);
  if(slot?.height){
    // Perspective size is nonlinear when the model approaches the camera.
    // Find the largest safe pose, rather than shrinking once and leaving gaps.
    let lower=0,upper=world.layoutScale;
    for(let i=0;i<12;i++){
      world.layoutScale=(lower+upper)/2;place();region=bounds();
      if(region.right-region.left<=innerWidth*.86&&region.bottom-region.top<=available)lower=world.layoutScale;
      else upper=world.layoutScale;
    }
    world.layoutScale=lower;
  }else{
    world.layoutScale*=Math.min(1,innerWidth*.86/(region.right-region.left),available/(region.bottom-region.top));
  }
  place();region=bounds();
  world.heroOffset=slot?.height?(region.top+region.bottom)/2-(slot.top+scrollY+slot.height/2):region.top-textBottom-28;
}
