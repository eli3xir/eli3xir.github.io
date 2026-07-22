import * as THREE from 'three';

document.documentElement.classList.add('js');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ============================================================
 * WebGL 背景：全屏 quad + fbm 流动渐变，鼠标与滚动驱动
 * ============================================================ */
function initGL() {
  const canvas = document.getElementById('gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch (e) {
    canvas.style.background = 'radial-gradient(ellipse at 30% 20%, #1a1430, #0a0a0f)';
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const bufSize = renderer.getDrawingBufferSize(new THREE.Vector2());

  const uniforms = {
    uTime: { value: 0 },
    // 注意：必须用绘图缓冲区的设备像素尺寸，否则高 DPR 屏幕下鼠标坐标错位
    uRes: { value: bufSize.clone() },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uScroll: { value: 0 },
    uBase: { value: new THREE.Color(0x0a0a0f) },   // 底色
    uSign: { value: 1.0 },                         // 1 = 暗底加亮，-1 = 亮底加暗
    uColA: { value: new THREE.Color(0x7c5cff) },   // 主色
    uColB: { value: new THREE.Color(0x00e5c0) },   // 辅色
    uVariant: { value: 0 },                        // 纹理变体
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      void main() { gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform float uTime;
      uniform vec2 uRes;
      uniform vec2 uMouse;
      uniform float uScroll;
      uniform vec3 uColA;
      uniform vec3 uColB;
      uniform vec3 uBase;
      uniform float uSign;
      uniform float uVariant;

      // hash & noise
      vec2 hash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float noise(in vec2 p) {
        const float K1 = 0.366025404;
        const float K2 = 0.211324865;
        vec2 i = floor(p + (p.x + p.y) * K1);
        vec2 a = p - i + (i.x + i.y) * K2;
        vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec2 b = a - o + K2;
        vec2 c = a - 1.0 + 2.0 * K2;
        vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
        vec3 n = h * h * h * h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
        return dot(n, vec3(70.0));
      }
      float fbm(vec2 p) {
        float f = 0.0;
        float w = 0.5;
        for (int i = 0; i < 5; i++) {
          f += w * noise(p);
          p *= 2.0;
          w *= 0.5;
        }
        return f;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uRes.xy;
        vec2 p = uv;
        p.x *= uRes.x / uRes.y;

        float t = uTime * 0.08;
        // 纹理变体：改变噪声频率与流向
        float freq = 1.6 + uVariant * 0.5;
        vec2 flowDir = vec2(t, -t * (0.7 + uVariant * 0.2));
        // 鼠标牵引的域扭曲
        vec2 m = uMouse;
        m.x *= uRes.x / uRes.y;
        float md = length(p - m);
        vec2 warp = vec2(
          fbm(p * freq + flowDir.x),
          fbm(p * freq + flowDir.y + 4.2)
        );
        warp += 0.35 * exp(-md * 2.5) * normalize(p - m + 0.0001);

        float n = fbm(p * (2.2 + uVariant * 0.4) + warp * 1.4 + uScroll * 1.5);

        float vein = smoothstep(0.25, 0.75, n);
        float vein2 = smoothstep(0.55, 0.95, fbm(p * 3.0 - warp + t));

        // 底色 + 明暗两模式（暗底加亮 / 亮底加暗）
        vec3 col = uBase;
        col += uSign * uColA * vein * 0.30;
        col += uSign * uColB * vein2 * 0.15;
        // 鼠标附近扰动提亮/压暗
        col += uSign * uColA * exp(-md * 3.0) * 0.10;
        // 暗角
        float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
        col *= mix(0.55, 1.0, vig);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // 鼠标平滑跟随
  const target = { x: 0.5, y: 0.5 };
  window.addEventListener('pointermove', (e) => {
    target.x = e.clientX / window.innerWidth;
    target.y = 1 - e.clientY / window.innerHeight;
  }, { passive: true });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.getDrawingBufferSize(uniforms.uRes.value);
  });

  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running && !reduced) renderer.setAnimationLoop(loop);
  });

  const clock = new THREE.Clock();
  function loop() {
    uniforms.uTime.value = clock.getElapsedTime();
    const m = uniforms.uMouse.value;
    m.x += (target.x - m.x) * 0.05;
    m.y += (target.y - m.y) * 0.05;
    if (!window.__glPaused) renderer.render(scene, camera);
    if (!running) renderer.setAnimationLoop(null);
  }

  if (reduced) {
    uniforms.uTime.value = 10;
    renderer.render(scene, camera); // 静帧
  } else {
    renderer.setAnimationLoop(loop);
  }
  return uniforms;
}

