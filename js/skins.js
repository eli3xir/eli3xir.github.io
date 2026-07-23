/* ============================================================
 * 皮肤中心引擎：可搜索/筛选/切换的多渲染器皮肤系统
 * 渲染器：shader-flow（星云/四季）、minions、lowpoly、vibe、seasonal
 * ============================================================ */
import * as THREE from 'three';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================================================================
 * 皮肤定义
 * ================================================================ */
const SKINS = [
  {
    id: 'auto', name: '四季予你', short: '季',
    tags: ['默认', '自动', '季节', '节日'],
    desc: '按月份自动换春夏秋冬，传统节日自动限定',
    css: null, // 动态（四季各自的 css）
    renderer: 'seasonal',
  },
  {
    id: 'geek', name: '星云极客', short: '星',
    tags: ['暗色', '经典', '紫'],
    desc: '最初的蓝紫星云，纯粹的极客风',
    css: { bg: '#0a0a0f', fg: '#e8e6f0', muted: '#8a8798', accent: '#7c5cff', accent2: '#00e5c0' },
    shader: { base: 0x0a0a0f, sign: 1, colA: 0x7c5cff, colB: 0x00e5c0, variant: 0 },
    renderer: 'stars',
  },
  {
    id: 'minions', name: '小黄人', short: '黄',
    tags: ['可爱', '黄色', '香蕉'],
    desc: '满屏小黄人和香蕉，点一下会跳起来',
    css: { bg: '#ffd93b', fg: '#33302a', muted: '#7a6c3a', accent: '#2e6fd8', accent2: '#c26a00' },
    renderer: 'minions',
  },
  {
    id: 'lowpoly', name: '低多边形', short: '低',
    tags: ['极简', '交互', '3D', '力反馈'],
    desc: 'Low poly 极简几何，点击产生力反馈冲击',
    css: { bg: '#f2f1ee', fg: '#2c2c34', muted: '#8b8b95', accent: '#e0637c', accent2: '#5a9e8f' },
    renderer: 'lowpoly',
  },
  {
    id: 'vibe', name: 'Vibe Coding', short: 'V',
    tags: ['极客', '代码', 'AI', '弹幕'],
    desc: 'Claude / Codex 图标 + 代码弹幕，戳图标蹦弹幕',
    css: { bg: '#0d1117', fg: '#e6edf3', muted: '#8b949e', accent: '#d97757', accent2: '#58a6ff' },
    renderer: 'vibe',
  },
];

/* ================================================================
 * 四季 & 节日（auto 皮肤专用，复用原主题引擎数据）
 * ================================================================ */
