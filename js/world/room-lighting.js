import * as THREE from 'three';

/* The baked room supplies contact shadows. These small practical lights restore
   the lamp cores and a warm falloff without adding shadow-camera passes. */
export function createRoomLighting(room) {
  const group=new THREE.Group();group.name='practical-light';room.add(group);
  const wash=new THREE.ShaderMaterial({
    uniforms:{uColor:{value:new THREE.Color(0xe7ae63)},uStrength:{value:.08}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uStrength;
      void main(){vec2 p=(vUv-.5)*vec2(2.7,1.4);float glow=exp(-dot(p,p)*4.5);
        gl_FragColor=vec4(uColor*glow*uStrength,glow);}`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
  });
  for(const x of [6.1,3.7]){
    const light=new THREE.PointLight(0xffb86b,.35,4,2);light.position.set(x,1.9,-.42);group.add(light);
    const halo=new THREE.Mesh(new THREE.PlaneGeometry(2.1,3.3),wash);halo.position.set(x,1.9,-.012);group.add(halo);
  }
  return group;
}

export function tuneRoomMaterial(material) {
  // These exact glTF material names belong to the labware group. The source
  // used alpha blending for its shells; preserve their geometry and liquid hues.
  if(material.name==='Material_0'){
    material.transmission=.96;material.opacity=1;material.transparent=false;
    material.depthWrite=true;material.roughness=.075;material.thickness=.015;material.ior=1.46;
    material.emissiveIntensity=0;
  }
  // Opaque liquid is visible in the transmission buffer behind the glass.
  // This is a layered illustration, not a second refractive volume.
  if(/^Material_[123567]$/.test(material.name)){
    material.transmission=0;material.emissiveIntensity=.18;
  }
  // The imported frosted glass had a long optical path that obscured its cores.
  if(material.transmission===1){
    material.transmission=.25;material.opacity=.38;material.transparent=true;
    material.depthWrite=false;material.thickness=.12;material.roughness=.2;
  }
}
