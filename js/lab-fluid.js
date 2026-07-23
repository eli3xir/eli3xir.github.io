/* 流体实验：二维稳定流体（semi-Lagrangian + 压力投影），鼠标拖动注入染料和速度 */
(function () {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const N = 72;             // 网格分辨率
  const SIZE = (N + 2) * (N + 2);
  const ITER = 16;          // Jacobi 迭代次数

  let u = new Float32Array(SIZE), v = new Float32Array(SIZE);
  let u0 = new Float32Array(SIZE), v0 = new Float32Array(SIZE);
  let p = new Float32Array(SIZE), div = new Float32Array(SIZE);
  // 染料 RGB 三场
  let dr = new Float32Array(SIZE), dg = new Float32Array(SIZE), db = new Float32Array(SIZE);
  let dr0 = new Float32Array(SIZE), dg0 = new Float32Array(SIZE), db0 = new Float32Array(SIZE);

  const IX = (x, y) => x + (N + 2) * y;

  function setBnd(b, x) {
    for (let i = 1; i <= N; i++) {
      x[IX(0, i)] = b === 1 ? -x[IX(1, i)] : x[IX(1, i)];
      x[IX(N + 1, i)] = b === 1 ? -x[IX(N, i)] : x[IX(N, i)];
      x[IX(i, 0)] = b === 2 ? -x[IX(i, 1)] : x[IX(i, 1)];
      x[IX(i, N + 1)] = b === 2 ? -x[IX(i, N)] : x[IX(i, N)];
    }
    x[IX(0, 0)] = 0.5 * (x[IX(1, 0)] + x[IX(0, 1)]);
    x[IX(0, N + 1)] = 0.5 * (x[IX(1, N + 1)] + x[IX(0, N)]);
    x[IX(N + 1, 0)] = 0.5 * (x[IX(N, 0)] + x[IX(N + 1, 1)]);
    x[IX(N + 1, N + 1)] = 0.5 * (x[IX(N, N + 1)] + x[IX(N + 1, N)]);
  }

  function linSolve(b, x, x0, a, c) {
    const inv = 1 / c;
    for (let k = 0; k < ITER; k++) {
      for (let j = 1; j <= N; j++)
        for (let i = 1; i <= N; i++)
          x[IX(i, j)] = (x0[IX(i, j)] + a * (x[IX(i - 1, j)] + x[IX(i + 1, j)] + x[IX(i, j - 1)] + x[IX(i, j + 1)])) * inv;
      setBnd(b, x);
    }
  }

  function project() {
    for (let j = 1; j <= N; j++)
      for (let i = 1; i <= N; i++) {
        div[IX(i, j)] = -0.5 * (u[IX(i + 1, j)] - u[IX(i - 1, j)] + v[IX(i, j + 1)] - v[IX(i, j - 1)]) / N;
        p[IX(i, j)] = 0;
      }
    setBnd(0, div); setBnd(0, p);
    linSolve(0, p, div, 1, 4);
    for (let j = 1; j <= N; j++)
      for (let i = 1; i <= N; i++) {
        u[IX(i, j)] -= 0.5 * N * (p[IX(i + 1, j)] - p[IX(i - 1, j)]);
        v[IX(i, j)] -= 0.5 * N * (p[IX(i, j + 1)] - p[IX(i, j - 1)]);
      }
    setBnd(1, u); setBnd(2, v);
  }

  function advect(b, d, d0, uu, vv, dt) {
    const dt0 = dt * N;
    for (let j = 1; j <= N; j++)
      for (let i = 1; i <= N; i++) {
        let x = i - dt0 * uu[IX(i, j)];
        let y = j - dt0 * vv[IX(i, j)];
        if (x < 0.5) x = 0.5; if (x > N + 0.5) x = N + 0.5;
        if (y < 0.5) y = 0.5; if (y > N + 0.5) y = N + 0.5;
        const i0 = x | 0, j0 = y | 0, i1 = i0 + 1, j1 = j0 + 1;
        const s1 = x - i0, s0 = 1 - s1, t1 = y - j0, t0 = 1 - t1;
        d[IX(i, j)] = s0 * (t0 * d0[IX(i0, j0)] + t1 * d0[IX(i0, j1)]) + s1 * (t0 * d0[IX(i1, j0)] + t1 * d0[IX(i1, j1)]);
      }
    setBnd(b, d);
  }

  function step(dt) {
    // 速度场：微弱扩散 + 平流 + 投影
    u0.set(u); v0.set(v);
    linSolve(1, u, u0, 0.05, 1 + 0.05 * 4);
    linSolve(2, v, v0, 0.05, 1 + 0.05 * 4);
    project();
    u0.set(u); v0.set(v);
    advect(1, u, u0, u0, v0, dt);
    advect(2, v, v0, u0, v0, dt);
    project();
    // 染料：平流 + 衰减
    dr0.set(dr); dg0.set(dg); db0.set(db);
    advect(0, dr, dr0, u, v, dt);
    advect(0, dg, dg0, u, v, dt);
    advect(0, db, db0, u, v, dt);
    const fade = 0.998;
    for (let i = 0; i < SIZE; i++) { dr[i] *= fade; dg[i] *= fade; db[i] *= fade; }
  }

  /* ---------- 渲染 ---------- */
  const img = ctx.createImageData(N, N);
  function render() {
    const px = img.data;
    for (let j = 1; j <= N; j++)
      for (let i = 1; i <= N; i++) {
        const o = ((j - 1) * N + (i - 1)) * 4;
        px[o] = Math.min(255, dr[IX(i, j)] * 255);
        px[o + 1] = Math.min(255, dg[IX(i, j)] * 255);
        px[o + 2] = Math.min(255, db[IX(i, j)] * 255);
        px[o + 3] = 255;
      }
    // 先绘制小图，再放大（平滑插值）
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = N;
    tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
  }

  /* ---------- 交互 ---------- */
  let mouseX = 0, mouseY = 0, pmX = 0, pmY = 0, down = false;
  const COLORS = [[0.5, 0.2, 1], [0, 0.9, 0.75], [1, 0.3, 0.5], [0.2, 0.6, 1], [1, 0.7, 0.2]];
  let colorIdx = 0;
  function inject(x, y, dx, dy) {
    const gx = Math.round((x / canvas.clientWidth) * N);
    const gy = Math.round((y / canvas.clientHeight) * N);
    if (gx < 1 || gx > N || gy < 1 || gy > N) return;
    const c = COLORS[colorIdx];
    for (let j = -2; j <= 2; j++)
      for (let i = -2; i <= 2; i++) {
        const xi = gx + i, yj = gy + j;
        if (xi < 1 || xi > N || yj < 1 || yj > N) continue;
        const w = 1 - Math.hypot(i, j) / 3;
        u[IX(xi, yj)] += dx * 0.4 * w;
        v[IX(xi, yj)] += dy * 0.4 * w;
        dr[IX(xi, yj)] += c[0] * 0.5 * w;
        dg[IX(xi, yj)] += c[1] * 0.5 * w;
        db[IX(xi, yj)] += c[2] * 0.5 * w;
      }
  }
  canvas.addEventListener('pointerdown', (e) => { down = true; colorIdx = (colorIdx + 1) % COLORS.length; pmX = e.clientX; pmY = e.clientY; inject(e.clientX, e.clientY, 0, 0); });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - pmX, dy = e.clientY - pmY;
    inject(e.clientX, e.clientY, dx, dy);
    pmX = e.clientX; pmY = e.clientY;
  });
  addEventListener('pointerup', () => (down = false));

  // 自动扰动（开场演示）
  let auto = 0;
  function autoInject(t) {
    if (down) return;
    const x = canvas.clientWidth * (0.5 + 0.3 * Math.sin(t * 0.5));
    const y = canvas.clientHeight * (0.5 + 0.3 * Math.cos(t * 0.7));
    inject(x, y, Math.cos(t) * 8, Math.sin(t * 1.3) * 8);
  }

  function resize() {
    canvas.width = canvas.clientWidth * Math.min(devicePixelRatio, 1.5);
    canvas.height = canvas.clientHeight * Math.min(devicePixelRatio, 1.5);
  }
  resize();
  addEventListener('resize', resize);
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  resize();

  let last = performance.now();
  function loop(ts) {
    requestAnimationFrame(loop);
    const dt = Math.min((ts - last) / 1000, 0.033);
    last = ts;
    auto += dt;
    autoInject(auto);
    step(dt);
    render();
  }
  requestAnimationFrame(loop);
})();