const SEASON_THEMES = {
  spring: { label: '春', particle: 'petal', css: { bg: '#f7edf1', fg: '#3c2531', muted: '#8a6b78', accent: '#e2548a', accent2: '#5d9c59' }, shader: { base: 0xf7edf1, sign: -1, colA: 0xe2548a, colB: 0x5d9c59, variant: 0 } },
  summer: { label: '夏', particle: 'firefly', css: { bg: '#08252e', fg: '#d9f2f2', muted: '#6d9aa3', accent: '#18c8c0', accent2: '#ffb340' }, shader: { base: 0x08252e, sign: 1, colA: 0x18c8c0, colB: 0xffb340, variant: 1 } },
  autumn: { label: '秋', particle: 'leaf', css: { bg: '#f5ecdf', fg: '#3d2c17', muted: '#937a58', accent: '#d9692b', accent2: '#a5852a' }, shader: { base: 0xf5ecdf, sign: -1, colA: 0xd9692b, colB: 0xa5852a, variant: 2 } },
  winter: { label: '冬', particle: 'snow', css: { bg: '#eef3f9', fg: '#22334a', muted: '#6c7f97', accent: '#4a7fd6', accent2: '#7fb3d9' }, shader: { base: 0xeef3f9, sign: -1, colA: 0x4a7fd6, colB: 0x7fb3d9, variant: 3 } },
  chunjie: { label: '春节', particle: 'firework', css: { bg: '#170b0b', fg: '#f6e7d4', muted: '#a08472', accent: '#e63229', accent2: '#f5b942' }, shader: { base: 0x170b0b, sign: 1, colA: 0xe63229, colB: 0xf5b942, variant: 1 } },
  yuanxiao: { label: '元宵', particle: 'lantern', css: { bg: '#190d12', fg: '#f6e3d8', muted: '#a38790', accent: '#ff5a4e', accent2: '#ffb84d' }, shader: { base: 0x190d12, sign: 1, colA: 0xff5a4e, colB: 0xffb84d, variant: 2 } },
  duanwu: { label: '端午', particle: 'leaf', css: { bg: '#0c1710', fg: '#e2f0df', muted: '#7d9a82', accent: '#2d9d5f', accent2: '#a4c24a' }, shader: { base: 0x0c1710, sign: 1, colA: 0x2d9d5f, colB: 0xa4c24a, variant: 3 } },
  zhongqiu: { label: '中秋', particle: 'osmanthus', css: { bg: '#0b1026', fg: '#e8e9f5', muted: '#8a8fb0', accent: '#f0c14b', accent2: '#6a8dff' }, shader: { base: 0x0b1026, sign: 1, colA: 0xf0c14b, colB: 0x6a8dff, variant: 0 } },
};
const FESTIVALS = [
  { key: 'chunjie',  dates: { 2026: [2,17], 2027: [2,6], 2028: [1,26], 2029: [2,13], 2030: [2,3] },  window: 4 },
  { key: 'yuanxiao', dates: { 2026: [3,3],  2027: [2,20], 2028: [2,9],  2029: [2,27], 2030: [2,17] }, window: 2 },
  { key: 'duanwu',   dates: { 2026: [6,19], 2027: [6,9],  2028: [5,28], 2029: [6,16], 2030: [6,5] },  window: 3 },
  { key: 'zhongqiu', dates: { 2026: [9,25], 2027: [9,15], 2028: [10,3], 2029: [9,22], 2030: [9,12] }, window: 3 },
];
function activeFestival() {
  const now = new Date();
  const y = now.getFullYear();
  const today = new Date(y, now.getMonth(), now.getDate());
  for (const f of FESTIVALS) {
    const d = f.dates[y];
    if (!d) continue;
    const start = new Date(y, d[0] - 1, d[1]);
    const end = new Date(start);
    end.setDate(end.getDate() + f.window);
    if (today >= start && today <= end) return f.key;
  }
  return null;
}
function seasonOfMonth(m) {
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/* ================================================================
 * 渲染器公共：全屏 canvas 管理
 * ================================================================ */
let activeRenderer = null; // { stop() }
const R = Math.random;
function makeCanvas(z) {
  const c = document.createElement('canvas');
  c.style.cssText = `position:fixed;inset:0;width:100vw;height:100vh;z-index:${z};pointer-events:none`;
  document.body.appendChild(c);
  return c;
}
function fitCanvas(c) {
  const dpr = Math.min(devicePixelRatio, 2);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  return dpr;
}

/* ---------------- 季节粒子渲染器（花瓣/萤火/落叶/雪/烟花/灯笼/桂花/星空） ---------------- */
function seasonalRenderer(particleType) {
  const canvas = makeCanvas(-1);
  const ctx = canvas.getContext('2d');
  let dpr = fitCanvas(canvas);
  let W = canvas.width, H = canvas.height;
  const onResize = () => { dpr = fitCanvas(canvas); W = canvas.width; H = canvas.height; };
  window.addEventListener('resize', onResize);

  let particles = [];
  let fireworkTimer = 0;

  function spawn(type) {
    const x = R() * W, y = R() * H;
    switch (type) {
      case 'petal': return { x, y: -20 + R() * H, s: (4 + R() * 5) * dpr, vy: (0.4 + R() * 0.7) * dpr, ph: R() * 6.28, rot: R() * 6.28, vr: (R() - 0.5) * 0.04, hue: 330 + R() * 20 };
      case 'leaf': return { x, y: -20 + R() * H, s: (5 + R() * 6) * dpr, vy: (0.5 + R() * 0.8) * dpr, ph: R() * 6.28, rot: R() * 6.28, vr: (R() - 0.5) * 0.05, hue: 15 + R() * 30 };
      case 'snow': return { x, y: -10 + R() * H, s: (1.5 + R() * 2.5) * dpr, vy: (0.4 + R() * 0.8) * dpr, ph: R() * 6.28, o: 0.4 + R() * 0.6 };
      case 'firefly': return { x, y, s: (1.5 + R() * 2) * dpr, ph: R() * 6.28, vx: (R() - 0.5) * 0.4 * dpr, vy: (R() - 0.5) * 0.4 * dpr, o: R() };
      case 'osmanthus': return { x, y: -10 + R() * H, s: (2 + R() * 2.5) * dpr, vy: (0.25 + R() * 0.4) * dpr, ph: R() * 6.28, o: 0.5 + R() * 0.5 };
      case 'lantern': return { x, y: H + 40 * R(), s: (10 + R() * 14) * dpr, vy: -(0.3 + R() * 0.5) * dpr, ph: R() * 6.28, o: 0.5 + R() * 0.5 };
      case 'stars': return { x, y, s: (0.8 + R() * 1.8) * dpr, ph: R() * 6.28, o: 0.3 + R() * 0.7 };
      default: return { x, y };
    }
  }
  function burst(x, y, c1, c2) {
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26 + R() * 0.3;
      const sp = (2 + R() * 4) * dpr;
      particles.push({ fx: true, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: 0.012 + R() * 0.015, s: (1.5 + R() * 2) * dpr, color: R() < 0.5 ? c1 : c2 });
    }
  }

  const want = { petal: 26, leaf: 22, snow: 90, firefly: 30, osmanthus: 40, lantern: 10, stars: 120, firework: 0 }[particleType] || 0;
  for (let i = 0; i < want; i++) particles.push(spawn(particleType));

  let raf = null, last = 0;
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    const dt = ts - last; last = ts;
    ctx.clearRect(0, 0, W, H);

    if (particleType === 'firework') {
      fireworkTimer -= dt;
      if (fireworkTimer <= 0) {
        fireworkTimer = 1400 + R() * 1800;
        burst(W * (0.15 + R() * 0.7), H * (0.1 + R() * 0.4), '#e63229', '#f5b942');
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.fx) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05 * dpr; p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s * p.life, 0, 6.29); ctx.fill();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        continue;
      }
      p.ph += 0.02;
      switch (particleType) {
        case 'petal': case 'leaf':
          p.y += p.vy; p.x += Math.sin(p.ph) * 0.8 * dpr; p.rot += p.vr;
          if (p.y > H + 20) { p.y = -20; p.x = R() * W; }
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(p.ph) * 0.4);
          ctx.fillStyle = `hsla(${p.hue}, 70%, ${particleType === 'petal' ? 72 : 55}%, 0.85)`;
          ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.29); ctx.fill();
          ctx.restore();
          break;
        case 'snow':
          p.y += p.vy; p.x += Math.sin(p.ph) * 0.5 * dpr;
          if (p.y > H + 10) { p.y = -10; p.x = R() * W; }
          ctx.globalAlpha = p.o; ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.29); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        case 'firefly': {
          p.x += p.vx + Math.sin(p.ph * 0.7) * 0.3 * dpr;
          p.y += p.vy + Math.cos(p.ph * 0.6) * 0.3 * dpr;
          if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
          const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.ph * 2));
          ctx.globalAlpha = glow; ctx.fillStyle = '#ffe98a';
          ctx.shadowColor = '#ffb340'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.29); ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          break;
        }
        case 'osmanthus':
          p.y += p.vy; p.x += Math.sin(p.ph) * 0.4 * dpr;
          if (p.y > H + 10) { p.y = -10; p.x = R() * W; }
          ctx.globalAlpha = p.o; ctx.fillStyle = '#f0c14b';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.29); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        case 'lantern':
          p.y += p.vy; p.x += Math.sin(p.ph) * 0.5 * dpr;
          if (p.y < -60) { p.y = H + 60; p.x = R() * W; }
          ctx.globalAlpha = p.o * 0.9; ctx.fillStyle = '#ff5a4e';
          ctx.shadowColor = '#ffb84d'; ctx.shadowBlur = 24;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * 0.75, p.s, 0, 0, 6.29); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#ffb84d';
          ctx.fillRect(p.x - p.s * 0.3, p.y - p.s - 3 * dpr, p.s * 0.6, 4 * dpr);
          ctx.globalAlpha = 1;
          break;
        case 'stars': {
          const tw = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.ph * 1.5));
          ctx.globalAlpha = p.o * tw;
          ctx.fillStyle = '#cdd6ff';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.29); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
  }
  if (!reduced) { last = performance.now(); raf = requestAnimationFrame(loop); }
  return {
    stop() { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); canvas.remove(); },
  };
}

