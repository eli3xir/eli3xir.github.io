/* 大海航行实验：Gerstner 风格波浪 + 帆船驾驶（Three.js） */
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9ec8de, 80, 420);

/* ---------- 灯光 ---------- */
scene.add(new THREE.HemisphereLight(0xd8ecff, 0x2a5a80, 1.3));
const sunLight = new THREE.DirectionalLight(0xfff2d8, 1.6);
sunLight.position.set(60, 120, -80);
scene.add(sunLight);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);

/* ---------- 波浪参数（JS 与 shader 共用） ---------- */
const WAVES = [
  { dir: [1, 0.3], amp: 0.55, len: 22, speed: 1.1 },
  { dir: [0.6, 1], amp: 0.35, len: 13, speed: 1.5 },
  { dir: [-0.4, 0.8], amp: 0.22, len: 8, speed: 2.0 },
  { dir: [0.9, -0.6], amp: 0.12, len: 4.5, speed: 2.6 },
];
function waveH(x, z, t) {
  let h = 0;
  for (const w of WAVES) {
    const k = (Math.PI * 2) / w.len;
    h += w.amp * Math.sin(k * (w.dir[0] * x + w.dir[1] * z) + w.speed * t);
  }
  return h;
}
function waveNormal(x, z, t) {
  const e = 0.6;
  const hL = waveH(x - e, z, t), hR = waveH(x + e, z, t);
  const hD = waveH(x, z - e, t), hU = waveH(x, z + e, t);
  return new THREE.Vector3(hL - hR, 2 * e, hD - hU).normalize();
}

/* ---------- 海面 ---------- */
const oceanUniforms = { uTime: { value: 0 } };
const ocean = new THREE.Mesh(
  new THREE.PlaneGeometry(900, 900, 180, 180),
  new THREE.ShaderMaterial({
    uniforms: oceanUniforms,
    fog: false,
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vPos;
      varying vec3 vNrm;
      float waveH(vec2 p, float t) {
        float h = 0.0;
        ${WAVES.map((w) => `h += ${w.amp.toFixed(3)} * sin(${(Math.PI * 2 / w.len).toFixed(5)} * (${w.dir[0].toFixed(2)} * p.x + ${w.dir[1].toFixed(2)} * p.y) + ${w.speed.toFixed(2)} * t);`).join('\n        ')}
        return h;
      }
      void main() {
        vec3 p = position;
        float h = waveH(p.xy, uTime);
        p.z += h;
        float e = 0.6;
        float hL = waveH(p.xy - vec2(e, 0.0), uTime);
        float hR = waveH(p.xy + vec2(e, 0.0), uTime);
        float hD = waveH(p.xy - vec2(0.0, e), uTime);
        float hU = waveH(p.xy + vec2(0.0, e), uTime);
        vNrm = normalize(vec3(hL - hR, 2.0 * e, hD - hU));
        vPos = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vPos;
      varying vec3 vNrm;
      void main() {
        vec3 deep = vec3(0.02, 0.18, 0.35);
        vec3 shallow = vec3(0.15, 0.55, 0.75);
        vec3 n = normalize(vNrm);
        float fres = pow(1.0 - max(n.z, 0.0), 2.0);
        vec3 col = mix(deep, shallow, fres * 0.9 + 0.15);
        // 阳光高光
        vec3 sunDir = normalize(vec3(0.4, 0.7, 0.3));
        float spec = pow(max(dot(reflect(-sunDir, n), vec3(0.0, 0.0, 1.0)), 0.0), 40.0);
        col += vec3(1.0, 0.95, 0.8) * spec * 0.6;
        // 远处雾化
        float d = length(vPos.xz);
        col = mix(col, vec3(0.62, 0.78, 0.87), smoothstep(80.0, 420.0, d));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
);
ocean.rotation.x = -Math.PI / 2;
scene.add(ocean);

/* ---------- 天空：渐变穹顶 + 太阳 + 云 ---------- */
scene.background = new THREE.Color(0x9ec8de);
{
  // 太阳
  const sun = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0xfff3c8, fog: false }));
  sun.position.set(120, 130, -350);
  sun.lookAt(camera.position);
  scene.add(sun);
  // 云（canvas 椭圆组合）
  function cloudTex() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    for (let i = 0; i < 9; i++) {
      const g = x.createRadialGradient(60 + Math.random() * 130, 60 + Math.random() * 30, 5, 80 + Math.random() * 60, 64, 34 + Math.random() * 22);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 256, 128);
    }
    const t = new THREE.CanvasTexture(c);
    return t;
  }
  const ct = cloudTex();
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct, transparent: true, opacity: 0.85, fog: false }));
    sp.position.set((Math.random() - 0.5) * 600, 70 + Math.random() * 60, -250 - Math.random() * 150);
    sp.scale.set(90 + Math.random() * 70, 40 + Math.random() * 25, 1);
    scene.add(sp);
  }
}

