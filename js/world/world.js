import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { createModel } from './models.js';
import { createRoom, ROOM_VIEWS } from './room.js';
import { createParticles } from './particles.js';
import { createCharacter } from './character.js';
import { disposeGroup } from './materials.js';
import { FilmShader } from './film.js';
import { createStage } from './stage.js';
import { composeHero } from './composition.js';
import { readSetting } from '../experience/domain.js';

export class World {
  constructor(container,score,{status,onHover,onPick,onPortal}={}) {
    this.container=container;this.score=score;this.status=status||(()=>{});
    this.onHover=onHover||(()=>{});this.onPick=onPick||(()=>{});
    this.onPortal=onPortal||(()=>{});
    this.pointer=new THREE.Vector2();this.targetPointer=new THREE.Vector2();
    this.ray=new THREE.Raycaster();this.focused=null;this.down=null;this.hovered=null;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setClearColor(0x101513,1);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.info.autoReset=false;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=.92;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-hidden','true');
    container.append(this.renderer.domElement);
    this.scene=new THREE.Scene();
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    const environment=new RoomEnvironment();
    this.environment=pmrem.fromScene(environment,.04).texture;
    this.scene.environment=this.environment;this.scene.environmentIntensity=.8;
    environment.dispose();pmrem.dispose();
    this.camera=new THREE.PerspectiveCamera(38,1,.05,70);
    this.camera.position.set(0,.5,7);
    this.target=new THREE.Vector3();this.desiredCamera=new THREE.Vector3();this.desiredTarget=new THREE.Vector3();
    this.scene.add(new THREE.HemisphereLight(0xbfd2ce,0x161d15,.5));
    this.key=new THREE.SpotLight(0xffdeb2,55,25,.55,.85,1.5);
    this.key.position.set(-3,5,5);this.scene.add(this.key,this.key.target);
    this.key.shadow.mapSize.set(1024,1024);this.key.shadow.bias=-.0003;this.key.shadow.normalBias=.018;
    this.rim=new THREE.SpotLight(0xa1d8d3,48,25,.7,.7,1.5);
    this.rim.position.set(3,3,-2);this.scene.add(this.rim,this.rim.target);
    this.fill=new THREE.PointLight(0xddaf71,6,12);this.fill.position.set(0,-1,2);this.scene.add(this.fill);
    this.floor=createStage();this.scene.add(this.floor);
    this.composer=new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.22,.34,1.35);this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.film=new ShaderPass(FilmShader);this.composer.addPass(this.film);
    this.particles=createParticles(innerWidth<700?1200:2800);this.scene.add(this.particles);
    this.actor=createCharacter();this.scene.add(this.actor.root);
    this.actor.root.rotation.y=0;
    this.moving=0;this.scroll=0;this.transition=0;this.last=performance.now();this.frames=[];this.renderedFrames=0;
    this.events=new AbortController();
    this.heroObserver=new ResizeObserver(()=>{if(this.model&&!this.focused)this.resize();});
    const options={signal:this.events.signal};
    addEventListener('resize',()=>this.resize(),options);
    addEventListener('pointermove',e=>this.move(e),{...options,passive:true});
    addEventListener('pointerdown',e=>{if(!e.target.closest('a,button,input,select,textarea'))this.down=[e.clientX,e.clientY];},options);
    addEventListener('pointerup',e=>this.pick(e),options);
    addEventListener('scroll',()=>{this.scroll=Math.min(1,scrollY/innerHeight);if(this.compact)this.offsetCamera();this.moving=1;this.updateVisibility();},{...options,passive:true});
    document.addEventListener('visibilitychange',()=>{
      this.last=performance.now();
      this.updateVisibility();
    },options);
    this.reduced.addEventListener('change',()=>{this.moving=1;},options);
    this.resize();this.start();
  }

  resize() {
    const quality=readSetting('visual-quality','auto');
    const ratio=quality==='low'?1:quality==='high'?Math.min(devicePixelRatio,2):Math.min(devicePixelRatio,innerWidth<700?1.25:1.6);
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(innerWidth,innerHeight);
    this.composer.setPixelRatio(ratio);this.composer.setSize(innerWidth,innerHeight);
    this.camera.aspect=innerWidth/innerHeight;
    this.bloom.enabled=quality!=='low'&&!this.reduced.matches;
    this.key.castShadow=quality!=='low'&&this.route?.id!=='home';
    this.setRig();
    if(this.model){this.camera.position.copy(this.desiredCamera);this.camera.lookAt(this.desiredTarget);composeHero(this);}
    this.offsetCamera();this.camera.updateProjectionMatrix();this.moving=1;this.updateVisibility();
  }

  offsetCamera() {
    this.camera.aspect=innerWidth/innerHeight;
    this.camera.clearViewOffset();
    if(this.focused)return;
    const compact=this.compact??innerWidth<=850;
    const height=compact?this.heroHeight||innerHeight:innerHeight;
    this.camera.setViewOffset(innerWidth,height,compact?0:-innerWidth*.2,compact?(this.heroOffset||0)+scrollY:0,innerWidth,innerHeight);
  }

  setRig() {
    if(this.focused&&ROOM_VIEWS[this.focused]) {
      const view=ROOM_VIEWS[this.focused];this.desiredCamera.set(...view.camera);this.desiredTarget.set(...view.target);
    }else if(this.route?.id==='home') {
      this.desiredCamera.set(0,1.02,innerWidth<700?-10.2:-7.7);this.desiredTarget.set(0,-.06,0);
    }else {
      this.desiredCamera.set(0,.32,innerWidth<700?7.7:7.1);this.desiredTarget.set(0,.05,0);
    }
  }

  show(route) {
    if(this.model){this.scene.remove(this.model.root);if(!this.model.persistent)disposeGroup(this.model.root);}
    this.route=route;this.focused=null;this.hovered=null;this.scroll=0;
    this.model=route.id==='home'?createRoom((...args)=>{if(this.route?.id==='home')this.status(...args);}):createModel(route);
    this.model.focus?.(null);
    this.scene.add(this.model.root);
    if(route.id!=='home')this.status(1,'世界已就绪');
    this.actor.root.scale.setScalar((this.model.actorScale||1)*(innerWidth<700&&route.id!=='home'?.72:1));
    this.actor.root.position.set(...this.model.actorPosition);
    this.actor.root.rotation.y=route.id==='home'?Math.PI:0;
    this.particles.material.uniforms.uMode.value=['home','lab','blog','radio','projects','about','skin'].indexOf(route.id);
    this.particles.material.uniforms.uColor.value.set(route.color);
    this.scene.environmentIntensity=route.id==='home'?.12:.42;
    this.renderer.toneMappingExposure=route.id==='home'?.88:.92;
    this.bloom.threshold=route.id==='home'?8:1.35;
    this.key.intensity=route.id==='home'?2:16;this.rim.intensity=route.id==='home'?3:22;
    this.fill.intensity=route.id==='home'?.35:2;
    this.key.castShadow=readSetting('visual-quality','auto')!=='low'&&route.id!=='home';
    this.floor.visible=route.id!=='home';
    this.offsetCamera();this.setRig();
    // Swap at the covered midpoint; the reveal starts with a composed camera.
    this.camera.position.copy(this.desiredCamera);this.target.copy(this.desiredTarget);
    this.camera.lookAt(this.target);composeHero(this);this.offsetCamera();this.moving=1;
    this.heroObserver.disconnect();
    const copy=document.querySelector('.hero-copy');if(copy)this.heroObserver.observe(copy);
    this.renderer.domElement.dataset.chapter=route.id;
    this.container.dataset.ready='true';
  }

  focus(id) { this.focused=id;this.model?.focus?.(id);this.offsetCamera();this.setRig();this.moving=1;this.actor.react(); }
  applySkin(id){this.model?.applySkin?.(id);document.body.dataset.skin=id;this.rim.color.set(id==='ocean'?0x8ab6de:id==='forest'?0x88d6b0:0xa1d8d3);this.moving=1;}
  transitionAt(progress){this.transition=progress;this.moving=1;this.updateVisibility();}

  portalPosition(){
    this.camera.updateMatrixWorld();
    const point=this.actor.beacon.getWorldPosition(new THREE.Vector3()).project(this.camera);
    return{x:(point.x+1)/2,y:(1-point.y)/2};
  }

  updateVisibility(){
    const hero=document.querySelector('.world-hero');
    this.occluded=Boolean(hero&&hero.getBoundingClientRect().bottom<=0);
    if(document.hidden||(this.occluded&&this.transition===0))this.stop();
    else this.start();
  }

  move(event) {
    this.targetPointer.set(event.clientX/innerWidth*2-1,-(event.clientY/innerHeight)*2+1);
    this.pointerEvent=event;this.moving=1;
    if(event.pointerType==='touch'&&this.down&&this.route?.id==='home')this.targetPointer.x*=-1;
  }

  pick(event) {
    if(!this.down)return;
    const down=this.down;this.down=null;
    if(Math.hypot(event.clientX-down[0],event.clientY-down[1])>8||this.transition>.01)return;
    const hero=document.querySelector('.world-hero')?.getBoundingClientRect();
    if(!hero||event.clientY<hero.top||event.clientY>hero.bottom)return;
    if(event.target.closest('a,button,input,select,textarea')||event.clientY>innerHeight)return;
    if(this.route?.id!=='home'){this.actor.react();this.model?.interact?.();this.burst=1;this.score.cue('hover');return;}
    this.targetPointer.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);
    this.ray.setFromCamera(this.targetPointer,this.camera);
    const id=this.model.pick?.(this.ray);
    if(id){this.focus(id);this.onPick(id);this.score.cue('hover');}
    else this.actor.react();
  }

  stop(){if(!this.running)return;this.running=false;this.renderer.setAnimationLoop(null);}
  start(){
    if(this.running||document.hidden||(this.occluded&&this.transition===0))return;
    this.running=true;this.last=performance.now();this.renderer.setAnimationLoop(now=>this.frame(now));
  }

  frame(now) {
    const dt=Math.max(0,Math.min((now-this.last)/1000,.06));this.last=now;
    const reduced=this.reduced.matches;
    if(reduced&&this.moving<.01&&this.transition===0)return;
    this.moving*=.92;
    // The score clock also advances in silent mode, and freezes when playback pauses.
    const rhythm=reduced?{time:0,beat:0,pulse:0,phase:0,bar:0,energy:.55}:this.score.rhythm;
    const t=rhythm.time,mood=rhythm.energy;
    this.storyFrame={time:t,beat:rhythm.beat,movement:rhythm.movement,energy:mood};
    const damping=1-Math.exp(-dt*6);
    this.pointer.lerp(this.targetPointer,damping);
    const wanted=this.desiredCamera.clone();
    if(this.route?.id==='home'&&!this.focused) {
      wanted.x-=this.pointer.x*(innerWidth<700?2.4:1.3);
      wanted.y+=this.pointer.y*.07;
    }else if(!this.focused){wanted.x+=this.pointer.x*.13;wanted.y+=this.pointer.y*.075;}
    wanted.z*=1-this.transition*.11;
    this.camera.position.lerp(wanted,damping);this.target.lerp(this.desiredTarget,damping);this.camera.lookAt(this.target);
    if(this.model){
      this.model.update(t,rhythm,this.scroll);
      if(!this.model.persistent){
        this.model.root.rotation.y=Math.sin(t*.12)*.055+this.pointer.x*.06+this.transition*.25;
        this.model.root.position.y=this.compact?-.3:-this.scroll*.42;
        this.model.root.scale.setScalar((this.model.displayScale||1)*(this.layoutScale||1)*(1-this.transition*.08));
      }
    }
    this.actor.update(t,rhythm,this.pointer,this.route?.id==='about',dt);
    const actorPos=this.route?.id==='home'&&this.focused?ROOM_VIEWS[this.focused].target.map((value,i)=>value+(i===1?.4:i===2?-.18:0)):((this.compact&&this.model?.actorMobilePosition)||this.model?.actorPosition||[0,0,0]);
    const actorScale=this.layoutScale||1;
    const journey=this.transition*this.transition*(3-2*this.transition);
    const idleScale=(this.model?.actorScale||1)*(this.route?.id==='home'&&this.focused?.5:1);
    this.actor.root.scale.setScalar(THREE.MathUtils.lerp(idleScale,1,journey)*actorScale);
    const focusedView=this.route?.id==='home'&&ROOM_VIEWS[this.focused];
    const portalBody=focusedView?new THREE.Vector3(focusedView.target[0],focusedView.target[1]+.4,focusedView.target[2]-.75):new THREE.Vector3(0,.35,this.route?.id==='home'?-2.5:1.6);
    const verticalOffset=actorScale<1?-.3:0;
    this.actor.root.position.set(
      THREE.MathUtils.lerp(actorPos[0]*actorScale+Math.sin(t*.45)*.07,portalBody.x*actorScale,journey),
      THREE.MathUtils.lerp(actorPos[1]*actorScale+verticalOffset+Math.sin(t*.8)*.08,portalBody.y*actorScale+verticalOffset,journey)+Math.sin(journey*Math.PI)*.12,
      THREE.MathUtils.lerp(actorPos[2]*actorScale,portalBody.z*actorScale,journey));
    this.actor.root.rotation.z=-journey*.3;
    this.particles.scale.setScalar(actorScale);this.particles.position.y=actorScale<1?-.3:0;
    const uniforms=this.particles.material.uniforms;
    uniforms.uTime.value=t;uniforms.uBeat.value=rhythm.pulse*(.5+mood*.5);uniforms.uGather.value=this.transition;
    // The same real beacon drives particles and the page aperture, including
    // responsive scale, character tilt, breathing and the focused room camera.
    const beacon=this.actor.beacon.getWorldPosition(new THREE.Vector3());
    uniforms.uPortal.value.copy(this.particles.worldToLocal(beacon));
    if(this.transition>0)this.onPortal(this.portalPosition());
    this.burst=(this.burst||0)*Math.exp(-dt*3);
    uniforms.uSize.value=this.renderer.getPixelRatio();uniforms.uEnergy.value=(this.route?.id==='home'?.28:.5)*(.78+mood*.35)+this.transition*.5+this.burst*.5;
    this.bloom.strength=this.route?.id==='home'?.018+mood*.012:.18+mood*.07;
    this.particles.visible=true;
    this.model.root.visible=true;this.actor.root.visible=true;
    this.film.uniforms.uTime.value=t;this.film.uniforms.uTransition.value=this.transition;
    if(this.route?.id==='home'&&!this.focused&&this.pointerEvent&&this.moving>.2){
      this.ray.setFromCamera(this.pointer,this.camera);
      const id=this.model.pick?.(this.ray)||null;
      if(id!==this.hovered){this.hovered=id;this.onHover(id,this.pointerEvent);}
    }
    this.renderer.info.reset();this.composer.render(dt);this.renderedFrames++;
    if(this.frames.length<180)this.frames.push(dt*1000);
  }

  diagnostics(){return{chapter:this.route?.id,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,
    geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,pixelRatio:this.renderer.getPixelRatio(),
    roomReady:this.model?.loaded??null,rendering:this.running,renderedFrames:this.renderedFrames,story:this.storyFrame,frameTimes:this.frames};}
}