const glUniforms = initGL();

/* ============================================================
 * 主题应用：theme.js 派发 themechange，这里平滑过渡到目标配色
 * detail: { base, sign, colA, colB, variant }（十六进制数字）
 * ============================================================ */
(function initThemeBridge() {
  if (!glUniforms) return;
  const target = {
    base: new THREE.Color(0x0a0a0f),
    a: new THREE.Color(0x7c5cff),
    b: new THREE.Color(0x00e5c0),
    sign: 1,
    v: 0,
  };
  let first = true;
  window.addEventListener('themechange', (e) => {
    const t = e.detail;
    target.base.setHex(t.base);
    target.a.setHex(t.colA);
    target.b.setHex(t.colB);
    target.sign = t.sign;
    target.v = t.variant;
    if (first) { // 首次直接到位，不做渐变
      first = false;
      glUniforms.uBase.value.copy(target.base);
      glUniforms.uColA.value.copy(target.a);
      glUniforms.uColB.value.copy(target.b);
      glUniforms.uSign.value = target.sign;
      glUniforms.uVariant.value = target.v;
    }
  });
  gsap.ticker.add(() => {
    glUniforms.uBase.value.lerp(target.base, 0.04);
    glUniforms.uColA.value.lerp(target.a, 0.04);
    glUniforms.uColB.value.lerp(target.b, 0.04);
    glUniforms.uSign.value += (target.sign - glUniforms.uSign.value) * 0.04;
    glUniforms.uVariant.value += (target.v - glUniforms.uVariant.value) * 0.04;
  });
})();

/* ============================================================
 * Lenis 平滑滚动 + GSAP ScrollTrigger
 * ============================================================ */
gsap.registerPlugin(ScrollTrigger);

let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// 滚动进度 → shader 色相流动
ScrollTrigger.create({
  start: 0,
  end: () => document.documentElement.scrollHeight - window.innerHeight,
  onUpdate: (self) => {
    if (glUniforms) glUniforms.uScroll.value = self.progress;
  },
});

// 导航锚点走 Lenis
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { offset: -20 });
    else el.scrollIntoView({ behavior: 'smooth' });
  });
});

/* ============================================================
 * 加载屏
 * ============================================================ */
function initLoader(onDone) {
  const loader = document.getElementById('loader');
  const count = loader.querySelector('.loader-count');
  if (reduced) {
    loader.remove();
    onDone();
    return;
  }
  const state = { p: 0 };
  gsap.to(state, {
    p: 100,
    duration: 1.4,
    ease: 'power2.inOut',
    onUpdate: () => { count.textContent = `${Math.round(state.p)}%`; },
    onComplete: () => {
      gsap.to(loader, {
        yPercent: -100,
        duration: 0.8,
        ease: 'power4.inOut',
        onComplete: () => { loader.remove(); onDone(); },
      });
    },
  });
}

/* ============================================================
 * 文本切分 & 入场
 * ============================================================ */
document.querySelectorAll('.split').forEach((el) => {
  const text = el.textContent;
  el.textContent = '';
  el.setAttribute('aria-label', text);
  for (const ch of text) {
    const span = document.createElement('span');
    span.className = 'char';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = ch === ' ' ? ' ' : ch;
    el.appendChild(span);
  }
});

function heroIntro() {
  if (reduced) { startTyped(); return; }
  gsap.fromTo('.hero-title .char',
    { y: '110%' },
    { y: 0, duration: 1.1, ease: 'power4.out', stagger: 0.06 });
  startTyped();
}

