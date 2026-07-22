/* ============================================================
 * 主题引擎：春夏秋冬 + 中国传统节日（自动检测）+ 季节粒子
 * 与主页 shader 通过 themechange 事件联动
 * ============================================================ */
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 主题定义 ---------- */
  const THEMES = {
    spring: {
      label: '春', particle: 'petal',
      css: { bg: '#f7edf1', fg: '#3c2531', muted: '#8a6b78', accent: '#e2548a', accent2: '#5d9c59' },
      shader: { base: 0xf7edf1, sign: -1, colA: 0xe2548a, colB: 0x5d9c59, variant: 0 },
    },
    summer: {
      label: '夏', particle: 'firefly',
      css: { bg: '#08252e', fg: '#d9f2f2', muted: '#6d9aa3', accent: '#18c8c0', accent2: '#ffb340' },
      shader: { base: 0x08252e, sign: 1, colA: 0x18c8c0, colB: 0xffb340, variant: 1 },
    },
    autumn: {
      label: '秋', particle: 'leaf',
      css: { bg: '#f5ecdf', fg: '#3d2c17', muted: '#937a58', accent: '#d9692b', accent2: '#a5852a' },
      shader: { base: 0xf5ecdf, sign: -1, colA: 0xd9692b, colB: 0xa5852a, variant: 2 },
    },
    winter: {
      label: '冬', particle: 'snow',
      css: { bg: '#eef3f9', fg: '#22334a', muted: '#6c7f97', accent: '#4a7fd6', accent2: '#7fb3d9' },
      shader: { base: 0xeef3f9, sign: -1, colA: 0x4a7fd6, colB: 0x7fb3d9, variant: 3 },
    },
    chunjie: {
      label: '春节', particle: 'firework',
      css: { bg: '#170b0b', fg: '#f6e7d4', muted: '#a08472', accent: '#e63229', accent2: '#f5b942' },
      shader: { base: 0x170b0b, sign: 1, colA: 0xe63229, colB: 0xf5b942, variant: 1 },
    },
    yuanxiao: {
      label: '元宵', particle: 'lantern',
      css: { bg: '#190d12', fg: '#f6e3d8', muted: '#a38790', accent: '#ff5a4e', accent2: '#ffb84d' },
      shader: { base: 0x190d12, sign: 1, colA: 0xff5a4e, colB: 0xffb84d, variant: 2 },
    },
    duanwu: {
      label: '端午', particle: 'leaf',
      css: { bg: '#0c1710', fg: '#e2f0df', muted: '#7d9a82', accent: '#2d9d5f', accent2: '#a4c24a' },
      shader: { base: 0x0c1710, sign: 1, colA: 0x2d9d5f, colB: 0xa4c24a, variant: 3 },
    },
    zhongqiu: {
      label: '中秋', particle: 'osmanthus',
      css: { bg: '#0b1026', fg: '#e8e9f5', muted: '#8a8fb0', accent: '#f0c14b', accent2: '#6a8dff' },
      shader: { base: 0x0b1026, sign: 1, colA: 0xf0c14b, colB: 0x6a8dff, variant: 0 },
    },
  };
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

  /* ---------- 农历节日表（2026-2030 公历日期） ---------- */
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

  function seasonOfMonth(m) { // 0-based
    if (m >= 2 && m <= 4) return 'spring';
    if (m >= 5 && m <= 7) return 'summer';
    if (m >= 8 && m <= 10) return 'autumn';
    return 'winter';
  }

  /* ---------- 粒子引擎 ---------- */
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  function resize() {
    dpr = Math.min(devicePixelRatio, 2);
    W = canvas.width = innerWidth * dpr;
    H = canvas.height = innerHeight * dpr;
  }
  resize();
  window.addEventListener('resize', resize);

  const R = Math.random;
  let particles = [];
  let particleType = null;
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
      default: return { x, y };
    }
  }

  function burst(x, y, c1, c2) {
    for (let i = 0; i < 26; i++) {
      const a = (Math.PI * 2 * i) / 26 + R() * 0.3;
      const sp = (2 + R() * 4) * dpr;
      particles.push({
        fx: true, x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: 0.012 + R() * 0.015,
        s: (1.5 + R() * 2) * dpr,
        color: R() < 0.5 ? c1 : c2,
      });
    }
  }

  function step(type, t) {
    ctx.clearRect(0, 0, W, H);
    // 补充粒子
    const want = { petal: 26, leaf: 22, snow: 90, firefly: 30, osmanthus: 40, lantern: 10, firework: 0 }[type] || 0;
    const normal = particles.filter((p) => !p.fx);
    while (normal.length < want) { const p = spawn(type); normal.push(p); particles.push(p); }

    // 烟花定期迸发
    if (type === 'firework') {
      fireworkTimer -= t;
      if (fireworkTimer <= 0) {
        fireworkTimer = 1400 + R() * 1800;
        burst(W * (0.15 + R() * 0.7), H * (0.1 + R() * 0.4), '#e63229', '#f5b942');
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.fx) { // 烟花碎屑
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
      switch (type) {
        case 'petal': case 'leaf':
          p.y += p.vy; p.x += Math.sin(p.ph) * 0.8 * dpr; p.rot += p.vr;
          if (p.y > H + 20) { p.y = -20; p.x = R() * W; }
          ctx.save();
          ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(p.ph) * 0.4);
          ctx.fillStyle = `hsla(${p.hue}, 70%, ${type === 'petal' ? 72 : 55}%, 0.85)`;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.29);
          ctx.fill();
          ctx.restore();
          break;
        case 'snow':
          p.y += p.vy; p.x += Math.sin(p.ph) * 0.5 * dpr;
          if (p.y > H + 10) { p.y = -10; p.x = R() * W; }
          ctx.globalAlpha = p.o;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.29); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        case 'firefly': {
          p.x += p.vx + Math.sin(p.ph * 0.7) * 0.3 * dpr;
          p.y += p.vy + Math.cos(p.ph * 0.6) * 0.3 * dpr;
          if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
          if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
          const glow = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p.ph * 2));
          ctx.globalAlpha = glow;
          ctx.fillStyle = '#ffe98a';
          ctx.shadowColor = '#ffb340'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.29); ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
          break;
        }
        case 'osmanthus':
          p.y += p.vy; p.x += Math.sin(p.ph) * 0.4 * dpr;
          if (p.y > H + 10) { p.y = -10; p.x = R() * W; }
          ctx.globalAlpha = p.o;
          ctx.fillStyle = '#f0c14b';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.29); ctx.fill();
          ctx.globalAlpha = 1;
          break;
        case 'lantern':
          p.y += p.vy; p.x += Math.sin(p.ph) * 0.5 * dpr;
          if (p.y < -60) { p.y = H + 60; p.x = R() * W; }
          ctx.globalAlpha = p.o * 0.9;
          ctx.fillStyle = '#ff5a4e';
          ctx.shadowColor = '#ffb84d'; ctx.shadowBlur = 24;
          ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s * 0.75, p.s, 0, 0, 6.29); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffb84d';
          ctx.fillRect(p.x - p.s * 0.3, p.y - p.s - 3 * dpr, p.s * 0.6, 4 * dpr); // 灯盖
          ctx.globalAlpha = 1;
          break;
      }
    }
  }

  let raf = null, last = 0;
  function loop(ts) {
    raf = requestAnimationFrame(loop);
    const dt = ts - last; last = ts;
    step(particleType, dt);
  }
  function startParticles(type) {
    particleType = type;
    particles = [];
    if (raf) cancelAnimationFrame(raf);
    if (reduced || !type || document.hidden) { ctx.clearRect(0, 0, W, H); raf = null; return; }
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
    else startParticles(particleType);
  });

  /* ---------- 应用主题 ---------- */
  let current = null;
  function apply(key) {
    const t = THEMES[key];
    if (!t) return;
    current = key;
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(t.css)) root.setProperty(`--${k}`, v);
    window.dispatchEvent(new CustomEvent('themechange', { detail: t.shader }));
    startParticles(t.particle);
    const btn = document.getElementById('theme-btn');
    if (btn) {
      btn.querySelector('.theme-label').textContent = t.label;
      btn.title = FESTIVALS.some((f) => f.key === key)
        ? `${t.label}主题（节日限定）`
        : `主题：${t.label}（点击切换季节）`;
      btn.classList.toggle('is-festival', FESTIVALS.some((f) => f.key === key));
    }
    localStorage.setItem('theme-name', key);
  }

  /* ---------- 初始化（等 DOM 就绪，确保 main.js 的 themechange 监听已注册） ---------- */
  window.addEventListener('DOMContentLoaded', () => {
    const festival = activeFestival();
    const saved = localStorage.getItem('theme-name');
    const season = seasonOfMonth(new Date().getMonth());
    apply(festival || (THEMES[saved] ? saved : season));

    // 每小时复查一次节日窗口
    setInterval(() => {
      const f = activeFestival();
      if (f && f !== current) apply(f);
      else if (!f && FESTIVALS.some((x) => x.key === current)) apply(seasonOfMonth(new Date().getMonth()));
    }, 3600 * 1000);

    // 切换按钮：循环四季（节日期间点击提示）
    const btn = document.getElementById('theme-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        if (activeFestival()) { btn.title = '节日限定主题生效中，节后恢复四季切换'; return; }
        const idx = SEASONS.indexOf(SEASONS.includes(current) ? current : seasonOfMonth(new Date().getMonth()));
        apply(SEASONS[(idx + 1) % SEASONS.length]);
      });
    }
  });
})();
