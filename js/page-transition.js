/* 页面遮罩转场：同源 .html 页面间切换时的双层擦除动画（零依赖，自动注入样式） */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const css = `
    .pt-mask { position: fixed; inset: 0; z-index: 96; pointer-events: none; }
    .pt-mask i {
      position: absolute; inset: -2% 0;
      transform: translateY(102%);
      transition: transform 0.45s cubic-bezier(0.76, 0, 0.24, 1);
    }
    .pt-mask .pt-l1 { background: var(--accent, #7c5cff); }
    .pt-mask .pt-l2 { background: var(--bg, #0a0a0f); transition-delay: 0.08s; }
    /* 进入新页面：从覆盖状态滑出 */
    .pt-mask.pt-out i { transform: translateY(-102%); }
    .pt-mask.pt-out .pt-l1 { transition-delay: 0.08s; }
    .pt-mask.pt-out .pt-l2 { transition-delay: 0s; }
    /* 离开当前页面：滑入覆盖 */
    .pt-mask.pt-in { pointer-events: auto; }
    .pt-mask.pt-in i { transform: translateY(0); }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const mask = document.createElement('div');
  mask.className = 'pt-mask';
  mask.setAttribute('aria-hidden', 'true');
  mask.innerHTML = '<i class="pt-l1"></i><i class="pt-l2"></i>';

  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(mask);
    // 只有从其他页面跳转过来才播放揭开动画（用 sessionStorage 标记）
    if (sessionStorage.getItem('pt-nav')) {
      sessionStorage.removeItem('pt-nav');
      mask.classList.add('pt-in');
      // 强制 reflow 后再滑出
      void mask.offsetWidth;
      requestAnimationFrame(() => {
        mask.classList.remove('pt-in');
        mask.classList.add('pt-out');
        setTimeout(() => mask.classList.remove('pt-out'), 900);
      });
    }
  });

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname) return; // 纯锚点
    if (!/\.html$/.test(url.pathname) && !url.pathname.endsWith('/')) return;
    e.preventDefault();
    sessionStorage.setItem('pt-nav', '1');
    mask.classList.remove('pt-out');
    mask.classList.add('pt-in');
    setTimeout(() => { location.href = url.href; }, 520);
  });
})();
