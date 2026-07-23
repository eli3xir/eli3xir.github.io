/* 登月实验：着陆器软着陆模拟（Three.js） */
import * as THREE from 'three';

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020208);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 2000);

/* ---------- 灯光 ---------- */
scene.add(new THREE.AmbientLight(0x334, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(50, 80, 30);
scene.add(sun);

/* ---------- 星空 ---------- */
{
  const n = 2500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 600 + Math.random() * 600;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = Math.abs(r * Math.cos(p)) - 100;
    pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcdd6ff, size: 1.6, sizeAttenuation: false })));
}

/* ---------- 月球表面（程序化陨石坑纹理） ---------- */
function moonTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const x = c.getContext('2d');
  x.fillStyle = '#9a9aa2';
  x.fillRect(0, 0, 1024, 1024);
  // 噪点
  for (let i = 0; i < 9000; i++) {
    x.fillStyle = `rgba(${100 + Math.random() * 60},${100 + Math.random() * 60},${105 + Math.random() * 60},0.25)`;
    x.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
  }
  // 陨石坑
  for (let i = 0; i < 120; i++) {
    const r = 4 + Math.random() * 42;
    const cx = Math.random() * 1024, cy = Math.random() * 1024;
    const g = x.createRadialGradient(cx, cy, r * 0.3, cx, cy, r);
    g.addColorStop(0, 'rgba(70,70,78,0.85)');
    g.addColorStop(0.75, 'rgba(120,120,128,0.4)');
    g.addColorStop(1, 'rgba(200,200,205,0.5)');
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, r, 0, 6.29); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const MOON_R = 60;
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(MOON_R, 64, 64),
  new THREE.MeshStandardMaterial({ map: moonTexture(), roughness: 0.95, bumpMap: moonTexture(), bumpScale: 0.8 })
);
moon.position.y = -MOON_R - 2;
scene.add(moon);

/* ---------- 地球（远处） ---------- */
{
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(96, 96, 20, 128, 128, 130);
  g.addColorStop(0, '#7ec8ff'); g.addColorStop(0.55, '#2a6fd8'); g.addColorStop(1, '#0a2a66');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  // 云
  for (let i = 0; i < 30; i++) {
    x.fillStyle = 'rgba(255,255,255,0.35)';
    x.beginPath();
    x.ellipse(Math.random() * 256, Math.random() * 256, 14 + Math.random() * 26, 5 + Math.random() * 8, Math.random(), 0, 6.29);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(14, 32, 32), new THREE.MeshBasicMaterial({ map: t }));
  earth.position.set(-160, 90, -260);
  scene.add(earth);
}

/* ---------- 着陆器 ---------- */
const lander = new THREE.Group();
{
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a92c, metalness: 0.7, roughness: 0.35 });
  const gray = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 0.5, roughness: 0.5 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.0, 2.2, 8), gold);
  body.position.y = 2.2;
  lander.add(body);
  const cabin = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.2, 8), gray);
  cabin.position.y = 3.9;
  lander.add(cabin);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12, 0, 6.29, 0, 1.2), gray);
  dish.position.y = 4.8;
  dish.rotation.x = -0.6;
  lander.add(dish);
  // 四条腿
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), gray);
    leg.position.set(Math.cos(a) * 1.7, 1.0, Math.sin(a) * 1.7);
    leg.rotation.z = Math.cos(a) * 0.5;
    leg.rotation.x = -Math.sin(a) * 0.5;
    lander.add(leg);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.15, 8), gold);
    foot.position.set(Math.cos(a) * 2.6, -0.15, Math.sin(a) * 2.6);
    lander.add(foot);
  }
}
scene.add(lander);

/* ---------- 发动机火焰 ---------- */
const flame = new THREE.Mesh(
  new THREE.ConeGeometry(0.7, 3.2, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
);
flame.rotation.x = Math.PI;
flame.position.y = 0.2;
flame.visible = false;
lander.add(flame);
const flameLight = new THREE.PointLight(0x88bbff, 0, 30);
flameLight.position.y = -1;
lander.add(flameLight);

/* ---------- 月尘粒子 ---------- */
const DUST_N = 500;
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DUST_N * 3), 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xb8b8c0, size: 0.35, transparent: true, opacity: 0.9 }));
dust.visible = false;
scene.add(dust);
const dustVel = new Float32Array(DUST_N * 3);
let dustLife = 0;

/* ---------- 相机轨道 ---------- */
let camTheta = 0.6, camPhi = 0.32, camDist = 26, dragging = false, px = 0, py = 0;
addEventListener('pointerdown', (e) => { if (!e.target.closest('.demo-hud,.demo-back')) { dragging = true; px = e.clientX; py = e.clientY; } });
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camTheta -= (e.clientX - px) * 0.005;
  camPhi = Math.min(1.35, Math.max(0.05, camPhi + (e.clientY - py) * 0.005));
  px = e.clientX; py = e.clientY;
});
addEventListener('pointerup', () => (dragging = false));
addEventListener('wheel', (e) => { camDist = Math.min(90, Math.max(10, camDist + e.deltaY * 0.03)); }, { passive: true });

