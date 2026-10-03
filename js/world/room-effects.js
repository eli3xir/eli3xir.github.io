import * as THREE from 'three';

/* Keep the existing focused-room potion bubbles and lamp vapor as a GPU field. */
export function createRoomEffects(parent){
  const origins=[[5.36,1.02,-.59],[5.74,1.10,-.44],[6.06,.98,-.55],[6.38,1.10,-.56],[5.88,1.10,-.74]];
  const colors=[0x51e88c,0xb478e8,0x63a4f0,0xe8c858,0xcabfae];
  const count=180;const position=new Float32Array(count*3),origin=new Float32Array(count*3),seed=new Float32Array(count*3),color=new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const mode=i%5;origin.set(origins[mode],i*3);position.set(origins[mode],i*3);
    seed.set([i*.618%1,i*.317%1,mode===4?1:0],i*3);const c=new THREE.Color(colors[mode]);color.set([c.r,c.g,c.b],i*3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));
  geometry.setAttribute('aOrigin',new THREE.BufferAttribute(origin,3));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seed,3));geometry.setAttribute('color',new THREE.BufferAttribute(color,3));
  const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uBeat:{value:0}},
    vertexShader:`attribute vec3 aOrigin,aSeed,color;uniform float uTime,uBeat;varying vec3 vColor;varying float vAlpha;
      void main(){float life=fract(aSeed.x+uTime*(.065+aSeed.z*.04));float a=aSeed.y*6.283+uTime*2.;vec3 p=aOrigin;
        p+=vec3(cos(a)*.045*life,life*(.16+aSeed.z*.16),sin(a)*.025);vColor=color;vAlpha=sin(life*3.14159)*(.7+aSeed.z*-.4);
        vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((8.+aSeed.z*12.)/(-mv.z),1.,16.)*(1.+uBeat*.1);}`,
    fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(vColor,pow(1.-d,2.)*vAlpha);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const points=new THREE.Points(geometry,material);points.visible=false;parent.add(points);
  return {setFocus:id=>{points.visible=id==='lab';},update:(time,beat)=>{material.uniforms.uTime.value=time;material.uniforms.uBeat.value=beat.pulse;}};
}