/* ---------------- 小黄人渲染器 ---------------- */
function minionsRenderer() {
  const canvas = makeCanvas(-1);
  canvas.style.pointerEvents = 'none';
  const ctx = canvas.getContext('2d');
  let dpr = fitCanvas(canvas);
  let W = canvas.width, H = canvas.height;
  const onResize = () => { dpr = fitCanvas(canvas); W = canvas.width; H = canvas.height; };
  window.addEventListener('resize', onResize);

  const actors = [];
  const N_MINIONS = 12, N_BANANAS = 9;
  for (let i = 0; i < N_MINIONS; i++) {
    actors.push({
      kind: 'minion', x: R() * W, y: R() * H,
      s: (26 + R() * 20) * dpr,
      vx: (R() - 0.5) * 1.2 * dpr, vy: (R() - 0.5) * 1.2 * dpr,
      rot: (R() - 0.5) * 0.4, vr: (R() - 0.5) * 0.01,
      jump: 0, ph: R() * 6.28,
    });
  }
  for (let i = 0; i < N_BANANAS; i++) {
    actors.push({
      kind: 'banana', x: R() * W, y: R() * H,
      s: (14 + R() * 12) * dpr,
      vx: (R() - 0.5) * 0.8 * dpr, vy: (R() - 0.5) * 0.8 * dpr,
      rot: R() * 6.28, vr: (R() - 0.5) * 0.03,
    });
  }

  function drawMinion(a) {
    const s = a.s;
    ctx.save();
    ctx.translate(a.x, a.y - a.jump);
    ctx.rotate(a.rot + Math.sin(a.ph) * 0.08);
    // 身体（黄色胶囊）
    ctx.fillStyle = '#ffd93b';
    ctx.beginPath(); ctx.roundRect(-s * 0.5, -s * 0.8, s, s * 1.6, s * 0.5); ctx.fill();
    // 蓝色背带裤
    ctx.fillStyle = '#2e6fd8';
    ctx.beginPath(); ctx.roundRect(-s * 0.5, s * 0.15, s, s * 0.65, [0, 0, s * 0.5, s * 0.5]); ctx.fill();
    ctx.fillRect(-s * 0.42, -s * 0.05, s * 0.16, s * 0.3); // 左背带
    ctx.fillRect(s * 0.26, -s * 0.05, s * 0.16, s * 0.3);  // 右背带
    // 护目镜头带
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(-s * 0.5, -s * 0.42, s, s * 0.2);
    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -s * 0.32, s * 0.24, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#7a4a21';
    ctx.beginPath(); ctx.arc(0, -s * 0.32, s * 0.12, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(0, -s * 0.32, s * 0.06, 0, 6.29); ctx.fill();
    // 微笑
    ctx.strokeStyle = '#8a6d1f';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath(); ctx.arc(0, s * 0.02, s * 0.18, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.restore();
  }
  function drawBanana(a) {
    const s = a.s;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.strokeStyle = '#f5c518';
    ctx.lineWidth = s * 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.9, 0.5, Math.PI - 0.4); ctx.stroke();
    ctx.strokeStyle = '#c89b12';
    ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.9, 0.5, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -s * 0.4, s * 0.9, Math.PI - 0.9, Math.PI - 0.4); ctx.stroke();
    ctx.restore();
  }

  // 点击小黄人 → 起跳旋转（命中检测）
  const onClick = (e) => {
    const x = e.clientX * dpr, y = e.clientY * dpr;
    for (const a of actors) {
      if (a.kind !== 'minion') continue;
      if (Math.abs(x - a.x) < a.s && Math.abs(y - (a.y - a.jump)) < a.s * 1.2) {
        a.jump = 1; a.vr = 0.25; // 跳跃进度 + 高速旋转
      }
    }
  };
  window.addEventListener('pointerdown', onClick);

  let raf = null;
  function loop() {
    raf = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, W, H);
    for (const a of actors) {
      a.ph = (a.ph || 0) + 0.03;
      a.x += a.vx; a.y += a.vy; a.rot += a.vr;
      if (a.x < -60) a.x = W + 60; if (a.x > W + 60) a.x = -60;
      if (a.y < -60) a.y = H + 60; if (a.y > H + 60) a.y = -60;
      if (a.jump > 0) { // 抛物线跳跃
        a.jump += (60 - a.jump) * 0.18;
        if (a.jump > 55) { a.jump = 0; a.vr = (R() - 0.5) * 0.01; a.rot = (R() - 0.5) * 0.4; }
      }
      if (a.kind === 'minion') drawMinion(a); else drawBanana(a);
    }
  }
  if (!reduced) raf = requestAnimationFrame(loop);
  else { actors.forEach((a) => (a.kind === 'minion' ? drawMinion(a) : drawBanana(a))); }
  return {
    stop() { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); window.removeEventListener('pointerdown', onClick); canvas.remove(); },
  };
}

