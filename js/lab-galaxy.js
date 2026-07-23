/* 粒子银河实验：Three.js 旋涡星系（6 万粒子） */
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 200);
camera.position.set(0, 6, 14);

/* ---------- 星系参数 ---------- */
const COUNT = 60000;
const RADIUS = 10;
const BRANCHES = 4;
const SPIN = 1.2;        // 旋臂扭转
const RANDOMNESS = 0.45;
const INNER = new THREE.Color(0xffa040); // 核心橙
const OUTER = new THREE.Color(0x6a4dff); // 边缘紫

const pos = new Float32Array(COUNT * 3);
const col = new Float32Array(COUNT * 3);
const aScale = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  const r = Math.pow(Math.random(), 1.6) * RADIUS;
  const branch = (i % BRANCHES) / BRANCHES * Math.PI * 2;
  const spinA = r * SPIN * 0.35;
  const rx = (Math.random() - 0.5) * RANDOMNESS * r * 0.5;
  const ry = (Math.random() - 0.5) * RANDOMNESS * r * 0.22;
  const rz = (Math.random() - 0.5) * RANDOMNESS * r * 0.5;
  pos[i * 3] = Math.cos(branch + spinA) * r + rx;
  pos[i * 3 + 1] = ry;
  pos[i * 3 + 2] = Math.sin(branch + spinA) * r + rz;

  const c = INNER.clone().lerp(OUTER, r / RADIUS);
  // 轻微明度抖动
  const jitter = 0.85 + Math.random() * 0.3;
  col[i * 3] = c.r * jitter;
  col[i * 3 + 1] = c.g * jitter;
  col[i * 3 + 2] = c.b * jitter;
  aScale[i] = Math.random() < 0.02 ? 3 : 1; // 少量亮星
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
geo.setAttribute('aScale', new THREE.BufferAttribute(aScale, 1));

const mat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexColors: true,
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: 3.2 * Math.min(devicePixelRatio, 2) },
  },
  vertexShader: /* glsl */`
    uniform float uTime;
    uniform float uSize;
    attribute float aScale;
    varying vec3 vColor;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * aScale * (1.0 / -mv.z) * 10.0;
      vColor = color;
    }
  `,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = pow(1.0 - d * 2.0, 2.5);
      gl_FragColor = vec4(vColor, a);
    }
  `,
});
const galaxy = new THREE.Points(geo, mat);
scene.add(galaxy);

// 中心亮核
{
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, 'rgba(255, 220, 160, 0.9)');
  g.addColorStop(0.4, 'rgba(255, 160, 60, 0.35)');
  g.addColorStop(1, 'rgba(255, 160, 60, 0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.set(6, 6, 1);
  scene.add(core);
}

/* ---------- 交互：鼠标视差 + 滚轮缩放 + 点击爆发 ---------- */
let mx = 0, my = 0;
addEventListener('pointermove', (e) => {
  mx = (e.clientX / innerWidth - 0.5) * 2;
  my = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });
let dist = 14;
addEventListener('wheel', (e) => { dist = Math.min(40, Math.max(5, dist + e.deltaY * 0.02)); }, { passive: true });

let spinBoost = 0;
addEventListener('pointerdown', () => { spinBoost = 6; });

const clock = new THREE.Clock();
let angle = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  spinBoost *= 0.94;
  angle += dt * (0.05 + spinBoost * 0.1);
  galaxy.rotation.y = angle;

  camera.position.x = Math.sin(mx * 0.4) * dist;
  camera.position.z = Math.cos(mx * 0.4) * dist;
  camera.position.y += ((6 + my * -4 + dist * 0.15) - camera.position.y) * 0.05;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
}
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
