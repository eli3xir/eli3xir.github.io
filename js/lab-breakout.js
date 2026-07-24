/* 霓虹打砖块：PixiJS 8 —— 粒子烟花 / 屏幕震动 / 球尾迹 / 挡板挤压 */
import * as PIXI from 'pixi.js';

const app = new PIXI.Application();
await app.init({ background: 0x0a0a14, resizeTo: window, antialias: true });
document.body.prepend(app.canvas);
// 注意：z-index 不能为负，否则 PixiJS 的事件系统收不到命中
app.canvas.style.cssText = 'position:fixed;inset:0;z-index:0';

const W = () => app.screen.width;
const H = () => app.screen.height;

/* ---------- 场景容器（震动用） ---------- */
const stage = new PIXI.Container();
app.stage.addChild(stage);

/* ---------- 背景网格 ---------- */
{
  const g = new PIXI.Graphics();
  for (let x = 0; x < 2400; x += 60) g.moveTo(x, 0).lineTo(x, 1600);
  for (let y = 0; y < 1600; y += 60) g.moveTo(0, y).lineTo(2400, y);
  g.stroke({ width: 1, color: 0xffffff, alpha: 0.04 });
  stage.addChild(g);
}

/* ---------- 粒子系统 ---------- */
const particles = [];
function burst(x, y, color, n = 16, power = 5) {
  for (let i = 0; i < n; i++) {
    const p = new PIXI.Graphics().circle(0, 0, 2 + Math.random() * 3).fill(color);
    p.x = x; p.y = y;
    const a = Math.random() * Math.PI * 2;
    const sp = (1 + Math.random() * power);
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp - 2;
    p.life = 1;
    p.decay = 0.015 + Math.random() * 0.02;
    stage.addChild(p);
    particles.push(p);
  }
}

/* ---------- 挡板 ---------- */
const PADDLE_W = 120, PADDLE_H = 16;
const paddle = new PIXI.Graphics();
function drawPaddle(scaleX = 1, scaleY = 1) {
  paddle.clear();
  paddle.roundRect(-PADDLE_W * scaleX / 2, -PADDLE_H * scaleY / 2, PADDLE_W * scaleX, PADDLE_H * scaleY, 8);
  paddle.fill(0x7c5cff);
  paddle.stroke({ width: 2, color: 0xb7a5ff });
}
drawPaddle();
paddle.y = 0;
stage.addChild(paddle);
let paddleSquash = 0;

/* ---------- 球 ---------- */
const ball = new PIXI.Graphics();
ball.circle(0, 0, 9).fill(0x00e5c0);
ball.circle(0, 0, 14).stroke({ width: 2, color: 0x00e5c0, alpha: 0.35 });
stage.addChild(ball);
const trail = [];

/* ---------- 砖块 ---------- */
const ROWS = 5, COLS = 9;
const ROW_COLORS = [0xff2d78, 0xff9f43, 0xf8ef5a, 0x00e5c0, 0x6a8dff];
let bricks = [];
let bricksLeft = 0;
function buildBricks() {
  for (const b of bricks) b.destroy();
  bricks = [];
  const bw = Math.min(110, (W() - 120) / COLS - 12);
  const bh = 26;
  const ox = (W() - COLS * (bw + 12)) / 2 + 6;
  const oy = 90;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const b = new PIXI.Graphics();
      b.roundRect(0, 0, bw, bh, 6);
      b.fill(ROW_COLORS[r]);
      b.roundRect(0, 0, bw, bh / 2.5, 6);
      b.fill({ color: 0xffffff, alpha: 0.22 });
      b.x = ox + c * (bw + 12);
      b.y = oy + r * (bh + 12);
      b.w = bw; b.h = bh; b.row = r;
      stage.addChild(b);
      bricks.push(b);
    }
  bricksLeft = bricks.length;
}

/* ---------- HUD ---------- */
const hud = new PIXI.Text({ text: '', style: { fill: 0xffffff, fontSize: 18, fontFamily: 'Space Grotesk, sans-serif' } });
hud.x = 20; hud.y = 110;
app.stage.addChild(hud);
const centerMsg = new PIXI.Text({ text: '', style: { fill: 0xffffff, fontSize: 42, fontWeight: '700', fontFamily: 'Space Grotesk, sans-serif' }, anchor: 0.5 });
app.stage.addChild(centerMsg);
const subMsg = new PIXI.Text({ text: '', style: { fill: 0x8a8798, fontSize: 18, fontFamily: 'Space Grotesk, sans-serif' }, anchor: 0.5 });
app.stage.addChild(subMsg);

/* ---------- 游戏状态 ---------- */
let score = 0, lives = 3, speed = 6;
let vx = 0, vy = 0, playing = false, dead = false;
let shake = 0;

function serve() {
  ball.x = paddle.x;
  ball.y = paddle.y - 30;
  const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  vx = Math.cos(a) * speed;
  vy = Math.sin(a) * speed;
  playing = true;
  centerMsg.text = '';
  subMsg.text = '';
}
function startGame() {
  score = 0; lives = 3; speed = 6; dead = false;
  buildBricks();
  paddle.x = W() / 2;
  paddle.y = H() - 60;
  serve();
}