/* ---------------- Low Poly 力反馈渲染器 ---------------- */
function lowpolyRenderer() {
  const canvas = makeCanvas(-2); // 替代 WebGL 背景层
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
  camera.position.z = 14;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.4));
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(4, 6, 8);
  scene.add(dir);

  const PASTEL = [0xe0637c, 0x5a9e8f, 0xf2b33d, 0x6a8dff, 0x9c6ade, 0x54c1de];
  const GEOS = [
    () => new THREE.IcosahedronGeometry(1 + R() * 0.8, 0),
    () => new THREE.ConeGeometry(0.8 + R() * 0.5, 1.6 + R(), 5),
    () => new THREE.OctahedronGeometry(0.9 + R() * 0.6, 0),
    () => new THREE.TorusGeometry(0.9, 0.35, 5, 8),
    () => new THREE.DodecahedronGeometry(0.8 + R() * 0.5, 0),
  ];
  const shapes = [];
  for (let i = 0; i < 12; i++) {
    const geo = GEOS[i % GEOS.length]();
    const mat = new THREE.MeshStandardMaterial({ color: PASTEL[i % PASTEL.length], flatShading: true, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    const home = new THREE.Vector3((R() - 0.5) * 20, (R() - 0.5) * 10, (R() - 0.5) * 6 - 1);
    mesh.position.copy(home);
    mesh.rotation.set(R() * 3, R() * 3, R() * 3);
    scene.add(mesh);
    shapes.push({
      mesh, home,
      vel: new THREE.Vector3(),
      spin: new THREE.Vector3((R() - 0.5) * 0.008, (R() - 0.5) * 0.008, (R() - 0.5) * 0.008),
      ph: R() * 6.28,
      squash: 0,
    });
  }

  // 力反馈：点击产生径向冲击 + 挤压回弹 + 镜头震动
  let shake = 0;
  const ndc = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  const onClick = (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1, 0.5);
    ray.setFromCamera(ndc, camera);
    ray.ray.intersectPlane(plane, hit);
    for (const s of shapes) {
      const d = s.mesh.position.clone().sub(hit);
      const dist = Math.max(d.length(), 1);
      d.normalize().multiplyScalar(9 / dist);
      s.vel.add(d);
      s.squash = 1;
    }
    shake = 0.5;
  };
  window.addEventListener('pointerdown', onClick);

  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  window.addEventListener('resize', onResize);

  let raf = null;
  const clock = new THREE.Clock();
  function loop() {
    raf = requestAnimationFrame(loop);
    const t = clock.getElapsedTime();
    for (const s of shapes) {
      s.vel.multiplyScalar(0.9);
      s.mesh.position.add(s.vel);
      // 缓慢回位 + 原本漂浮
      s.mesh.position.lerp(s.home.clone().add(new THREE.Vector3(0, Math.sin(t * 0.6 + s.ph) * 0.5, 0)), 0.04);
      s.mesh.rotation.x += s.spin.x + s.vel.length() * 0.02;
      s.mesh.rotation.y += s.spin.y + s.vel.length() * 0.02;
      // 挤压回弹
      if (s.squash > 0.01) {
        const q = 1 - 0.35 * s.squash;
        s.mesh.scale.set(2 - q * q, q * q, q); // 粗略的拉伸形变
        s.squash *= 0.88;
      } else {
        s.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
      }
    }
    // 镜头震动衰减
    if (shake > 0.01) {
      camera.position.x = (R() - 0.5) * shake;
      camera.position.y = (R() - 0.5) * shake;
      shake *= 0.85;
    } else {
      camera.position.x *= 0.8; camera.position.y *= 0.8;
    }
    renderer.render(scene, camera);
  }
  if (!reduced) raf = requestAnimationFrame(loop);
  else renderer.render(scene, camera);
  return {
    stop() {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', onClick);
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
      renderer.dispose();
      canvas.remove();
    },
  };
}

