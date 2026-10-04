import * as THREE from 'three';
export function glassLensMaterial(texture,sheet){
 const uniforms={paper:{value:texture},center:{value:new THREE.Vector3()},eye:{value:new THREE.Vector3()},stretch:{value:new THREE.Vector2(1,1)},power:{value:.65}};
 const material=new THREE.ShaderMaterial({uniforms,vertexShader:`varying vec3 surface;varying vec3 lensNormal;uniform vec3 center;uniform vec2 stretch;
 void main(){surface=position*vec3(stretch,.26)+center;lensNormal=normalize(position/vec3(stretch,.26));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec3 surface;varying vec3 lensNormal;uniform sampler2D paper;uniform vec3 eye;uniform float power;
 vec3 through(vec3 incident,vec3 normal,float index){vec3 ray=refract(incident,normal,1./index);float distance=(-.045-surface.z)/min(-.001,ray.z);vec2 uv=(surface+ray*distance).xy/vec2(3.3,2.3375)+.5;return all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.)))?texture2D(paper,uv).rgb:vec3(.018,.029,.024);}
 void main(){vec3 normal=normalize(lensNormal),incident=normalize(surface-eye);float index=1.08+power*.42;vec3 color=vec3(through(incident,normal,index+.003).r,through(incident,normal,index).g,through(incident,normal,index-.003).b);float fresnel=pow(1.-max(0.,dot(-incident,normal)),5.);vec3 reflection=reflect(incident,normal);float strip=pow(max(0.,dot(reflection,normalize(vec3(-.5,.8,1.)))),70.);color=mix(color,vec3(.6,.73,.7),fresnel*.42)+strip*.14;gl_FragColor=vec4(color,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`,side:THREE.FrontSide});
 material.userData.lensUniforms=uniforms;
 return{material,prepare(mesh,renderer,scene,camera){sheet.updateWorldMatrix(true,false);camera.getWorldPosition(uniforms.eye.value);sheet.worldToLocal(uniforms.eye.value);uniforms.center.value.copy(mesh.parent.position);uniforms.stretch.value.set(mesh.parent.scale.x,mesh.parent.scale.y);}};
}
