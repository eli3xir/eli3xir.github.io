import * as THREE from 'three';

export const brass = () => new THREE.MeshStandardMaterial({ color: 0xb58a51, metalness: .88, roughness: .27 });
export const ink = () => new THREE.MeshStandardMaterial({ color: 0x171e1d, metalness: .3, roughness: .36 });
export const paper = () => new THREE.MeshStandardMaterial({ color: 0xe7d5ae, roughness: .75, side: THREE.DoubleSide });
export const glass = (color = 0xb9e1d0) => new THREE.MeshPhysicalMaterial({
  color, metalness: 0, roughness: .14, transmission: .72, thickness: .35,
  ior: 1.47, transparent: true, opacity: .96, side: THREE.DoubleSide, depthWrite:false,
  attenuationColor: new THREE.Color(color), attenuationDistance: 2, clearcoat: 1,
});

export function mesh(geometry, material, parent, position = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function ring(parent, radius, tube, y, material = brass()) {
  const object = mesh(new THREE.TorusGeometry(radius, tube, 12, 96), material, parent, [0, y, 0]);
  object.rotation.x = Math.PI / 2;
  return object;
}

export function labelTexture(title, subtitle = 'ELI3XIR / AFTER HOURS', bg = '#e7d7b4') {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#26322b';
  ctx.font = '32px monospace'; ctx.fillText(subtitle, 70, 72);
  ctx.fillRect(70, 102, 880, 2);
  ctx.font = '64px Georgia, "Microsoft YaHei", serif';
  const text = title.length > 20 ? title.slice(0, 19) + '…' : title;
  ctx.fillText(text, 70, 210, 880);
  for (let line = 0; line < 9; line++) {
    ctx.globalAlpha = .28;
    ctx.fillRect(70, 263 + line * 21, 500 + Math.sin(line * 4) * 300, 3);
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function liquidMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uBeat: { value: 0 }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `varying vec3 vNormal; varying vec3 vPosition; uniform float uTime;
      void main(){ vec3 p=position; p.y+=sin(p.x*5.+uTime*1.2)*sin(p.z*4.+uTime)*.018;
        vNormal=normalize(normalMatrix*normal); vPosition=(modelViewMatrix*vec4(p,1.)).xyz;
        gl_Position=projectionMatrix*vec4(vPosition,1.); }`,
    fragmentShader: `varying vec3 vNormal; varying vec3 vPosition;
      uniform vec3 uColor; uniform float uTime; uniform float uBeat;
      void main(){ float edge=pow(1.-abs(dot(normalize(vNormal),normalize(-vPosition))),2.);
        float flow=sin(vPosition.y*12.+sin(vPosition.x*6.+uTime)*2.-uTime*1.8)*.5+.5;
        vec3 c=uColor*(.35+flow*.3+edge*1.8+uBeat*.2);
        gl_FragColor=vec4(c,.97); }`,
    transparent: false,
  });
}

export function disposeGroup(group) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  group.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of [object.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}