/* ---------------- Vibe Coding 渲染器（logo + 代码弹幕） ---------------- */
function vibeRenderer() {
  const LINES = [
    'const vibe = await code();', 'git push --force-with-lease', 'rm -rf node_modules && npm i',
    'console.log("AI 写的，别问我")', 'TODO: 以后再说', 'if (itWorks) dontTouch();',
    'npm install everything', 'sudo make me a sandwich', 'while(alive) { code(); }',
    'throw new VibeError("太好了")', 'kubectl delete pod --all', 'docker run -it vibes:latest',
    'SELECT * FROM bugs WHERE 1=1;', 'ffmpeg -i input.mp4 vibes.gif', 'ping anthropic.com',
    'curl -X POST /v1/feelings', 'systemctl restart brain', 'pip install 灵感',
    'cargo build --release --vibes', 'echo "又是不写注释的一天"',
  ];
  const canvas = makeCanvas(-1);
  const ctx = canvas.getContext('2d');
  let dpr = fitCanvas(canvas);
  let W = canvas.width, H = canvas.height;
  const onResize = () => { dpr = fitCanvas(canvas); W = canvas.width; H = canvas.height; };
  window.addEventListener('resize', onResize);

  const danmaku = [];
  let spawnTimer = 0;
  function spawnDanmaku(x, y, burst) {
    const lane = y ?? (H * 0.08 + R() * H * 0.84);
    danmaku.push({
      text: LINES[(R() * LINES.length) | 0],
      x: x ?? W + 20,
      y: lane,
      vx: (1.2 + R() * 1.8) * dpr * (burst ? 1.6 : 1),
      size: (burst ? 17 + R() * 6 : 13 + R() * 4) * dpr,
      color: burst ? '#d97757' : ['#58a6ff', '#8b949e', '#7ee8c7', '#d97757'][(R() * 4) | 0],
      life: 1,
    });
  }

  // 漂浮的 Claude / Codex 图标
  const logos = [];
  const logoDefs = [
    { urls: ['https://cdn.simpleicons.org/claude/D97757', 'https://cdn.jsdelivr.net/npm/simple-icons@15/icons/claude.svg'], name: 'Claude', x: 0.78, y: 0.3, tint: 'invert(52%) sepia(63%) saturate(747%) hue-rotate(327deg)' },
    { urls: ['https://cdn.simpleicons.org/openai/58a6ff', 'https://cdn.jsdelivr.net/npm/simple-icons@15/icons/openai.svg'], name: 'Codex', x: 0.86, y: 0.62, tint: 'invert(65%) sepia(30%) saturate(600%) hue-rotate(180deg)' },
  ];
  for (const def of logoDefs) {
    const el = document.createElement('div');
    el.className = 'vibe-logo';
    el.style.cssText = `position:fixed;z-index:5;width:56px;height:56px;border-radius:16px;
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);
      display:flex;align-items:center;justify-content:center;cursor:pointer;
      backdrop-filter:blur(6px);transition:transform 0.2s`;
    const img = document.createElement('img');
    let urlIdx = 0;
    img.src = def.urls[0];
    img.alt = def.name;
    img.width = 34; img.height = 34;
    img.onerror = () => {
      urlIdx++;
      if (urlIdx < def.urls.length) { img.style.filter = def.tint; img.src = def.urls[urlIdx]; }
      else { img.remove(); el.textContent = def.name; el.style.color = '#d97757'; el.style.fontWeight = '700'; el.style.fontSize = '13px'; }
    };
    el.appendChild(img);
    el.title = `戳一下 ${def.name}，蹦一句代码弹幕`;
    el.addEventListener('pointerenter', () => { el.style.transform = 'scale(1.15)'; });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      for (let i = 0; i < 5; i++) spawnDanmaku(e.clientX * dpr, (e.clientY + (R() - 0.5) * 120) * dpr, true);
      el.style.transform = 'scale(0.85)';
      setTimeout(() => { el.style.transform = 'scale(1.15)'; }, 150);
    });
    document.body.appendChild(el);
    logos.push({ el, bx: def.x, by: def.y, ph: R() * 6.28 });
  }

  let raf = null, last = 0;
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    const dt = ts - last; last = ts;
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnTimer = 900 + R() * 1200; spawnDanmaku(); }

    // 图标漂浮
    for (const l of logos) {
      l.ph += 0.008;
      l.el.style.left = `calc(${l.bx * 100}vw + ${Math.sin(l.ph) * 22}px)`;
      l.el.style.top = `calc(${l.by * 100}vh + ${Math.cos(l.ph * 0.8) * 18}px)`;
    }

    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'middle';
    for (let i = danmaku.length - 1; i >= 0; i--) {
      const d = danmaku[i];
      d.x -= d.vx;
      if (d.x < -W * 0.5) { danmaku.splice(i, 1); continue; }
      ctx.font = `${d.size}px "JetBrains Mono", Consolas, monospace`;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  }
  if (!reduced) { last = performance.now(); raf = requestAnimationFrame(loop); }
  return {
    stop() { if (raf) cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); logos.forEach((l) => l.el.remove()); canvas.remove(); },
  };
}

