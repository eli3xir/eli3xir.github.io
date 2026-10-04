import * as THREE from 'three';
import {BULLET,BULLET_COLORS} from './bullet-state.js';
function quad(count){const plane=new THREE.PlaneGeometry(2,2),g=new THREE.InstancedBufferGeometry();g.index=plane.index.clone();g.setAttribute('position',plane.attributes.position.clone());g.setAttribute('uv',plane.attributes.uv.clone());plane.dispose();const offset=new Float32Array(count*4),color=new Float32Array(count*3);g.setAttribute('aOffset',new THREE.InstancedBufferAttribute(offset,4).setUsage(THREE.DynamicDrawUsage));g.setAttribute('aColor',new THREE.InstancedBufferAttribute(color,3).setUsage(THREE.DynamicDrawUsage));g.instanceCount=0;return{g,offset,color};}
export function createBulletField(stage){
 const field=quad(BULLET.capacity),palette=BULLET_COLORS.map(c=>new THREE.Color(c));
 const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,vertexShader:`attribute vec4 aOffset;attribute vec3 aColor;varying vec2 vP;varying vec3 vColor;
 void main(){vP=position.xy;vColor=aColor;float c=cos(aOffset.z),s=sin(aOffset.z);vec2 p=position.xy*vec2(.044,.026);p=mat2(c,s,-s,c)*p;gl_Position=projectionMatrix*modelViewMatrix*vec4(aOffset.xy+p,.23,1.);}`,
 fragmentShader:`varying vec2 vP;varying vec3 vColor;void main(){float r=dot(vP,vP);if(r>1.)discard;vec3 n=vec3(vP,sqrt(max(0.,1.-r)));float light=.35+.65*max(0.,dot(n,normalize(vec3(-.45,.65,1.))));float core=1.-smoothstep(.025,.2,r);vec3 color=mix(vColor*light*1.25,vec3(1.,.96,.84),core*.9);gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(field.g,material);mesh.frustumCulled=false;stage.add(mesh);
 const sparks=quad(32),sparkMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:`attribute vec4 aOffset;attribute vec3 aColor;varying vec2 vP;varying vec3 vColor;varying float vAge;void main(){vP=position.xy;vColor=aColor;vAge=aOffset.w;gl_Position=projectionMatrix*modelViewMatrix*vec4(aOffset.xy+position.xy*aOffset.z,.29,1.);}`,fragmentShader:`varying vec2 vP;varying vec3 vColor;varying float vAge;void main(){float r=length(vP);float a=(1.-smoothstep(.035,.1,abs(r-.78)))*pow(1.-vAge,2.)*.6;if(a<.005)discard;gl_FragColor=vec4(vColor,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`}),rings=new THREE.Mesh(sparks.g,sparkMaterial);rings.frustumCulled=false;stage.add(rings);let previous='';
 function draw(s,data,reduced){const key=[s.tick,s.count,s.serial,s.graze,s.lives,reduced].join(':');if(key===previous)return;previous=key;
  for(let i=0;i<s.count;i++){const j=i*BULLET.stride,c=palette[data[j+4]];field.offset.set([data[j],data[j+1],Math.atan2(data[j+3],data[j+2]),data[j+5]],i*4);field.color.set([c.r,c.g,c.b],i*3);}field.g.instanceCount=s.count;for(const name of ['aOffset','aColor']){const a=field.g.attributes[name];a.clearUpdateRanges();if(s.count)a.addUpdateRange(0,s.count*a.itemSize);a.needsUpdate=true;}
  sparks.g.instanceCount=reduced?0:s.effects.length;if(!reduced)for(let i=0;i<s.effects.length;i++){const e=s.effects[i],age=(s.tick-e.tick)/90,c=palette[e.kind==='hit'?1:2];sparks.offset.set([e.x,e.y,(e.kind==='hit'?.18:.07)+age*.22,age],i*4);sparks.color.set([c.r,c.g,c.b],i*3);}sparks.g.attributes.aOffset.needsUpdate=sparks.g.attributes.aColor.needsUpdate=true;
 }
 return{mesh,rings,field,sparks,draw,invalidate(){previous='';}};
}
