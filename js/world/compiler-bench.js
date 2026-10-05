import * as THREE from 'three';
import {brass,ink,mesh} from './materials.js';
import {casing} from './hardware.js';
import {display} from './signal-hardware.js';
import {batchStatic} from './batch.js';

const ease=p=>{p=THREE.MathUtils.clamp(p,0,1);return p*p*(3-2*p);};
export function createCompilerBench(compiler){
  const root=new THREE.Group(),frame=new THREE.Group();root.add(frame);root.name='compiler-workbench';
  const metal=brass(),dark=ink();
  for(const x of [-1.6,1.6]){
    mesh(new THREE.CylinderGeometry(.035,.035,1.82,12),metal,frame,[x,.16,-.15]);
    mesh(casing(.18,.1,.26,.03),dark,frame,[x,-.68,-.15]);
    for(const y of [-.55,.85])mesh(new THREE.SphereGeometry(.064,12,8),metal,frame,[x,y,-.15]);
  }
  const cross=mesh(new THREE.CylinderGeometry(.025,.025,3.2,12),metal,frame,[0,1.07,-.15]);cross.rotation.z=Math.PI/2;
  mesh(casing(2.84,.08,.64,.04),dark,frame,[0,-.67,.38]);
  for(let i=0;i<13;i++)mesh(new THREE.BoxGeometry(.018,.005,.42),metal,frame,[(i-6)*.21,-.625,.38]);
  const screen=display(640,160),readout=mesh(new THREE.PlaneGeometry(1.48,.37),new THREE.MeshBasicMaterial({map:screen.texture,toneMapped:false}),frame,[0,-.42,.91]);readout.rotation.x=-.14;readout.castShadow=false;
  screen.draw('INTEGER WORKBENCH','TOKENS → TREE','');batchStatic(frame);
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
  const ctx=canvas.getContext('2d'),atlas=new THREE.CanvasTexture(canvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=4;
  const faceMaterial=new THREE.MeshBasicMaterial({map:atlas,toneMapped:false}),chipGeo=casing(.40,.24,.10,.035);
  const chips=Array.from({length:15},(_,i)=>{
    const chip=new THREE.Group();chip.name=`syntax-node-${i}`;root.add(chip);chip.visible=false;
    mesh(chipGeo,metal,chip);const face=new THREE.PlaneGeometry(.36,.205),uv=face.attributes.uv;
    const col=i%4,row=Math.floor(i/4);for(let j=0;j<uv.count;j++)uv.setXY(j,(col+uv.getX(j)*.94+.03)/4,1-(row+1-uv.getY(j)*.94-.03)/4);
    const glyph=mesh(face,faceMaterial,chip,[0,0,.056]);glyph.castShadow=false;
    const lamp=mesh(new THREE.SphereGeometry(.012,8,6),new THREE.MeshBasicMaterial({color:0x527361,toneMapped:false}),chip,[.16,-.086,.06]);
    return{root:chip,lamp,from:new THREE.Vector3(),target:new THREE.Vector3(),home:new THREE.Vector3()};
  });
  const rods=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.008,1,8),metal,14),packets=new THREE.InstancedMesh(new THREE.SphereGeometry(.028,10,8),new THREE.MeshBasicMaterial({color:0xd0e9a8,toneMapped:false}),6);
  root.add(rods,packets);rods.frustumCulled=packets.frustumCulled=false;rods.count=packets.count=0;
  const dummy=new THREE.Object3D(),axis=new THREE.Vector3(0,1,0),delta=new THREE.Vector3();
  let program=null,serial=-1,inkStamp='',edges=[];
  function install(next){
    program=next;edges=[];let leaf=0;const positions=new Map();
    const visit=(id,depth)=>{const node=program.nodes[id];const xs=node.children.map(child=>visit(child,depth+1));const x=xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:leaf++;positions.set(id,{x,depth});return x;};
    visit(program.root,0);const depth=Math.max(...[...positions.values()].map(p=>p.depth));
    const sourceOrder=[...program.nodes].sort((a,b)=>a.start-b.start||a.id-b.id);
    chips.forEach((chip,i)=>{
      const was=chip.root.visible;chip.root.visible=i<program.nodes.length;if(!chip.root.visible)return;
      const order=sourceOrder.findIndex(n=>n.id===i),columns=Math.min(5,program.nodes.length),rows=Math.ceil(program.nodes.length/columns);
      chip.home.set((order%columns-(columns-1)/2)*.55,-.19+((rows-1)/2-Math.floor(order/columns))*.28,.38);
      const p=positions.get(i);chip.target.set(leaf>1?(p.x/(leaf-1)-.5)*2.78:0,.83-p.depth*Math.min(.37,1.25/Math.max(1,depth)),.22+p.depth*.035);
      chip.from.copy(was?chip.root.position:chip.home);
      for(const child of program.nodes[i].children)edges.push([child,i]);
    });
    rods.count=edges.length;inkStamp='';
  }
  function print(state){
    const completed=Math.max(0,Math.min(program.steps.length,Math.floor(state.progress-2))),stamp=`${serial}:${completed}:${state.phase}`;
    if(stamp===inkStamp)return;inkStamp=stamp;ctx.clearRect(0,0,canvas.width,canvas.height);
    for(const node of program.nodes){
      const x=node.id%4*512,y=Math.floor(node.id/4)*256,step=program.steps.findIndex(s=>s.id===node.id),resolved=step>=0&&step<completed;
      ctx.fillStyle=resolved?'#254638':'#e6d7b5';ctx.fillRect(x,y,512,256);
      ctx.fillStyle=resolved?'#d5e8bd':'#263a32';ctx.font='20px monospace';ctx.fillText(String(node.id+1).padStart(2,'0')+' / '+(resolved?'VALUE':node.children.length?'OPERATOR':'SYMBOL'),x+24,y+38);
      const label=resolved?String(node.value):node.label;ctx.font='bold 100px monospace';ctx.textAlign='center';ctx.fillText(label,x+256,y+180,452);ctx.textAlign='left';
    }
    atlas.needsUpdate=true;
    screen.draw('INTEGER WORKBENCH',state.phase==='error'?'CHECK SOURCE':state.phase==='done'?`${program.target} = ${program.result}`:state.phase==='evaluating'?'EVALUATING':'TOKENS → TREE','');
  }
  const model={root,chips,atlas,rods,packets,compiler,
    update(now,reduced){
      compiler.advance(now,reduced);const state=compiler.state;
      if(program!==state.program){install(state.program);serial=state.serial;}
      else if(serial!==state.serial){serial=state.serial;chips.forEach(chip=>chip.from.copy(chip.root.position));inkStamp='';}
      print(state);
      const assembled=state.phase==='ready'?0:ease(state.progress/2);
      chips.forEach((chip,i)=>{
        if(!chip.root.visible)return;
        const p=reduced?1:assembled;
        chip.root.position.lerpVectors(state.phase==='ready'?chip.home:chip.from,chip.target,p);
        if(!reduced&&state.phase==='assembling')chip.root.position.z+=Math.sin(Math.PI*p)*(.12+i%3*.035);
        chip.lamp.material.color.setHex(state.phase==='evaluating'&&program.steps[state.step]?.id===i?0xedbd71:0x527361);
      });
      for(let i=0;i<edges.length;i++){
        const [child,parent]=edges[i],a=chips[child].root.position,b=chips[parent].root.position;
        dummy.position.copy(a).lerp(b,.5);dummy.position.z-=.065;delta.copy(b).sub(a);
        dummy.quaternion.setFromUnitVectors(axis,delta.clone().normalize());dummy.scale.set(1,Math.max(.001,delta.length()),1);dummy.updateMatrix();rods.setMatrixAt(i,dummy.matrix);
      }
      rods.visible=assembled>.02;rods.instanceMatrix.needsUpdate=true;
      const step=state.phase==='evaluating'?program.steps[state.step]:null;packets.count=step&&!reduced?step.children.length*3:0;
      if(step&&!reduced)step.children.forEach((id,branch)=>{for(let i=0;i<3;i++){
        const p=THREE.MathUtils.clamp((state.progress%1-i*.1)/.75,0,1);dummy.position.copy(chips[id].root.position).lerp(chips[step.id].root.position,ease(p));dummy.position.z-=.04;
        dummy.scale.setScalar(p>0&&p<1?1-i*.22:0);dummy.updateMatrix();packets.setMatrixAt(branch*3+i,dummy.matrix);
      }});packets.instanceMatrix.needsUpdate=true;
    }
  };
  model.update(0,false);return model;
}