/* ================================================================
 * 皮肤引擎核心
 * ================================================================ */
let currentSkin = null;   // 皮肤 id
let currentSeason = null; // auto 皮肤下的季节 key
const glCanvas = document.getElementById('gl');

function setCssVars(vars) {
  const root = document.documentElement.style;
  for (const [k, v] of Object.entries(vars)) root.setProperty(`--${k}`, v);
}
function dispatchShader(cfg) {
  window.dispatchEvent(new CustomEvent('themechange', { detail: cfg }));
}

function applySeason(key) {
  const t = SEASON_THEMES[key];
  if (!t) return;
  currentSeason = key;
  if (activeRenderer) activeRenderer.stop();
  glCanvas.style.display = '';
  window.__glPaused = false;
  activeRenderer = seasonalRenderer(t.particle);
  setCssVars(t.css);
  dispatchShader(t.shader);
  updateButton(SEASON_THEMES[key].label);
}

function applySkin(id, fromStorage) {
  const skin = SKINS.find((s) => s.id === id);
  if (!skin) return;
  currentSkin = id;
  if (!fromStorage) localStorage.setItem('skin', id);

  if (id === 'auto') {
    applySeason(activeFestival() || seasonOfMonth(new Date().getMonth()));
  } else {
    currentSeason = null;
    if (activeRenderer) activeRenderer.stop();
    glCanvas.style.display = skin.shader ? '' : 'none';
    window.__glPaused = !skin.shader;
    if (skin.shader) dispatchShader(skin.shader);
    setCssVars(skin.css);
    activeRenderer =
      skin.renderer === 'stars' ? seasonalRenderer('stars') :
      skin.renderer === 'minions' ? minionsRenderer() :
      skin.renderer === 'lowpoly' ? lowpolyRenderer() :
      skin.renderer === 'vibe' ? vibeRenderer() : null;
    updateButton(skin.short);
  }
  markActiveCard();
}

