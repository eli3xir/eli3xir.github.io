/* 星轨实验：长曝光星轨（绕北极星旋转累积轨迹）+ 流星 */
(function () {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  let W, H, dpr;

  // 中心（北极星位置），可拖动
  let cx, cy;

  const stars = [];
  const N = 900;

  function init() {
    dpr = Math.min(devicePixelRatio, 2);
    W = canvas.width = innerWidth * dpr;
    H = canvas.height = innerHeight * dpr;
    if (cx === undefined) { cx = W * 0.5; cy = H * 0.42; }
    stars.length = 0;
    const maxR = Math.hypot(W, H) * 0.55;
    for (let i = 0; i < N; i++) {
      const r = 20 + Math.pow(Math.random(), 0.7) * maxR;
      stars.push({
        r,
        a: Math.random() * Math.PI * 2,
        // 亮度 & 色相：多数白蓝，少数暖色
        mag: 0.3 + Math.random() * 1.6,
        hue: Math.random() < 0.75 ? 210 + Math.random() * 30 : 30 + Math.random() * 20,
        sat: 20 + Math.random() * 40,
      });
    }
    // 初始黑底
    ctx.fillStyle = '#02020a';
    ctx.fillRect(0, 0, W, H);
  }
  init();
  addEventListener('resize', init);

  // 拖动改变环绕中心
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; cx = e.clientX * dpr; cy = e.clientY * dpr; });
  canvas.addEventListener('pointermove', (e) => { if (dragging) { cx = e.clientX * dpr; cy = e.clientY * dpr; } });
  addEventListener('pointerup', () => (dragging = false));

  const meteors = [];
  function spawnMeteor() {
    const a = Math.random() * Math.PI * 2;
    meteors.push({
      x: Math.random() * W, y: Math.random() * H * 0.4,
      vx: Math.cos(a) * 8 * dpr, vy: Math.abs(Math.sin(a)) * 6 * dpr,
      life: 1,
    });
  }

  const SPEED = 0.00045; // 每帧角度增量（模拟地球自转）

  function loop() {
    requestAnimationFrame(loop);
    // 半透明覆盖，形成轨迹
    ctx.fillStyle = 'rgba(2, 2, 10, 0.06)';
    ctx.fillRect(0, 0, W, H);

    ctx.lineCap = 'round';
    for (const s of stars) {
      const a0 = s.a;
      s.a += SPEED * (28 / Math.sqrt(s.r)); // 近快远慢的微分，更像真实星轨
      const x0 = cx + Math.cos(a0) * s.r, y0 = cy + Math.sin(a0) * s.r;
      const x1 = cx + Math.cos(s.a) * s.r, y1 = cy + Math.sin(s.a) * s.r;
      ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, ${70 + s.mag * 10}%, ${0.35 + s.mag * 0.25})`;
      ctx.lineWidth = s.mag * dpr * 0.8;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // 北极星亮点
    ctx.fillStyle = 'rgba(255, 250, 230, 0.9)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.2 * dpr, 0, 6.29);
    ctx.fill();

    // 流星
    if (Math.random() < 0.004 && meteors.length < 3) spawnMeteor();
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx; m.y += m.vy; m.life -= 0.015;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(255, 255, 255, ${m.life * 0.8})`;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 6, m.y - m.vy * 6);
      ctx.stroke();
    }
  }
  loop();
})();