app.stage.eventMode = 'static';
app.stage.hitArea = app.screen;
app.stage.on('pointermove', (e) => {
  paddle.x += (e.global.x - paddle.x) * 0.35;
  paddle.x = Math.max(PADDLE_W / 2, Math.min(W() - PADDLE_W / 2, paddle.x));
});
app.stage.on('pointerdown', () => {
  if (!playing && !dead) serve();
  else if (dead) startGame();
});

function loseLife() {
  lives--;
  shake = 14;
  burst(ball.x, ball.y, 0xff5a5a, 24, 7);
  if (lives <= 0) {
    dead = true; playing = false;
    centerMsg.text = 'GAME OVER';
    subMsg.text = `得分 ${score} · 点击重新开始`;
  } else {
    playing = false;
    subMsg.text = `剩余 ${lives} 条命 · 点击发球`;
    ball.x = paddle.x; ball.y = paddle.y - 30;
  }
}

/* ---------- 主循环 ---------- */
app.ticker.add((t) => {
  const dt = t.deltaTime;
  hud.text = `SCORE ${score}   LIVES ${'♥'.repeat(Math.max(lives, 0))}`;
  paddle.y = H() - 60;
  centerMsg.x = W() / 2; centerMsg.y = H() / 2 - 20;
  subMsg.x = W() / 2; subMsg.y = H() / 2 + 30;

  // 挡板挤压回弹
  if (paddleSquash > 0.02) {
    paddleSquash *= 0.85;
    drawPaddle(1 + paddleSquash * 0.4, 1 - paddleSquash * 0.4);
  }

  // 屏幕震动
  if (shake > 0.1) {
    stage.x = (Math.random() - 0.5) * shake;
    stage.y = (Math.random() - 0.5) * shake;
    shake *= 0.86;
  } else { stage.x = 0; stage.y = 0; }

  // 粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 0.18 * dt;
    p.life -= p.decay * dt;
    p.alpha = p.life;
    if (p.life <= 0) { p.destroy(); particles.splice(i, 1); }
  }

  // 球尾迹
  if (playing) {
    const ghost = new PIXI.Graphics().circle(0, 0, 8).fill({ color: 0x00e5c0, alpha: 0.25 });
    ghost.x = ball.x; ghost.y = ball.y; ghost.life = 0.5;
    stage.addChild(ghost);
    trail.push(ghost);
  }
  for (let i = trail.length - 1; i >= 0; i--) {
    const g = trail[i];
    g.life -= 0.05 * dt;
    g.alpha = g.life * 0.5;
    g.scale.set(Math.max(g.life, 0.01));
    if (g.life <= 0) { g.destroy(); trail.splice(i, 1); }
  }

  if (!playing) { if (!dead) { ball.x = paddle.x; ball.y = paddle.y - 30; } return; }

  ball.x += vx * dt;
  ball.y += vy * dt;

  // 墙壁
  if (ball.x < 9) { ball.x = 9; vx = Math.abs(vx); }
  if (ball.x > W() - 9) { ball.x = W() - 9; vx = -Math.abs(vx); }
  if (ball.y < 9) { ball.y = 9; vy = Math.abs(vy); }
  if (ball.y > H() + 20) { loseLife(); return; }

  // 挡板碰撞：按击中位置改变反射角
  if (vy > 0 && ball.y > paddle.y - PADDLE_H && ball.y < paddle.y + PADDLE_H &&
      Math.abs(ball.x - paddle.x) < PADDLE_W / 2 + 9) {
    const rel = (ball.x - paddle.x) / (PADDLE_W / 2); // -1..1
    const a = -Math.PI / 2 + rel * 1.1;
    const sp = Math.min(speed, Math.hypot(vx, vy));
    vx = Math.cos(a) * sp;
    vy = Math.sin(a) * sp;
    paddleSquash = 1;
    burst(ball.x, paddle.y - 8, 0x7c5cff, 8, 3);
  }

  // 砖块碰撞
  for (let i = bricks.length - 1; i >= 0; i--) {
    const b = bricks[i];
    if (ball.x > b.x - 9 && ball.x < b.x + b.w + 9 && ball.y > b.y - 9 && ball.y < b.y + b.h + 9) {
      // 判断从哪一侧撞入
      const overlapX = Math.min(ball.x - b.x + 9, b.x + b.w + 9 - ball.x);
      const overlapY = Math.min(ball.y - b.y + 9, b.y + b.h + 9 - ball.y);
      if (overlapX < overlapY) vx = -vx; else vy = -vy;
      burst(ball.x, ball.y, ROW_COLORS[b.row], 18, 5);
      shake = Math.max(shake, 5);
      b.destroy();
      bricks.splice(i, 1);
      bricksLeft--;
      score += (ROWS - b.row) * 10;
      speed = Math.min(11, speed + 0.08);
      const sp = Math.hypot(vx, vy);
      vx = (vx / sp) * speed; vy = (vy / sp) * speed;
      if (bricksLeft === 0) {
        dead = true; playing = false;
        centerMsg.text = '🎉 全部击碎！';
        subMsg.text = `得分 ${score} · 点击再来一局`;
        burst(W() / 2, H() / 3, 0xf8ef5a, 60, 9);
      }
      break;
    }
  }
});

startGame();
playing = false;
subMsg.text = '点击发球';

addEventListener('resize', () => { paddle.y = H() - 60; });