function updateButton(label) {
  const btn = document.getElementById('theme-btn');
  if (btn) btn.querySelector('.theme-label').textContent = label;
}

/* auto 皮肤的节日复查 */
setInterval(() => {
  if (currentSkin !== 'auto') return;
  const f = activeFestival();
  if (f && f !== currentSeason) applySeason(f);
  else if (!f && FESTIVALS.some((x) => x.key === currentSeason)) applySeason(seasonOfMonth(new Date().getMonth()));
}, 3600 * 1000);

/* ================================================================
 * 皮肤中心 UI（搜索 + 筛选 + 卡片切换）
 * ================================================================ */
function buildSkinCenter() {
  const overlay = document.createElement('div');
  overlay.id = 'skin-center';
  overlay.innerHTML = `
    <div class="sc-panel">
      <div class="sc-head">
        <div class="sc-tabs">
          <button class="sc-tab active" data-tab="skins">皮肤</button>
          <button class="sc-tab" data-tab="transitions">转场</button>
        </div>
        <button class="sc-close" aria-label="关闭">×</button>
      </div>
      <input class="sc-search" type="search" placeholder="搜索：名字 / 标签…">
      <div class="sc-grid"></div>
    </div>`;
  document.body.appendChild(overlay);
  const grid = overlay.querySelector('.sc-grid');
  const search = overlay.querySelector('.sc-search');
  let tab = 'skins';

  function previewStyle(bg, a, b) {
    return `background:
      radial-gradient(circle at 30% 30%, ${b}, transparent 60%),
      radial-gradient(circle at 70% 70%, ${a}, transparent 55%),
      ${bg}`;
  }

  function renderSkins() {
    grid.innerHTML = SKINS.map((s) => {
      const t = s.id === 'auto' ? SEASON_THEMES[seasonOfMonth(new Date().getMonth())] : s;
      return `
      <button class="sc-card" data-id="${s.id}" data-search="${(s.name + ' ' + s.tags.join(' ') + ' ' + s.desc).toLowerCase()}">
        <span class="sc-preview" style="${previewStyle(t.css.bg, t.css.accent, t.css.accent2)}"></span>
        <span class="sc-name">${s.name}</span>
        <span class="sc-desc">${s.desc}</span>
        <span class="sc-tags">${s.tags.map((t2) => `<i>${t2}</i>`).join('')}</span>
        <span class="sc-check">✓ 使用中</span>
      </button>`;
    }).join('');
    markActiveCard();
  }

  function renderTransitions() {
    const ts = window.__transitions;
    if (!ts) { grid.innerHTML = '<p style="color:var(--muted)">转场引擎未加载</p>'; return; }
    const cur = ts.current();
    const root = getComputedStyle(document.documentElement);
    const a = root.getPropertyValue('--accent').trim() || '#7c5cff';
    const b = root.getPropertyValue('--accent2').trim() || '#00e5c0';
    const bg = root.getPropertyValue('--bg').trim() || '#0a0a0f';
    grid.innerHTML = ts.list.map((t) => `
      <button class="sc-card sc-tcard ${t.id === cur ? 'active' : ''}" data-id="${t.id}" data-search="${(t.name + ' ' + t.tags.join(' ') + ' ' + t.desc).toLowerCase()}">
        <span class="sc-preview" style="${previewStyle(bg, a, b)}"></span>
        <span class="sc-name">${t.name}</span>
        <span class="sc-desc">${t.desc}</span>
        <span class="sc-tags">${t.tags.map((t2) => `<i>${t2}</i>`).join('')}</span>
        <span class="sc-check">✓ 使用中</span>
      </button>`).join('');
  }

  function render() { tab === 'skins' ? renderSkins() : renderTransitions(); applyFilter(); }
  function applyFilter() {
    const q = search.value.trim().toLowerCase();
    grid.querySelectorAll('.sc-card').forEach((c) => {
      c.style.display = !q || c.dataset.search.includes(q) ? '' : 'none';
    });
  }

  overlay.querySelectorAll('.sc-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      tab = btn.dataset.tab;
      overlay.querySelectorAll('.sc-tab').forEach((b) => b.classList.toggle('active', b === btn));
      search.value = '';
      render();
    });
  });

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.sc-card');
    if (!card) return;
    if (tab === 'skins') {
      applySkin(card.dataset.id);
      close();
    } else {
      window.__transitions?.set(card.dataset.id);
      close();
    }
  });
  search.addEventListener('input', applyFilter);

  function open() { overlay.classList.add('open'); render(); setTimeout(() => search.focus(), 100); }
  function close() { overlay.classList.remove('open'); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('.sc-close').addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  document.getElementById('theme-btn')?.addEventListener('click', open);
}
function markActiveCard() {
  document.querySelectorAll('.sc-card').forEach((c) => c.classList.toggle('active', c.dataset.id === currentSkin));
}

/* ================================================================
 * 启动
 * ================================================================ */
window.addEventListener('DOMContentLoaded', () => {
  buildSkinCenter();
  const saved = localStorage.getItem('skin');
  applySkin(SKINS.some((s) => s.id === saved) ? saved : 'auto', true);
});