/* ---------- 着陆状态机 ---------- */
const stat = document.getElementById('stat');
const btn = document.getElementById('land-btn');
const SURFACE_Y = -2 + 0.6; // 月面（考虑着陆腿高度）
let mode = 'hover'; // hover | descend | landed
let alt = 60, vy = 0, hoverT = 0;
lander.position.set(0, SURFACE_Y + alt, 0);

btn.addEventListener('click', () => {
  if (mode === 'hover') {
    mode = 'descend';
    btn.disabled = true;
    btn.textContent = '着陆中…';
    flame.visible = true;
  } else if (mode === 'landed') {
    // 重置
    mode = 'hover'; alt = 60; vy = 0;
    dust.visible = false;
    flag.visible = false;
    btn.textContent = '开始着陆';
  }
});

/* ---------- 旗帜 ---------- */
const flag = new THREE.Group();
{
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 6), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
  pole.position.y = 1.5;
  flag.add(pole);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), new THREE.MeshStandardMaterial({ color: 0xe63229, side: THREE.DoubleSide }));
  cloth.position.set(0.85, 2.4, 0);
  flag.add(cloth);
}
flag.position.set(4, -2, 2);
flag.visible = false;
scene.add(flag);

/* ---------- 主循环 ---------- */
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  if (mode === 'hover') {
    hoverT += dt;
    lander.position.y = SURFACE_Y + alt + Math.sin(hoverT * 0.8) * 1.2;
    lander.rotation.y += dt * 0.1;
    stat.textContent = `高度 ${alt.toFixed(0)} m · 待机悬停中`;
  } else if (mode === 'descend') {
    // 软着陆速度曲线：目标速度随高度趋近 0，速度松弛逼近
    const targetV = -Math.max(0.8, Math.sqrt(Math.max(alt, 0)) * 1.4);
    const correction = (targetV - vy) * 2.5;
    vy += correction * dt;
    alt += vy * dt;
    lander.position.y = SURFACE_Y + Math.max(alt, 0);
    // 火焰随修正量闪烁
    const f = Math.min(1.6, 0.5 + Math.abs(correction) * 0.25);
    flame.scale.set(f, f * (0.9 + Math.random() * 0.3), f);
    flameLight.intensity = f * 2;
    stat.textContent = `高度 ${Math.max(alt, 0).toFixed(1)} m · 速度 ${vy.toFixed(1)} m/s`;
    if (alt <= 0) {
      mode = 'landed';
      flame.visible = false;
      flameLight.intensity = 0;
      flag.visible = true;
      // 月尘迸发
      dust.visible = true;
      dustLife = 1;
      const pos = dustGeo.attributes.position.array;
      for (let i = 0; i < DUST_N; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 2;
        pos[i * 3] = lander.position.x + Math.cos(a) * r;
        pos[i * 3 + 1] = SURFACE_Y + Math.random() * 0.3;
        pos[i * 3 + 2] = lander.position.z + Math.sin(a) * r;
        dustVel[i * 3] = Math.cos(a) * (3 + Math.random() * 6);
        dustVel[i * 3 + 1] = 1 + Math.random() * 3.5;
        dustVel[i * 3 + 2] = Math.sin(a) * (3 + Math.random() * 6);
      }
      dustGeo.attributes.position.needsUpdate = true;
      stat.textContent = '🎉 着陆成功！静海基地，这里是 eli3xir';
      btn.disabled = false;
      btn.textContent = '再来一次';
    }
  }

  // 月尘扩散
  if (dust.visible && dustLife > 0) {
    dustLife -= dt * 0.25;
    const pos = dustGeo.attributes.position.array;
    for (let i = 0; i < DUST_N; i++) {
      pos[i * 3] += dustVel[i * 3] * dt;
      pos[i * 3 + 1] += dustVel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += dustVel[i * 3 + 2] * dt;
      dustVel[i * 3 + 1] -= 1.62 * dt; // 月球重力
      if (pos[i * 3 + 1] < SURFACE_Y) pos[i * 3 + 1] = SURFACE_Y;
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.material.opacity = Math.max(0, dustLife);
  }

  // 旗帜飘动
  if (flag.visible) flag.children[1].rotation.y = Math.sin(t * 2) * 0.15;

  // 相机
  if (!dragging && mode !== 'landed') camTheta += dt * 0.05;
  const cy = lander.position.y + Math.sin(camPhi) * camDist * 0.5;
  camera.position.set(
    lander.position.x + Math.cos(camTheta) * Math.cos(camPhi) * camDist,
    cy,
    lander.position.z + Math.sin(camTheta) * Math.cos(camPhi) * camDist
  );
  camera.lookAt(lander.position.x, lander.position.y + 1.5, lander.position.z);

  renderer.render(scene, camera);
}
loop();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
