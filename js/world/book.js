import * as THREE from 'three';
import { brass, ink, paper, mesh } from './materials.js';
import { bookPage } from './book-page.js';

const width=1.36,height=1.88;
const curve=x=>Math.sin(x/width*Math.PI)*.11+x*.08;
function pageGeometry(sign,depth) {
  const geometry=new THREE.PlaneGeometry(width,height,32,12),pos=geometry.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i)+width/2;pos.setXYZ(i,sign*x,pos.getY(i),curve(x)+depth);
  }
  if(sign<0){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));}
  geometry.computeVertexNormals();return geometry;
}

export function createBook(title,entries=[],article=null) {
  const root=new THREE.Group(),pivot=new THREE.Group();root.add(pivot);pivot.rotation.set(.04,-.3,-.12);
  const intro=bookPage({title:article?title:'A curious mind.',...article,kicker:article?'FIELD NOTE / ELI3XIR':'THE CABINET / ELI3XIR',number:article?'§':'✳'});
  const textureAt=i=>bookPage({...entries[i],title:entries[i]?.title||title,number:String(i+1).padStart(2,'0')});
  const surfaces=[];
  for(const sign of [-1,1]){
    const cover=mesh(new THREE.BoxGeometry(1.43,1.94,.095),ink(),pivot,[sign*.72,0,-.18]);cover.rotation.y=sign*-.13;
    for(let layer=0;layer<11;layer++){
      const material=layer===10?new THREE.MeshStandardMaterial({map:sign<0?intro:textureAt(0),roughness:.7,side:THREE.DoubleSide}):paper();
      const page=mesh(pageGeometry(sign,layer*.007),material,pivot);if(layer===10)surfaces.push(page);
    }
    mesh(new THREE.CylinderGeometry(.015,.015,1.86,12),brass(),pivot,[sign*.025,0,-.08]);
  }
  const leaf=new THREE.Group();leaf.position.z=.07;leaf.visible=false;pivot.add(leaf);
  const front=mesh(pageGeometry(1,0),new THREE.MeshStandardMaterial({map:surfaces[1].material.map,roughness:.7,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),leaf);
  const back=mesh(front.geometry.clone(),new THREE.MeshStandardMaterial({map:intro,roughness:.7,side:THREE.BackSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}),leaf);
  const backUV=back.geometry.attributes.uv;for(let i=0;i<backUV.count;i++)backUV.setX(i,1-backUV.getX(i));
  const anchor=new THREE.Object3D(),contact=new THREE.Object3D();pivot.add(anchor,contact);
  const rest=new THREE.Vector3(width-.24,height/2+.08,curve(width)+.25),offset=new THREE.Vector3(-.24,.08,.18);
  const motion={grounded:true,reach:1,grip:new THREE.Vector3()},point=new THREE.Vector3();anchor.position.copy(rest);
  function guide(progress=0){
    const page=Math.min(1,progress/.72),angle=page*page*(3-2*page)*Math.PI;
    const bend=curve(width)*Math.cos(angle);
    contact.position.set(width*Math.cos(angle)-bend*Math.sin(angle),height/2,.07+width*Math.sin(angle)+bend*Math.cos(angle));
    anchor.position.copy(contact.position).add(offset);
    if(progress>.72){const p=(progress-.72)/.28,ease=p*p*(3-2*p);anchor.position.lerp(rest,ease);anchor.position.y+=Math.sin(p*Math.PI)*.5;anchor.position.z+=Math.sin(p*Math.PI)*.3;}
    const release=THREE.MathUtils.clamp((progress-.68)/.12,0,1);
    motion.reach=1-release*release*(3-2*release);
    if(progress>=.8){
      // The turned leaf is released. Reach for the next right-hand page as
      // the return arc ends, so idle does not snap the palm to a new point.
      contact.position.set(width,height/2,.07+curve(width));
      const grasp=THREE.MathUtils.clamp((progress-.86)/.14,0,1);
      motion.reach=grasp*grasp*(3-2*grasp);
    }
    motion.grip.copy(contact.position).sub(anchor.position).divideScalar(.7);
  }
  guide();
  let index=0,flight=null,queued=null,disposed=false;
  function releaseUnused(previous){
    const used=new Set([surfaces[0],surfaces[1],front,back].map(p=>p.material.map));
    for(const texture of previous)if(!used.has(texture))texture.dispose();
  }
  function finish(){
    const previous=new Set([surfaces[0],surfaces[1],front,back].map(p=>p.material.map));
    surfaces[0].material.map=front.material.map;
    front.material.map=back.material.map=surfaces[1].material.map;
    index=flight.to;flight=null;leaf.visible=false;guide();releaseUnused(previous);model.onChange?.(index);
  }
  function begin(options){
    const to=(index+1)%entries.length;
    front.material.map=surfaces[1].material.map;back.material.map=front.material.map;
    surfaces[1].material.map=textureAt(to);
    flight={to,start:options.now+options.delay,duration:options.duration,progress:0};leaf.visible=true;pose(0);options.onStart?.(options.delay);
    if(options.reduced)finish();
  }
  function pose(progress){
    const page=Math.min(1,progress/.72),eased=page*page*(3-2*page),angle=eased*Math.PI;guide(progress);
    leaf.rotation.y=-angle;
    for(const page of [front,back]){
      const pos=page.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){
        const x=pos.getX(i);pos.setZ(i,curve(x)*Math.cos(angle)+Math.sin(x/width*Math.PI)*Math.sin(angle)*.18);
      }
      pos.needsUpdate=true;page.geometry.computeVertexNormals();
    }
  }
  const model={root,actorPosition:[1.4,.9,.15],actorMobilePosition:[1.05,1.15,.15],actorAnchor:anchor,actorScale:.7,actorMotion:motion,
    layoutBounds:new THREE.Box3(new THREE.Vector3(-1.7,-1,-.3),new THREE.Vector3(1.7,1.65,1.7)),onChange:null,
    select(value){
      if(disposed||!Number.isInteger(value)||value<0||value>=entries.length||value===index&&!flight)return;
      const previous=new Set([surfaces[0],surfaces[1],front,back].map(page=>page.material.map));
      surfaces[0].material.map=surfaces[1].material.map;surfaces[1].material.map=textureAt(value);front.material.map=back.material.map=surfaces[1].material.map;
      index=value;flight=queued=null;leaf.visible=false;guide();releaseUnused(previous);model.onChange?.(index);
    },
    diagnostics:()=>({index,turning:Boolean(flight),progress:flight?.progress??1,title:surfaces[1].material.map.image.dataset.title,excerpt:surfaces[1].material.map.image.dataset.excerpt,grip:contact.getWorldPosition(point).toArray()}),
    get index(){return index;},get turning(){return Boolean(flight);},get turnProgress(){return flight?.progress??1;},
    hitTest(ray){root.updateMatrixWorld(true);return ray.intersectObject(pivot,true).some(hit=>hit.object.visible&&hit.object.parent.visible);},
    next(options){
      if(disposed||entries.length<2)return false;
      if(flight){queued=options;return false;}
      begin(options);return true;
    },
    update(t,beat,scroll,now=0,reduced=false){
      pivot.rotation.y=-.3+Math.sin(t*.3)*.07+scroll*.16;
      if(flight){
        flight.progress=reduced?1:THREE.MathUtils.clamp((now-flight.start)/flight.duration,0,1);pose(flight.progress);
        if(flight.progress===1){finish();if(queued){const next=queued;queued=null;begin({...next,now,delay:0,reduced});}}
      }
    },
    dispose(){disposed=true;queued=flight=null;model.onChange=null;}
  };
  return model;
}
