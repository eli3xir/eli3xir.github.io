/* 弹幕地狱：PixiJS ParticleContainer 弹幕 + 擦弹判定（东方 Project 风格） */
import * as PIXI from 'pixi.js';

const app = new PIXI.Application();
await app.init({ background: 0x100505, resizeTo: window, antialias: false });
document.body.prepend(app.canvas);
app.canvas.style.cssText = 'position:fixed;inset:0;z-index:0';

const stat = document.getElementById('stat');
const W = () => app.screen.width;
const H = () => app.screen.height;

/* ---------- 纹理 ---------- */
function dotTex(color, r) {
  const g = new PIXI.Graphics().circle(r, r, r).fill(color);
  return app.renderer.generateTexture(g);
}
const bulletTex = dotTex(0xffffff, 5);
const playerTex = dotTex(0xffffff, 4);
const GRAZE_TEX = dotTex(0x7c5cff, 3);

/* ---------- 弹幕容器 ---------- */
const MAX_BULLETS = 8000;
const bullets = new PIXI.ParticleContainer({
  dynamicProperties: { position: true, vertex: false, rotation: false, color: true },
});
app.stage.addChild(bullets);
const pool = [];
const alive = [];
function spawnBullet(x, y, vx, vy, tint) {
  let b = pool.pop();
  if (!b) b = new PIXI.Particle({ texture: bulletTex, anchorX: 0.5, anchorY: 0.5 });
  b.x = x; b.y = y; b.tint = tint;
  b.vx = vx; b.vy = vy; b.grazed = false;
  bullets.addParticle(b);
  alive.push(b);
}
function killBullet(i) {
  const b = alive[i];
  bullets.removeParticle(b);
  pool.push(b);
  alive[i] = alive[alive.length - 1];
  alive.pop();
}

/* ---------- 玩家 ---------- */
const player = new PIXI.Sprite(playerTex);
player.anchor.set(0.5);
app.stage.addChild(player);
// 擦弹圈提示
const grazeRing = new PIXI.Graphics().circle(0, 0, 14).stroke({ width: 1, color: 0x7c5cff, alpha: 0.5 });
app.stage.addChild(grazeRing);
let px = 0, py = 0, tx = 0, ty = 0;
let lives = 3, invincible = 0, graze = 0, survived = 0, gameOver = false;

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointermove', (e) => { tx = e.global.x; ty = e.global.y; });
app.stage.on('pointerdown', () => {
  if (gameOver) { lives = 3; graze = 0; survived = 0; gameOver = false; invincible = 120; }
});

/* ---------- Boss 与发射模式 ---------- */
const boss = new PIXI.Graphics();
boss.circle(0, 0, 22).fill(0xe63229);
boss.circle(0, 0, 30).stroke({ width: 2, color: 0xff8888, alpha: 0.6 });
app.stage.addChild(boss);

const TINTS = [0xff5a4e, 0xffb340, 0xf8ef5a, 0x6a8dff, 0xff7edb];
let patternT = 0, spiralA = 0, mode = 0, modeT = 0;
const MODES = ['spiral', 'flower', 'aimed'];

function emit(t) {
  const bx = boss.x, by = boss.y;
  if (mode === 0) { // 螺旋双臂
    if (t % 3 < 1) {
      spiralA += 0.11;
      for (let arm = 0; arm < 3; arm++) {
        const a = spiralA + (arm * Math.PI * 2) / 3;
        const sp = 2.2;
        spawnBullet(bx, by, Math.cos(a) * sp, Math.sin(a) * sp, TINTS[arm % TINTS.length]);
      }
    }
  } else if (mode === 1) { // 花瓣环
    if (t % 26 < 1) {
      spiralA += 0.3;
      for (let i = 0; i < 18; i++) {
        const a = spiralA + (i / 18) * Math.PI * 2;
        const sp = 1.6 + (i % 2) * 0.7;
        spawnBullet(bx, by, Math.cos(a) * sp, Math.sin(a) * sp, TINTS[i % TINTS.length]);
      }
    }
  } else { // 瞄准弹
    if (t % 30 < 1) {
      const a = Math.atan2(py - by, px - bx);
      for (let i = -1; i <= 1; i++) {
        spawnBullet(bx, by, Math.cos(a + i * 0.18) * 3.2, Math.sin(a + i * 0.18) * 3.2, 0xffffff);
      }
    }
  }
}

/* ---------- 主循环 ---------- */
let frame = 0;
app.ticker.add(() => {
  if (gameOver) {
    stat.textContent = `💀 GAME OVER · 存活 ${survived.toFixed(1)}s · 擦弹 ${graze} · 点击重新开始`;
    return;
  }
  frame++;
  survived += 1 / 60;
  if (invincible > 0) invincible--;

  // 模式轮换
  modeT++;
  if (modeT > 600) { modeT = 0; mode = (mode + 1) % MODES.length; }

  // Boss 缓慢游走
  boss.x = W() / 2 + Math.sin(frame * 0.008) * W() * 0.25;
  boss.y = H() * 0.25 + Math.cos(frame * 0.011) * H() * 0.08;
  boss.rotation += 0.01;

  emit(frame);
  if (alive.length > MAX_BULLETS) killBullet(0);

  // 玩家跟随（无惯性，跟手）
  px = tx; py = ty;
  player.x = px; player.y = py;
  grazeRing.x = px; grazeRing.y = py;
  player.alpha = invincible > 0 && frame % 8 < 4 ? 0.3 : 1;

  // 子弹移动 + 判定
  for (let i = alive.length - 1; i >= 0; i--) {
    const b = alive[i];
    b.x += b.vx;
    b.y += b.vy;
    if (b.x < -20 || b.x > W() + 20 || b.y < -20 || b.y > H() + 20) { killBullet(i); continue; }
    const dx = b.x - px, dy = b.y - py;
    const d2 = dx * dx + dy * dy;
    if (d2 < 20) { // 命中判定点（半径 ~4.5）
      if (invincible <= 0) {
        lives--;
        invincible = 150;
        grazeRing.alpha = 1;
        if (lives <= 0) gameOver = true;
      }
    } else if (d2 < 400 && !b.grazed) { // 擦弹（半径 20）
      b.grazed = true;
      graze++;
    }
  }

  stat.textContent = `♥ ${lives} · 存活 ${survived.toFixed(1)}s · 擦弹 ${graze} · 场上弹幕 ${alive.length}`;
});

tx = W() / 2; ty = H() * 0.75;
