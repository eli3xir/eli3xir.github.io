/* 点击粒子特效：在点击处迸发一小簇霓虹粒子 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:80;pointer-events:none';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth * Math.min(devicePixelRatio, 2);
    canvas.height = window.innerHeight * Math.min(devicePixelRatio, 2);
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  let raf = null;

  function colors() {
    const cs = getComputedStyle(document.documentElement);
    return [cs.getPropertyValue('--accent').trim() || '#7c5cff',
            cs.getPropertyValue('--accent2').trim() || '#00e5c0'];
  }

  window.addEventListener('pointerdown', (e) => {
    const dpr = Math.min(devicePixelRatio, 2);
    const [c1, c2] = colors();
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: e.clientX * dpr,
        y: e.clientY * dpr,
        vx: Math.cos(angle) * speed * dpr,
        vy: Math.sin(angle) * speed * dpr - 1.5 * dpr,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        size: (2 + Math.random() * 3) * dpr,
        color: Math.random() < 0.5 ? c1 : c2,
      });
    }
    if (!raf) loop();
  }, { passive: true });

  function loop() {
    raf = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12 * Math.min(devicePixelRatio, 2); // 重力
      p.vx *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (!particles.length) {
      cancelAnimationFrame(raf);
      raf = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
})();