/* ---------- 帆船 ---------- */
const boat = new THREE.Group();
{
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.7 });
  // 船体
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.5, 4.6, 8, 1), hullMat);
  hull.rotation.z = Math.PI / 2;
  hull.rotation.y = Math.PI / 2;
  hull.scale.set(1, 1, 0.55);
  boat.add(hull);
  // 甲板
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 1.4), new THREE.MeshStandardMaterial({ color: 0xb5894d, roughness: 0.8 }));
  deck.position.y = 0.45;
  boat.add(deck);
  // 桅杆
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.2, 6), hullMat);
  mast.position.y = 3;
  boat.add(mast);
  // 主帆
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0);
  sailShape.lineTo(2.2, 0.4);
  sailShape.lineTo(0, 4.4);
  sailShape.lineTo(0, 0);
  const sail = new THREE.Mesh(
    new THREE.ShapeGeometry(sailShape),
    new THREE.MeshStandardMaterial({ color: 0xf5f0e0, side: THREE.DoubleSide, roughness: 0.9 })
  );
  sail.position.set(0.1, 0.6, 0);
  sail.rotation.y = Math.PI / 2;
  boat.add(sail);
  // 船旗
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), new THREE.MeshBasicMaterial({ color: 0xe63229, side: THREE.DoubleSide }));
  flag.position.set(0.4, 5.5, 0);
  boat.add(flag);
  boat.userData.flag = flag;
}
scene.add(boat);

/* ---------- 海鸥 ---------- */
const gulls = [];
{
  const gullMat = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const w1 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), gullMat);
    const w2 = w1.clone();
    w1.position.x = -0.5; w2.position.x = 0.5;
    w1.rotation.z = 0.35; w2.rotation.z = -0.35;
    g.add(w1, w2);
    g.userData = { r: 30 + Math.random() * 40, h: 14 + Math.random() * 12, ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.3 };
    scene.add(g);
    gulls.push(g);
  }
}

/* ---------- 控制 ---------- */
const keys = {};
addEventListener('keydown', (e) => (keys[e.code] = true));
addEventListener('keyup', (e) => (keys[e.code] = false));
let speed = 0, heading = 0;
// 拖拽环视
let camYaw = 0, camPitch = 0.25, dragging = false, px = 0, py = 0;
addEventListener('pointerdown', (e) => { if (!e.target.closest('.demo-hud,.demo-back')) { dragging = true; px = e.clientX; py = e.clientY; } });
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - px) * 0.006;
  camPitch = Math.min(1.2, Math.max(0.05, camPitch + (e.clientY - py) * 0.005));
  px = e.clientX; py = e.clientY;
});
addEventListener('pointerup', () => (dragging = false));

/* ---------- 主循环 ---------- */
const stat = document.getElementById('stat');
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();
  oceanUniforms.uTime.value = t;

  // 驾船
  if (keys.KeyW) speed = Math.min(8, speed + 3 * dt);
  if (keys.KeyS) speed = Math.max(0, speed - 4 * dt);
  if (keys.KeyA) heading += (0.5 + speed * 0.08) * dt;
  if (keys.KeyD) heading -= (0.5 + speed * 0.08) * dt;
  boat.position.x += Math.sin(heading) * speed * dt;
  boat.position.z += Math.cos(heading) * speed * dt;
  boat.rotation.y = heading;

  // 波浪贴合：高度 + 俯仰/横滚
  const bx = boat.position.x, bz = boat.position.z;
  // 注意：海面平面旋转过，世界坐标 (x, z) 对应平面 (x, -z)
  const h = waveH(bx, -bz, t);
  boat.position.y = h * 0.9;
  const n = waveNormal(bx, -bz, t);
  boat.rotation.x = n.z * 0.8;
  boat.rotation.z = -n.x * 0.8;
  boat.userData.flag.rotation.y = Math.sin(t * 4) * 0.3;

  // 海鸥绕船盘旋
  for (const g of gulls) {
    const u = g.userData;
    u.ph += u.sp * dt;
    g.position.set(bx + Math.cos(u.ph) * u.r, u.h + Math.sin(t + u.ph) * 1.5, bz + Math.sin(u.ph) * u.r);
    g.rotation.y = -u.ph;
    g.children[0].rotation.z = 0.35 + Math.sin(t * 6 + u.ph) * 0.3;
    g.children[1].rotation.z = -0.35 - Math.sin(t * 6 + u.ph) * 0.3;
  }

  // 跟随相机
  const camDist = 14;
  const tx = bx - Math.sin(heading + camYaw) * camDist * Math.cos(camPitch);
  const tz = bz - Math.cos(heading + camYaw) * camDist * Math.cos(camPitch);
  const ty = boat.position.y + 3 + Math.sin(camPitch) * camDist;
  camera.position.lerp(new THREE.Vector3(tx, ty, tz), 0.06);
  camera.lookAt(bx, boat.position.y + 2.5, bz);

  stat.textContent = `航速 ${(speed * 1.94).toFixed(1)} 节 · 航向 ${(((-heading * 180 / Math.PI) % 360 + 360) % 360).toFixed(0)}°`;

  renderer.render(scene, camera);
}
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
