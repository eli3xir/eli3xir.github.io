import * as THREE from 'three';
import {galaxyData,GALAXY_RADIUS as R} from './galaxy-density.js';
export function createGalaxyField(){
 const root=new THREE.Group(),data=galaxyData(),map=new THREE.DataTexture(data.density,data.size,data.size,THREE.RGBAFormat);map.minFilter=map.magFilter=THREE.LinearFilter;map.needsUpdate=true;
 const uniforms={densityMap:{value:map},eye:{value:new THREE.Vector3(0,2,5)},band:{value:0},viewport:{value:new THREE.Vector2(1000,1000)}};
 const vertex=`varying vec3 local;void main(){local=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
 const fragment=`precision highp float;uniform sampler2D densityMap;uniform vec3 eye;uniform float band;varying vec3 local;
 vec2 bounds(vec3 ro,vec3 rd){vec3 lo=(vec3(-2.1,-.52,-2.1)-ro)/rd,hi=(vec3(2.1,.52,2.1)-ro)/rd;vec3 near=min(lo,hi),far=max(lo,hi);return vec2(max(max(near.x,near.y),near.z),min(min(far.x,far.y),far.z));}
 void main(){vec3 rd=normalize(local-eye);vec2 hit=bounds(eye,rd);float begin=max(0.,hit.x),end=hit.y;if(end<=begin)discard;float stepSize=(end-begin)/56.;vec3 light=vec3(0.);float transmission=1.;
  for(int i=0;i<56;i++){vec3 p=eye+rd*(begin+(float(i)+.5)*stepSize);vec3 d=texture2D(densityMap,p.xz/4.2+.5).rgb;float height=exp(-abs(p.y)/.065),dust=d.r*exp(-abs(p.y)/.031);float core=exp(-dot(p.xz,p.xz)/.065-p.y*p.y/.013);
   vec3 stars=mix(vec3(1.,.73,.43),vec3(.35,.58,1.),smoothstep(.12,1.3,length(p.xz)))*d.g*height*3.8+mix(vec3(1.,.79,.51),vec3(.35,.66,1.),band)*core*2.+vec3(1.,.12,.24)*d.b*height*.7;
   vec3 infrared=vec3(1.,.23,.035)*dust*7.+vec3(1.,.54,.14)*d.b*height*2.;
   float absorption=dust*mix(13.,1.,band)+d.g*height*2.5;transmission*=exp(-absorption*stepSize*.5);light+=transmission*(stars*mix(1.,.46,band)+infrared*band)*stepSize;transmission*=exp(-absorption*stepSize*.5);
  }
  gl_FragColor=vec4(light,1.-transmission);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
 const hazeMaterial=new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,side:THREE.BackSide,transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor});
 const haze=new THREE.Mesh(new THREE.BoxGeometry(R*2,1.04,R*2),hazeMaterial);haze.renderOrder=1;haze.castShadow=haze.receiveShadow=false;root.add(haze);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(data.colors,3));geometry.setAttribute('detail',new THREE.BufferAttribute(data.detail,2));
 const starsMaterial=new THREE.ShaderMaterial({uniforms,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`uniform sampler2D densityMap;uniform vec3 eye;uniform float band;uniform vec2 viewport;attribute vec2 detail;varying vec3 tint;varying float alpha;
  void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;float raw=.009*detail.x*length(modelViewMatrix[0].xyz)*viewport.y*projectionMatrix[1][1]/max(.1,-mv.z);gl_PointSize=clamp(raw,.75,5.);vec3 dir=normalize(eye-position);float h=abs(position.y);float column=.031*exp(-h/.031);if(position.y*dir.y<0.)column=.062-column;float vertical=abs(dir.y)<.02?(dir.y<0.?-.02:.02):dir.y;vec3 crossing=position+dir*max(0.,-position.y/vertical);float dust=texture2D(densityMap,clamp(crossing.xz/4.2+.5,0.,1.)).r;float attenuation=exp(-dust*mix(13.,1.,band)*column/max(.08,abs(dir.y)));tint=mix(color,mix(vec3(.25,.55,1.),vec3(.58,.76,1.),detail.y),band*.8);alpha=(.16+detail.x*.13)*mix(.4,1.,detail.y)*min(1.,raw*raw)*attenuation*mix(1.,.7,band);}`,
  fragmentShader:`varying vec3 tint;varying float alpha;void main(){float d=length(gl_PointCoord-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(tint,alpha*pow(1.-d,2.));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`});
 const stars=new THREE.Points(geometry,starsMaterial);stars.renderOrder=2;root.add(stars);
 const eye=new THREE.Vector3();function before(renderer,scene,camera){root.updateWorldMatrix(true,false);camera.getWorldPosition(eye);uniforms.eye.value.copy(root.worldToLocal(eye));renderer.getDrawingBufferSize(uniforms.viewport.value);}
 haze.onBeforeRender=stars.onBeforeRender=before;
 return{root,data,stars,haze,uniforms,setBand(value){uniforms.band.value=value;},dispose(){map.dispose();}};
}
