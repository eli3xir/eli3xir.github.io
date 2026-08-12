/* Floating "back to room" pill — injected on all landing pages */
(function () {
  if (location.pathname === '/' || location.pathname === '/index.html') return;
  const a = document.createElement('a');
  a.href = '/';
  a.textContent = '⌂ 回到房间';
  a.title = '返回 3D 房间首页';
  a.style.cssText = [
    'position:fixed', 'right:22px', 'bottom:22px', 'z-index:9999',
    'background:rgba(30,22,14,.88)', 'color:#ffd9a0',
    'border:1px solid #6b5335', 'border-radius:20px',
    'padding:8px 18px', 'font:13px "Microsoft YaHei",sans-serif',
    'text-decoration:none', 'box-shadow:0 4px 14px rgba(0,0,0,.35)',
    'transition:background .2s,transform .2s',
  ].join(';');
  a.onmouseenter = () => { a.style.background = 'rgba(60,45,28,.95)'; a.style.transform = 'translateY(-2px)'; };
  a.onmouseleave = () => { a.style.background = 'rgba(30,22,14,.88)'; a.style.transform = ''; };
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(a));
})();
