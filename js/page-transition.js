/* 页面转场引擎：6 种可选转场效果（截屏 + canvas 动画）
 * 选择持久化 localStorage('transition')，UI 由皮肤中心的「转场」标签页调用 */
(function () {
  const LS_KEY = 'transition';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 转场注册表 ---------- */
  const TRANSITIONS = [
    { id: 'wipe', name: '简约擦除', tags: ['默认', '快'], desc: '双色块先后擦过屏幕', needSnap: false },
    { id: 'crumple', name: '报纸揉团', tags: ['物理', '花哨'], desc: '把页面揉成一团扔出去', needSnap: true },
    { id: 'shatter', name: '玻璃碎裂', tags: ['物理', '逼真'], desc: '以点击处为撞击点，页面碎成玻璃渣坠落', needSnap: true },
    { id: 'dissolve', name: '像素溶解', tags: ['粒子'], desc: '页面崩解成像素块四散飞离', needSnap: true },
    { id: 'blinds', name: '百叶窗', tags: ['经典'], desc: '横条交替滑出，像拉开百叶窗', needSnap: true },
    { id: 'vortex', name: '旋涡吸收', tags: ['花哨'], desc: '整页旋转着被吸进点击处', needSnap: true },
  ];

  function current() {
    const id = localStorage.getItem(LS_KEY);
    return TRANSITIONS.some((t) => t.id === id) ? id : 'wipe';
  }

  /* ---------- html2canvas 懒加载 ---------- */
  let h2cPromise = null;
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve();
    if (h2cPromise) return h2cPromise;
    h2cPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/vendor/html2canvas.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return h2cPromise;
  }

  async function snapshot() {
    await loadH2C();
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0a0a0f';
    return await html2canvas(document.body, {
      scale: Math.min(devicePixelRatio, 2) * 0.8,
      backgroundColor: bg,
      logging: false,
      useCORS: true,
      onclone(doc) {
        // html2canvas 不支持 color-mix()：在克隆文档里剔除相关声明
        for (const st of doc.querySelectorAll('style')) {
          st.textContent = st.textContent.replace(/[^{}]*\{[^{}]*color-mix[^{}]*\}/g, '');
        }
        for (const ss of doc.styleSheets) {
          try {
            for (let i = ss.cssRules.length - 1; i >= 0; i--) {
              if (ss.cssRules[i].cssText.includes('color-mix')) ss.deleteRule(i);
            }
          } catch (_) { /* 跨域样式表跳过 */ }
        }
      },
    });
  }

  /* ---------- 覆盖层 ---------- */
  function makeOverlay() {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:97;pointer-events:auto';
    document.body.appendChild(c);
    c.width = innerWidth * Math.min(devicePixelRatio, 2);
    c.height = innerHeight * Math.min(devicePixelRatio, 2);
    return c;
  }
  const easeIn = (t) => t * t * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ================================================================
   * 效果实现：全部接收 (img, clickX, clickY, done)
   * ================================================================ */
  const effects = {
    /* --- 报纸揉团：水平切片错位 + 收缩成团 + 抛物线扔出 --- */
    crumple(img, cx, cy, done) {
      const c = makeOverlay();
      const x = c.getContext('2d');
      const SLICES = 28;
      const sh = img.height / SLICES;
      const seed = Array.from({ length: SLICES }, () => (Math.random() - 0.5) * 2);
      const T0 = performance.now();
      const D1 = 900, D2 = 700;
      (function frame() {
        const el = performance.now() - T0;
        x.clearRect(0, 0, c.width, c.height);
        x.fillStyle = 'rgba(0,0,0,0.85)';
        x.fillRect(0, 0, c.width, c.height);
        if (el < D1) {
          // 阶段一：揉皱
          const p = easeIn(el / D1);
          const sc = 1 - p * 0.45;
          const dw = img.width * sc, dh = img.height * sc;
          const ox = (c.width - dw) / 2, oy = (c.height - dh) / 2;
          // 阴影
          x.save();
          x.globalAlpha = 0.4 * p;
          x.fillStyle = '#000';
          x.beginPath();
          x.ellipse(c.width / 2, oy + dh + 20, dw * 0.45, 18 + p * 10, 0, 0, 6.29);
          x.fill();
          x.restore();
          for (let i = 0; i < SLICES; i++) {
            const off = seed[i] * p * 60 * Math.sin(i * 0.7);
            const squeeze = 1 - Math.abs(seed[i]) * p * 0.35;
            x.drawImage(img, 0, i * sh, img.width, sh, ox + off * sc, oy + i * sh * sc * squeeze, dw, sh * sc * squeeze + 1);
          }
          // 褶皱阴影线
          x.globalAlpha = p * 0.5;
          for (let i = 0; i < SLICES; i += 3) {
            x.fillStyle = 'rgba(0,0,0,0.35)';
            x.fillRect(ox + seed[i] * p * 40, oy + i * sh * sc, dw, 2);
          }
          x.globalAlpha = 1;
        } else {
          // 阶段二：扔出（抛物线 + 旋转缩小）
          const p = easeIn(Math.min((el - D1) / D2, 1));
          const bx = c.width / 2 + p * c.width * 0.9;
          const by = c.height / 2 - Math.sin(p * Math.PI) * c.height * 0.55 + p * c.height * 0.3;
          x.save();
          x.translate(bx, by);
          x.rotate(p * 6);
          const s = 0.55 * (1 - p * 0.8);
          x.globalAlpha = 1 - p * 0.6;
          x.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
          x.restore();
          if (p >= 1) { c.remove(); done(); return; }
        }
        requestAnimationFrame(frame);
      })();
    },

    /* --- 玻璃碎裂：抖动三角网格碎片，按撞击距离延迟坠落 --- */
    shatter(img, cx, cy, done) {
      const c = makeOverlay();
      const x = c.getContext('2d');
      const sx = c.width / innerWidth, sy = c.height / innerHeight;
      const ix = cx * sx, iy = cy * sy; // 撞击点（canvas 坐标）
      // 抖动网格生成三角碎片
      const COLS = 9, ROWS = 6;
      const pts = [];
      for (let j = 0; j <= ROWS; j++) {
        pts[j] = [];
        for (let i = 0; i <= COLS; i++) {
          const edge = i === 0 || j === 0 || i === COLS || j === ROWS;
          pts[j][i] = {
            x: (i / COLS) * c.width + (edge ? 0 : (Math.random() - 0.5) * c.width / COLS * 0.9),
            y: (j / ROWS) * c.height + (edge ? 0 : (Math.random() - 0.5) * c.height / ROWS * 0.9),
          };
        }
      }
      const shards = [];
      for (let j = 0; j < ROWS; j++)
        for (let i = 0; i < COLS; i++) {
          const quad = [pts[j][i], pts[j][i + 1], pts[j + 1][i + 1], pts[j + 1][i]];
          shards.push([quad[0], quad[1], quad[2]]);
          shards.push([quad[0], quad[2], quad[3]]);
        }
      const maxD = Math.hypot(c.width, c.height);
      shards.forEach((s) => {
        const cxm = (s[0].x + s[1].x + s[2].x) / 3;
        const cym = (s[0].y + s[1].y + s[2].y) / 3;
        const d = Math.hypot(cxm - ix, cym - iy);
        s.delay = (d / maxD) * 350;
        s.vy = 2 + Math.random() * 4;
        s.vx = (cxm - ix) / maxD * 14 + (Math.random() - 0.5) * 3;
        s.rot = (Math.random() - 0.5) * 0.25;
        s.cxm = cxm; s.cym = cym;
      });
      const T0 = performance.now();
      const DUR = 1500;
      (function frame() {
        const el = performance.now() - T0;
        x.clearRect(0, 0, c.width, c.height);
        x.fillStyle = 'rgba(0,0,0,0.85)';
        x.fillRect(0, 0, c.width, c.height);
        let alive = 0;
        for (const s of shards) {
          const t = el - s.delay;
          if (t < 0) { alive++; drawShard(s, 0, 0, 0, 1); continue; }
          const tt = t / 1000;
          const dy = s.vy * tt * 60 + 400 * tt * tt; // 重力加速
          const dx = s.vx * tt * 60;
          const rot = s.rot * tt * 10;
          const alpha = Math.max(0, 1 - t / (DUR - s.delay));
          if (alpha <= 0) continue;
          alive++;
          drawShard(s, dx, dy, rot, alpha);
        }
        function drawShard(s, dx, dy, rot, alpha) {
          x.save();
          x.globalAlpha = alpha;
          x.translate(s.cxm + dx, s.cym + dy);
          x.rotate(rot);
          x.beginPath();
          x.moveTo(s[0].x - s.cxm, s[0].y - s.cym);
          x.lineTo(s[1].x - s.cxm, s[1].y - s.cym);
          x.lineTo(s[2].x - s.cxm, s[2].y - s.cym);
          x.closePath();
          x.clip();
          x.drawImage(img, -s.cxm, -s.cym, img.width, img.height);
          // 碎玻璃边缘高光
          x.globalAlpha = alpha * 0.5;
          x.strokeStyle = 'rgba(255,255,255,0.6)';
          x.lineWidth = 1;
          x.stroke();
          x.restore();
        }
        if (alive === 0 || el > DUR + 400) { c.remove(); done(); return; }
        requestAnimationFrame(frame);
      })();
    },

    /* --- 像素溶解 --- */
    dissolve(img, cx, cy, done) {
      const c = makeOverlay();
      const x = c.getContext('2d');
      const TILE = Math.max(18, (c.width / 48) | 0);
      const tiles = [];
      for (let j = 0; j * TILE < img.height; j++)
        for (let i = 0; i * TILE < img.width; i++)
          tiles.push({ i, j, vx: (Math.random() - 0.5) * 22, vy: -Math.random() * 16, rot: (Math.random() - 0.5) * 0.4, delay: Math.random() * 350 });
      const T0 = performance.now();
      const DUR = 1400;
      (function frame() {
        const el = performance.now() - T0;
        x.clearRect(0, 0, c.width, c.height);
        x.fillStyle = 'rgba(0,0,0,0.85)';
        x.fillRect(0, 0, c.width, c.height);
        let alive = 0;
        for (const t of tiles) {
          const te = el - t.delay;
          if (te < 0) { alive++; drawTile(t, 0, 0, 0, 1); continue; }
          const tt = te / 1000;
          const alpha = Math.max(0, 1 - te / (DUR - t.delay));
          if (alpha <= 0) continue;
          alive++;
          drawTile(t, t.vx * tt * 30, t.vy * tt * 30 + 300 * tt * tt, t.rot * tt * 8, alpha);
        }
        function drawTile(t, dx, dy, rot, alpha) {
          x.save();
          x.globalAlpha = alpha;
          x.translate(t.i * TILE + TILE / 2 + dx, t.j * TILE + TILE / 2 + dy);
          x.rotate(rot);
          x.drawImage(img, t.i * TILE, t.j * TILE, TILE, TILE, -TILE / 2, -TILE / 2, TILE, TILE);
          x.restore();
        }
        if (alive === 0 || el > DUR + 400) { c.remove(); done(); return; }
        requestAnimationFrame(frame);
      })();
    },

    /* --- 百叶窗 --- */
    blinds(img, cx, cy, done) {
      const c = makeOverlay();
      const x = c.getContext('2d');
      const ROWS = 12;
      const sh = img.height / ROWS;
      const T0 = performance.now();
      const DUR = 900;
      (function frame() {
        const el = performance.now() - T0;
        x.clearRect(0, 0, c.width, c.height);
        x.fillStyle = 'rgba(0,0,0,0.9)';
        x.fillRect(0, 0, c.width, c.height);
        let allOut = true;
        for (let i = 0; i < ROWS; i++) {
          const p = Math.min(Math.max((el - i * 55) / DUR, 0), 1);
          if (p < 1) allOut = false;
          const dir = i % 2 === 0 ? -1 : 1;
          const off = easeIn(p) * c.width * dir;
          x.drawImage(img, 0, i * sh, img.width, sh, off, i * sh, img.width, sh + 1);
        }
        if (allOut) { c.remove(); done(); return; }
        requestAnimationFrame(frame);
      })();
    },

    /* --- 旋涡吸收 --- */
    vortex(img, cx, cy, done) {
      const c = makeOverlay();
      const x = c.getContext('2d');
      const sx = c.width / innerWidth, sy = c.height / innerHeight;
      const tx = cx * sx, ty = cy * sy;
      const T0 = performance.now();
      const DUR = 1000;
      (function frame() {
        const el = performance.now() - T0;
        const p = Math.min(el / DUR, 1);
        x.clearRect(0, 0, c.width, c.height);
        x.fillStyle = 'rgba(0,0,0,0.85)';
        x.fillRect(0, 0, c.width, c.height);
        // 三层拖影
        for (let k = 2; k >= 0; k--) {
          const pk = Math.max(p - k * 0.06, 0);
          const e = easeIn(pk);
          x.save();
          x.globalAlpha = (k === 0 ? 1 : 0.25) * (1 - e);
          x.translate(tx + (c.width / 2 - tx) * (1 - e), ty + (c.height / 2 - ty) * (1 - e));
          x.rotate(e * Math.PI * 3);
          x.scale(1 - e, 1 - e);
          x.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
          x.restore();
        }
        if (p >= 1) { c.remove(); done(); return; }
        requestAnimationFrame(frame);
      })();
    },
  };

  /* ---------- 擦除（原效果，无需截屏） ---------- */
  function wipe(done) {
    const css = `
      .pt-mask { position: fixed; inset: 0; z-index: 97; pointer-events: auto; }
      .pt-mask i { position: absolute; inset: -2% 0; transform: translateY(102%); transition: transform 0.45s cubic-bezier(0.76,0,0.24,1); }
      .pt-mask .pt-l1 { background: var(--accent, #7c5cff); }
      .pt-mask .pt-l2 { background: var(--bg, #0a0a0f); transition-delay: 0.08s; }
      .pt-mask.pt-in i { transform: translateY(0); }
    `;
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    const mask = document.createElement('div');
    mask.className = 'pt-mask';
    mask.innerHTML = '<i class="pt-l1"></i><i class="pt-l2"></i>';
    document.body.appendChild(mask);
    requestAnimationFrame(() => {
      mask.classList.add('pt-in');
      setTimeout(() => { mask.remove(); st.remove(); done(); }, 550);
    });
  }

  /* ---------- 进入新页面的淡入 ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('pt-nav')) {
      sessionStorage.removeItem('pt-nav');
      document.body.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease-out' });
    }
  });

  /* ---------- 拦截站内跳转 ---------- */
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return;
    if (!/\.html$/.test(url.pathname) && !url.pathname.endsWith('/')) return;
    e.preventDefault();
    sessionStorage.setItem('pt-nav', '1');

    const id = reduced ? 'wipe' : current();
    const navigate = () => { location.href = url.href; };
    if (id === 'wipe') { wipe(navigate); return; }

    // 截屏期间的即时反馈：点击处扩散光圈
    const ripple = document.createElement('div');
    ripple.style.cssText = `position:fixed;z-index:96;left:${e.clientX}px;top:${e.clientY}px;width:12px;height:12px;
      border-radius:50%;border:2px solid var(--accent,#7c5cff);pointer-events:none;
      transform:translate(-50%,-50%);animation:pt-ripple 0.7s ease-out infinite`;
    const rippleCss = document.createElement('style');
    rippleCss.textContent = '@keyframes pt-ripple{from{transform:translate(-50%,-50%) scale(1);opacity:1}to{transform:translate(-50%,-50%) scale(9);opacity:0}}';
    document.head.appendChild(rippleCss);
    document.body.appendChild(ripple);

    // 截屏 → 播放效果 → 跳转
    snapshot().then((img) => {
      ripple.remove();
      rippleCss.remove();
      effects[id](img, e.clientX, e.clientY, navigate);
    }).catch(() => { ripple.remove(); rippleCss.remove(); navigate(); });
  });

  /* ---------- 对外：注册表（皮肤中心 UI 用） ---------- */
  window.__transitions = {
    list: TRANSITIONS,
    current,
    set(id) { if (TRANSITIONS.some((t) => t.id === id)) localStorage.setItem(LS_KEY, id); },
  };
})();
