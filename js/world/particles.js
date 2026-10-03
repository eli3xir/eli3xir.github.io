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
    uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uMode: { value: 0 },
      uColor: { value: new THREE.Color(0xd4b47b) }, uSize: { value: 1 }, uEnergy: { value: .6 } },
    vertexShader: `attribute vec4 aSeed; uniform float uTime,uBeat,uMode,uSize,uEnergy;
      varying float vAlpha; varying float vWarm;
      void main(){ float a=aSeed.x*6.283185; float t=uTime*.12; vec3 p;
        if(uMode<.5){ p=vec3((aSeed.x-.5)*8.,(aSeed.y-.5)*3.,(aSeed.z-.5)*3.);
          p.y+=sin(t+aSeed.w*12.)*.15; }
        else if(uMode<1.5){ float h=fract(aSeed.y+t*.16);
          float r=.5+h*.95; p=vec3(cos(a+t+h*4.)*r,h*3.-1.2,sin(a+t+h*4.)*r);
          p+=vec3(sin(t*4.+a)*.08,0.,cos(t*3.+a)*.08); }
        else if(uMode<2.5){ float x=(aSeed.x-.5)*3.5;
          p=vec3(x,(aSeed.y-.5)*1.8,sin(x*2.+t*4.)*.3+aSeed.z*.3);
          p.y+=sin(t*3.+aSeed.x*8.)*.07; }
        else if(uMode<3.5){ float r=.8+aSeed.y*1.4;
          p=vec3(cos(a)*r,sin(a)*r*.56,sin(a*8.-uTime*2.)*(.12+uBeat*.12));
          p.y+=sin(a*6.+uTime*2.)*.12; }
        else if(uMode<4.5){ float f=fract(aSeed.y+t*.5);
          p=vec3((floor(aSeed.x*5.)-2.)*.55,f*3.-1.4,(floor(aSeed.z*5.)-2.)*.4);
          p.x+=sin(f*6.28)*.07; }
        else if(uMode<5.5){ float r=1.1+aSeed.y*.9;
          p=vec3(cos(a+t)*r,sin(a+t)*r*.65,sin(a+t)*r*.7); }
        else { float r=1.5; p=vec3(cos(a+t)*r,sin(a*2.+t)*.6,(aSeed.z-.5)*1.3); }
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((1.2+aSeed.w*2.+uBeat*.5)*uSize*7./max(-mv.z,1.),1.,9.);
        vAlpha=(.2+aSeed.z*.6)*uEnergy; vWarm=aSeed.w; }`,
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
