/* 粒子文字：PixiJS ParticleContainer 承载 3 万粒子，文字成形 / 鼠标炸开 / 弹簧重组 */
import * as PIXI from 'pixi.js';

const app = new PIXI.Application();
await app.init({ background: 0x050510, resizeTo: window, antialias: false });
document.body.prepend(app.canvas);
app.canvas.style.cssText = 'position:fixed;inset:0;z-index:0';

const stat = document.getElementById('stat');

/* ---------- 从文字采样目标点 ---------- */
const TEXTS = ['eli3xir', '姜 山', '北 邮', '代码人生', 'VIBE'];
let textIdx = 0;

function sampleText(text) {
  const c = document.createElement('canvas');
  c.width = 1200; c.height = 320;
  const x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.font = '700 200px "Space Grotesk", "Noto Sans SC", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 600, 170);
  const data = x.getImageData(0, 0, 1200, 320).data;
  const pts = [];
  const gap = 5;
  for (let j = 0; j < 320; j += gap)
    for (let i = 0; i < 1200; i += gap)
      if (data[(j * 1200 + i) * 4 + 3] > 128) pts.push([i, j]);
  return pts;
}

/* ---------- 粒子纹理（共享） ---------- */
const dot = new PIXI.Graphics().circle(4, 4, 3).fill(0xffffff);
const tex = app.renderer.generateTexture(dot);

const container = new PIXI.ParticleContainer({
  dynamicProperties: { position: true, vertex: false, rotation: false, color: true },
});
app.stage.addChild(container);

/* ---------- 粒子初始化 ---------- */
const COUNT = 30000;
const parts = [];
for (let i = 0; i < COUNT; i++) {
  const p = new PIXI.Particle({
    texture: tex,
    x: Math.random() * app.screen.width,
    y: Math.random() * app.screen.height,
    anchorX: 0.5,
    anchorY: 0.5,
  });
  container.addParticle(p);
  parts.push({ p, vx: 0, vy: 0, tx: 0, ty: 0 });
}

/* ---------- 布局：把采样点映射到屏幕 ---------- */
// 纯 JS 颜色插值（v8 Color API 已变，不依赖它）
function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
  return ((r1 + (r2 - r1) * t) << 16) | ((g1 + (g2 - g1) * t) << 8) | ((b1 + (b2 - b1) * t) | 0);
}
function layout() {
  const pts = sampleText(TEXTS[textIdx]);
  const sw = app.screen.width, sh = app.screen.height;
  const scale = Math.min((sw * 0.86) / 1200, (sh * 0.5) / 320);
  const ox = (sw - 1200 * scale) / 2, oy = (sh - 320 * scale) / 2;
  for (let i = 0; i < COUNT; i++) {
    const p = parts[i];
    const [sx, sy] = pts[i % pts.length];
    p.tx = ox + sx * scale;
    p.ty = oy + sy * scale;
    p.p.tint = lerpColor(0x7c5cff, 0x00e5c0, sx / 1200);
  }
}
layout();

/* ---------- 交互 ---------- */
let mx = -9999, my = -9999;
app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointermove', (e) => { mx = e.global.x; my = e.global.y; });
app.stage.on('pointerdown', () => { textIdx = (textIdx + 1) % TEXTS.length; layout(); });
addEventListener('resize', layout);

/* ---------- 主循环 ---------- */
let fps = 60, frames = 0, fpsT = performance.now();
const REPEL_R = 110, REPEL_R2 = REPEL_R * REPEL_R;
app.ticker.add(() => {
  for (let i = 0; i < COUNT; i++) {
    const p = parts[i];
    const s = p.p;
    // 弹簧回位
    p.vx += (p.tx - s.x) * 0.012;
    p.vy += (p.ty - s.y) * 0.012;
    // 鼠标斥力
    const dx = s.x - mx, dy = s.y - my;
    const d2 = dx * dx + dy * dy;
    if (d2 < REPEL_R2) {
      const d = Math.sqrt(d2) || 1;
      const f = (1 - d / REPEL_R) * 3.2;
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f;
    }
    p.vx *= 0.9; p.vy *= 0.9;
    s.x += p.vx;
    s.y += p.vy;
  }
  // FPS
  frames++;
  const now = performance.now();
  if (now - fpsT > 500) {
    fps = Math.round(frames * 1000 / (now - fpsT));
    frames = 0; fpsT = now;
    stat.textContent = `${COUNT.toLocaleString()} 粒子 · ${fps} FPS · 当前「${TEXTS[textIdx]}」`;
  }
});
