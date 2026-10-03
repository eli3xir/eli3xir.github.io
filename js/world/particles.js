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
      uColor: { value: new THREE.Color(0xd4b47b) }, uPortal: { value: new THREE.Vector3(0,.67,1.6) }, uSize: { value: 1 }, uEnergy: { value: .6 } },
    vertexShader: `attribute vec4 aSeed; uniform float uTime,uBeat,uMode,uGather,uSize,uEnergy;uniform vec3 uPortal;
      varying float vAlpha; varying float vWarm;
      void main(){ float a=aSeed.x*6.283185; float t=uTime*.12; vec3 p;
        // One persistent set of seeds: dust -> reaction -> pages -> waves -> signals.
        if(uMode<.5){ p=vec3((aSeed.x-.5)*8.,(aSeed.y-.5)*3.,(aSeed.z-.5)*3.);
          p.y+=sin(t+aSeed.w*12.)*.15; }
        else if(uMode<1.5){ float h=fract(aSeed.y+t*.12);
          float spiral=h*15.708+t+step(.5,aSeed.x)*3.14159;
          float r=.82+sin(h*3.14159)*.42+(aSeed.z-.5)*.045;
          p=vec3(cos(spiral)*r,h*3.1-1.05,sin(spiral)*r); }
        else if(uMode<2.5){ float side=step(.5,aSeed.x)*2.-1.;
          float x=fract(aSeed.x*2.)*1.8;float row=floor(aSeed.y*22.);
          p=vec3(side*x,(row/21.-.5)*2.2,-.46+sin(x/1.8*3.14159)*.27);
          p.y+=sin(t*2.+x*3.)*.018;p.x+=side*sin(t)*.02; }
        else if(uMode<3.5){ float ring=floor(aSeed.y*5.);
          float wave=sin(a*8.-uTime*112./60.*3.14159);
          float r=1.1+ring*.2+wave*(.025+uBeat*.07);
          p=vec3(cos(a)*r,sin(a)*r*.64,(aSeed.z-.5)*.08+wave*.07); }
        else if(uMode<4.5){ float lane=floor(aSeed.x*5.);
          float f=fract(aSeed.y+uTime*.32);float x=(lane-2.)*.57;
          float h=lane<.5?.65:lane<1.5?1.15:lane<2.5?1.7:lane<3.5?1.05:.65;
          if(aSeed.z<.55){p=vec3(mix(x,0.,f),-.86+sin(f*3.14159)*.04,.3+f*.8);}
          else{p=vec3(x,-.9+f*(h+.08),(aSeed.w-.5)*.07);}
        }else if(uMode<5.5){ float r=1.38+(aSeed.y-.5)*.055;
          p=vec3(cos(a+t*.3)*r,sin(a+t*.3)*r*.72+.15,(aSeed.z-.5)*.12-.3); }
        else{ float panel=floor(aSeed.x*5.);float row=floor(aSeed.y*28.);
          p=vec3((panel-2.)*.58+(aSeed.z-.5)*.43,(row/27.-.5)*1.76,
            cos(panel*.7)*.3-.08);p.y+=sin(t*5.+panel*.6)*.1; }
        // A few drifting grains retain the atmosphere around each precise formation.
        if(uMode>.5&&aSeed.w>.86){p=vec3((aSeed.x-.5)*4.4,(aSeed.y-.5)*3.5,(aSeed.z-.5)*2.);
          p.y+=sin(t+aSeed.w*12.)*.08;}
        float gather=smoothstep(0.,1.,uGather);
        float spin=gather*6.283185+a;
        vec3 ember=uPortal+vec3(cos(spin)*.07,(aSeed.y-.5)*.14,sin(spin)*.07);
        p=mix(p,ember,gather);
        p+=vec3(sin(a+gather*8.),cos(a+gather*8.),0.)*sin(gather*3.14159)*.14;
        vec4 mv=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp((1.+aSeed.w*1.5+uBeat*.3+gather)*uSize*7./max(-mv.z,1.),1.,8.);
        vAlpha=(.15+aSeed.z*.55)*uEnergy*(1.+gather*.25); vWarm=aSeed.w; }`,
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
