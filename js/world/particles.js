import * as THREE from 'three';
import { randomSequence } from '../audio/synth.js';

export function createParticles(count = 2600) {
  const geometry = new THREE.BufferGeometry();
  const seed = new Float32Array(count * 4);
  const positions = new Float32Array(count * 3);
  const random = randomSequence(33971);
  for (let i = 0; i < seed.length; i++) seed[i] = random() * .5 + .5;
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uMode: { value: 0 }, uGather: { value: 0 },
      uEmitter:{value:new THREE.Matrix4()},uLevels:{value:new THREE.Vector4()},uEmission:{value:0},uAudioTime:{value:0},
      uColor: { value: new THREE.Color(0xd4b47b) }, uPortal: { value: new THREE.Vector3(0,.67,1.6) }, uSize: { value: 1 }, uEnergy: { value: .6 } },
    vertexShader: `attribute vec4 aSeed; uniform float uTime,uBeat,uMode,uGather,uSize,uEnergy,uEmission,uAudioTime;uniform vec3 uPortal;
      uniform mat4 uEmitter;uniform vec4 uLevels;
      varying float vAlpha; varying float vWarm;
      void main(){ float a=aSeed.x*6.283185; float t=uTime*.12; vec3 p;float visibility=1.;
        // Physical pages and message packets carry their own motion; retain only sparse dust there.
        if(uMode<.5){ p=vec3((aSeed.x-.5)*8.,(aSeed.y-.5)*3.,(aSeed.z-.5)*3.);
          p.y+=sin(t+aSeed.w*12.)*.15; }
        else if(uMode<2.5||(uMode>3.5&&uMode<4.5)){
          p=vec3((aSeed.x-.5)*4.4,(aSeed.y-.5)*3.5,(aSeed.z-.5)*2.);
          p.y+=sin(t+aSeed.w*12.)*.08;visibility=step(.76,aSeed.w)*.65;
        }else if(uMode<3.5){
          if(aSeed.w>.68){p=vec3((aSeed.x-.5)*4.4,(aSeed.y-.5)*3.5,(aSeed.z-.5)*2.);
            p.y+=sin(t+aSeed.w*12.)*.08;visibility=.45;
          }else{float stem=floor(aSeed.x*4.);float angle=fract(aSeed.x*4.)*6.283185;
            float level=stem<.5?uLevels.x:stem<1.5?uLevels.y:stem<2.5?uLevels.z:uLevels.w;
            float progress=fract(floor(aSeed.y*3.)/3.+uAudioTime*.58+stem*.065);
            float radius=.79+progress*.3+sin(angle*3.+uAudioTime*2.+stem)*.012*level;
            p=(uEmitter*vec4(cos(angle)*radius,progress*.55,sin(angle)*radius,1.)).xyz;
            visibility=uEmission*sqrt(max(level,0.))*2.4*sin(progress*3.14159);
          }
        }else if(uMode<5.5){ float r=1.38+(aSeed.y-.5)*.055;
          p=vec3(cos(a+t*.3)*r,sin(a+t*.3)*r*.72+.15,(aSeed.z-.5)*.12-.3); }
        else{ float panel=floor(aSeed.x*5.);float row=floor(aSeed.y*28.);
          p=vec3((panel-2.)*.58+(aSeed.z-.5)*.43,(row/27.-.5)*1.76,
            cos(panel*.7)*.3-.08);p.y+=sin(t*5.+panel*.6)*.1; }
        // A few drifting grains retain the atmosphere around each precise formation.
        if(uMode>4.5&&aSeed.w>.86){p=vec3((aSeed.x-.5)*4.4,(aSeed.y-.5)*3.5,(aSeed.z-.5)*2.);
          p.y+=sin(t+aSeed.w*12.)*.08;}
        float gather=smoothstep(0.,1.,uGather);
        float spin=gather*6.283185+a;
        vec3 ember=uPortal+vec3(cos(spin)*.07,(aSeed.y-.5)*.14,sin(spin)*.07);
        p=mix(p,ember,gather);
        p+=vec3(sin(a+gather*8.),cos(a+gather*8.),0.)*sin(gather*3.14159)*.14;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((1.+aSeed.w*1.5+uBeat*.3+gather)*uSize*7./max(-mv.z,1.),1.,8.);
        vAlpha=(.15+aSeed.z*.55)*uEnergy*(1.+gather*.25)*mix(visibility,1.,gather); vWarm=aSeed.w; }`,
    fragmentShader: `uniform vec3 uColor; varying float vAlpha,vWarm;
      void main(){ float d=length(gl_PointCoord-.5)*2.; if(d>1.)discard;
        float a=pow(1.-d,2.)*vAlpha;
        gl_FragColor=vec4(mix(uColor,vec3(1.,.94,.76),vWarm*.5)*(1.+(1.-d)*.7),a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
