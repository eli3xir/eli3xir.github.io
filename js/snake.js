/* 霓虹贪吃蛇：canvas 实现，键盘 + 触屏按钮 */
export function initSnake() {
  const canvas = document.getElementById('snake');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('snake-score');
  const bestEl = document.getElementById('snake-best');
  const btn = document.getElementById('snake-btn');

  const GRID = 24;
  const CELL = canvas.width / GRID;
  const ACCENT = '#7c5cff';
  const TEAL = '#00e5c0';

  let snake, dir, nextDir, food, score, best, speed, acc, last, running, dead, raf;

  best = Number(localStorage.getItem('snake-best') || 0);
  bestEl.textContent = best;

  function reset() {
    snake = [{ x: 11, y: 12 }, { x: 10, y: 12 }, { x: 9, y: 12 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    speed = 130;
    acc = 0;
    last = 0;
    dead = false;
    scoreEl.textContent = '0';
    placeFood();
  }

  function placeFood() {
    do {
      food = {
        x: Math.floor(Math.random() * GRID),
        y: Math.floor(Math.random() * GRID),
      };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
  }

  function step() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // 撞墙 / 撞自己
    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID ||
        snake.some((s) => s.x === head.x && s.y === head.y)) {
      dead = true;
      running = false;
      btn.textContent = '再来一局';
      if (score > best) {
        best = score;
        localStorage.setItem('snake-best', best);
        bestEl.textContent = best;
      }
      draw();
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = score;
      speed = Math.max(60, speed - 4); // 越吃越快
      placeFood();
    } else {
      snake.pop();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 网格
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
    }

    // 食物（脉冲光晕）
    const pulse = 0.75 + 0.25 * Math.sin(performance.now() / 200);
    ctx.save();
    ctx.shadowColor = TEAL;
    ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = TEAL;
    roundRect(food.x * CELL + 3, food.y * CELL + 3, CELL - 6, CELL - 6, 5);
    ctx.restore();

    // 蛇
    snake.forEach((s, i) => {
      const t = 1 - i / snake.length;
      ctx.save();
      ctx.shadowColor = ACCENT;
      ctx.shadowBlur = i === 0 ? 16 : 6;
      ctx.fillStyle = i === 0 ? '#b7a5ff' : `rgba(124, 92, 255, ${0.35 + t * 0.6})`;
      roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 4);
      ctx.restore();
    });

    // 死亡提示
    if (dead) {
      ctx.fillStyle = 'rgba(10,10,15,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '700 32px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '16px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#8a8798';
      ctx.fillText(`得分 ${score}`, canvas.width / 2, canvas.height / 2 + 24);
    }
  }

  function loop(ts) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (!last) last = ts;
    acc += ts - last;
    last = ts;
    while (acc >= speed) {
      acc -= speed;
      step();
      if (!running) return;
    }
    draw();
  }

  function start() {
    cancelAnimationFrame(raf);
    reset();
    running = true;
    btn.textContent = '重新开始';
    canvas.focus({ preventScroll: true });
    raf = requestAnimationFrame(loop);
  }

  function setDir(x, y) {
    // 禁止 180° 掉头
    if (dir.x === -x && dir.y === -y) return;
    nextDir = { x, y };
  }

  window.addEventListener('keydown', (e) => {
    const map = {
      ArrowUp: [0, -1], KeyW: [0, -1],
      ArrowDown: [0, 1], KeyS: [0, 1],
      ArrowLeft: [-1, 0], KeyA: [-1, 0],
      ArrowRight: [1, 0], KeyD: [1, 0],
    };
    const d = map[e.code];
    if (!d) return;
    // 游戏运行时才拦截按键，避免影响页面滚动
    if (running) e.preventDefault();
    setDir(d[0], d[1]);
  });

  document.querySelectorAll('.game-pad button').forEach((b) => {
    b.addEventListener('click', () => {
      const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[b.dataset.dir];
      if (d) setDir(d[0], d[1]);
    });
  });

  btn.addEventListener('click', start);

  // 初始画面
  reset();
  draw();
}