// 区块标题字符升起
document.querySelectorAll('.section-title .split').forEach((el) => {
  if (reduced) return;
  gsap.fromTo(el.querySelectorAll('.char'),
    { y: '110%' },
    {
      y: 0,
      duration: 0.9,
      ease: 'power4.out',
      stagger: 0.04,
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
});

// 通用 reveal
document.querySelectorAll('.reveal').forEach((el) => {
  if (reduced) return;
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

// 数字滚动
document.querySelectorAll('.fact-num').forEach((el) => {
  const end = Number(el.dataset.count);
  if (reduced) { el.textContent = end; return; }
  const state = { v: 0 };
  gsap.to(state, {
    v: end,
    duration: 1.6,
    ease: 'power2.out',
    snap: { v: 1 },
    onUpdate: () => { el.textContent = state.v; },
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

/* ============================================================
 * 项目区：pin 住后横向滚动（宽屏 & 非减弱动效）
 * ============================================================ */
if (!reduced && window.matchMedia('(min-width: 900px)').matches) {
  const track = document.querySelector('.work-track');
  const bar = document.querySelector('.work-progress span');
  if (track) {
    const dist = () => track.scrollWidth - window.innerWidth;
    gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.work-section',
        start: 'top top',
        end: () => '+=' + dist(),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => { if (bar) bar.style.transform = `scaleX(${self.progress})`; },
      },
    });
  }
}

/* ============================================================
 * Hero 标题：鼠标悬停字符散开，离开弹性重组
 * ============================================================ */
(function heroScatter() {
  const title = document.querySelector('.hero-title');
  if (!title || !finePointer || reduced) return;
  const chars = [...title.querySelectorAll('.char')];
  let scattered = false;

  title.addEventListener('pointerenter', () => {
    scattered = true;
    chars.forEach((c) => {
      gsap.to(c, {
        x: gsap.utils.random(-90, 90),
        y: gsap.utils.random(-60, 60),
        rotation: gsap.utils.random(-30, 30),
        opacity: 0.55,
        duration: 0.7,
        ease: 'power3.out',
      });
    });
  });
  title.addEventListener('pointerleave', () => {
    scattered = false;
    chars.forEach((c, i) => {
      gsap.to(c, {
        x: 0, y: 0, rotation: 0, opacity: 1,
        duration: 1.1,
        delay: i * 0.03,
        ease: 'elastic.out(1, 0.55)',
      });
    });
  });
  // 悬停中移出窗口兜底
  window.addEventListener('blur', () => { if (scattered) title.dispatchEvent(new Event('pointerleave')); });
})();

/* ============================================================
 * 打字机
 * ============================================================ */
function startTyped() {
  const el = document.getElementById('typed');
  const lines = ['写代码，也写 shader。', '把浏览器当成游戏机。', 'Java / Python / JavaScript 全栈折腾中。'];
  if (reduced) { el.textContent = lines[0]; return; }
  let li = 0, ci = 0, deleting = false;
  (function tick() {
    const line = lines[li];
    ci += deleting ? -1 : 1;
    el.textContent = line.slice(0, ci);
    let delay = deleting ? 40 : 90;
    if (!deleting && ci === line.length) { delay = 1800; deleting = true; }
    else if (deleting && ci === 0) { deleting = false; li = (li + 1) % lines.length; delay = 400; }
    setTimeout(tick, delay);
  })();
}

/* ============================================================
 * 跑马灯
 * ============================================================ */
document.querySelectorAll('.marquee').forEach((wrap) => {
  const track = wrap.querySelector('.marquee-track');
  // 复制内容直到足够宽，实现无缝滚动
  const html = track.innerHTML;
  while (track.scrollWidth < window.innerWidth * 2) track.innerHTML += html;
  if (reduced) return;
  const reverse = wrap.classList.contains('reverse');
  const speed = Number(wrap.dataset.speed || 1);
  gsap.fromTo(track,
    { xPercent: reverse ? -50 : 0 },
    { xPercent: reverse ? 0 : -50, duration: 28 / speed, ease: 'none', repeat: -1 });
});

/* ============================================================
 * 卡片倾斜 + 光斑跟随
 * ============================================================ */
if (finePointer && !reduced) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      ry((px - 0.5) * 12);
      rx((0.5 - py) * 12);
      card.style.setProperty('--gx', `${px * 100}%`);
      card.style.setProperty('--gy', `${py * 100}%`);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* ============================================================
 * 自定义光标
 * ============================================================ */
if (finePointer && !reduced) {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  // 用 xPercent 居中，避免覆盖 CSS transform 造成错位
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
  const rx2 = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3' });
  const ry2 = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    dx(e.clientX); dy(e.clientY); rx2(e.clientX); ry2(e.clientY);
  }, { passive: true });
  document.querySelectorAll('[data-hover]').forEach((el) => {
    el.addEventListener('pointerenter', () => ring.classList.add('is-hover'));
    el.addEventListener('pointerleave', () => ring.classList.remove('is-hover'));
  });
}

/* ============================================================
 * 启动
 * ============================================================ */
document.getElementById('year').textContent = new Date().getFullYear();
initLoader(heroIntro);
