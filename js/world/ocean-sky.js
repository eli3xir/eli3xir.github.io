import * as THREE from 'three';
export function createOceanSky(){
  const material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uSun:{value:new THREE.Vector3(-.55,.28,.8).normalize()}},
    vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vDirection;uniform vec3 uSun;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
      void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);vec3 color=mix(vec3(.61,.68,.62),vec3(.21,.38,.42),pow(h,.45));
        vec2 p=d.xz/max(.15,h)*1.3;float n=noise(p)*.57+noise(p*2.1)*.28+noise(p*4.3)*.15;
        float cloud=smoothstep(.49,.7,n)*smoothstep(.01,.18,h)*(1.-smoothstep(.55,.9,h));color=mix(color,vec3(.84,.81,.70),cloud*.6);
        float sun=max(0.,dot(d,uSun));color+=vec3(1.8,1.35,.7)*pow(sun,900.)+vec3(.14,.09,.025)*pow(sun,18.);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const sky=new THREE.Mesh(new THREE.SphereGeometry(450,32,16),material);sky.name='ocean-sky';sky.frustumCulled=false;return sky;
}
