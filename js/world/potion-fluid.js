import * as THREE from 'three';
import {mesh} from './materials.js';

export function createPotionFluid(root){
  const canvas=document.querySelector('#world-stage canvas');
  const profile=new THREE.Path();
  profile.moveTo(0,-.80);profile.lineTo(.33,-.80);
  profile.bezierCurveTo(.53,-.80,.595,-.6,.595,-.32);
  profile.bezierCurveTo(.595,-.15,.58,-.045,.558,.035);
  // Concentric surface vertices support a curved meniscus and travelling ripples.
  for(let i=11;i>=0;i--){const r=.558*i/12;profile.lineTo(r,.018+.017*(r/.558)**8);}
  const material=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uProgress:{value:0},uReaction:{value:0}},
    vertexShader:`uniform float uTime,uProgress,uReaction;varying vec3 vLocal,vNormal,vView;
      void main(){vec3 p=position;float r=length(p.xz);float surface=smoothstep(-.1,.015,p.y);
        p.y+=surface*(sin(r*19.-uProgress*18.)*.035*uReaction+sin(p.x*5.+uTime)*cos(p.z*6.+uTime*.8)*.006);
        vLocal=p;vNormal=normalize(normalMatrix*normal);vView=(modelViewMatrix*vec4(p,1.)).xyz;
        gl_Position=projectionMatrix*vec4(vView,1.);}`,
    fragmentShader:`uniform float uTime,uProgress,uReaction;varying vec3 vLocal,vNormal,vView;
      void main(){float r=length(vLocal.xz);float phase=uTime*.28+uProgress*3.;
        float flow=sin(vLocal.y*7.+sin(vLocal.x*7.+phase)*1.1-phase)*.5+.5;
        float edge=pow(1.-abs(dot(normalize(vNormal),normalize(-vView))),2.5);
        float surface=smoothstep(.7,.95,normalize(vNormal).y);
        float wave=pow(.5+.5*cos(r*22.-uProgress*18.),10.)*uReaction*surface;
        vec3 c=mix(vec3(.012,.12,.075),vec3(.08,.40,.23),flow*.55+.2);
        c+=vec3(.14,.40,.24)*(edge*.8+surface*.12+wave*.35);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const liquid=mesh(new THREE.LatheGeometry(profile.getPoints(10),80),material,root);
  liquid.name='potion-liquid';liquid.castShadow=false;
  const count=36,positions=new Float32Array(count*3),seeds=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    // Irrational sequences keep the same finite cloud across every reaction.
    seeds.set([(i*.61803398875)%1,(i*.41421356237+.2)%1,(i*.73205080757+.4)%1],i*3);
    positions.set([0,.7,0],i*3);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,3));
  geometry.boundingBox=new THREE.Box3(new THREE.Vector3(-.4,.02,-.4),new THREE.Vector3(.4,1.52,.4));
  geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.77,0),.87);
  const bubbles=new THREE.Points(geometry,new THREE.ShaderMaterial({
    uniforms:{uProgress:{value:-1},uHeight:{value:innerHeight}},
    vertexShader:`attribute vec3 aSeed;uniform float uProgress,uHeight;varying float vAlpha;
      void main(){float flight=(uProgress-aSeed.x*.27)/(.55+aSeed.y*.12);float p=clamp(flight,0.,1.);
        float y=.02+p*1.47;float radius=(.14+aSeed.y*.22)*(1.-smoothstep(.17,.64,y))+.018;
        float angle=aSeed.z*6.283185+p*1.3;
        vec3 point=vec3(cos(angle)*radius,y,sin(angle)*radius);
        vec4 mv=modelViewMatrix*vec4(point,1.);gl_Position=projectionMatrix*mv;
        float scale=length(modelViewMatrix[0].xyz);
        gl_PointSize=clamp((.011+aSeed.z*.017)*scale*uHeight*projectionMatrix[1][1]/max(-mv.z,.1),1.,14.);
        vAlpha=step(0.,flight)*step(flight,1.)*sin(p*3.14159);}`,
    fragmentShader:`varying float vAlpha;
      void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;
        float rim=smoothstep(.55,.83,r)*(1.-smoothstep(.83,1.,r));
        float glint=exp(-length(p-vec2(-.3,-.34))*15.);
        gl_FragColor=vec4(vec3(.65,.87,.75)+glint*.25,(rim*.5+glint*.8)*vAlpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,transparent:true,depthWrite:false
  }));
  bubbles.name='potion-bubbles';bubbles.visible=false;root.add(bubbles);
  return{update(t,p,reaction,active){
    material.uniforms.uTime.value=t;material.uniforms.uProgress.value=p;material.uniforms.uReaction.value=reaction;
    bubbles.visible=active;bubbles.material.uniforms.uProgress.value=active?p:-1;
    bubbles.material.uniforms.uHeight.value=canvas?.height||innerHeight;
  }};
}
