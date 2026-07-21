/* 文章页增强：右侧浮动目录（TOC）+ 滚动高亮 + 代码块顶栏 */
(function () {
  const content = document.querySelector('.post-content');
  if (!content) return;

  /* ---------- 代码块加顶栏 ---------- */
  content.querySelectorAll('pre.hljs').forEach((pre) => {
    const bar = document.createElement('div');
    bar.className = 'code-bar';
    bar.innerHTML = '<i></i><i></i><i></i>';
    pre.parentNode.insertBefore(bar, pre);
    bar.appendChild(pre); // 包进 .code-bar 里
    pre.classList.add('has-bar');
  });

  /* ---------- 生成目录 ---------- */
  const heads = [...content.querySelectorAll('h1, h2, h3')];
  if (heads.length < 2) return;

  const toc = document.createElement('nav');
  toc.className = 'toc';
  toc.innerHTML = '<div class="toc-title">目录</div>';
  const list = document.createElement('ul');
  toc.appendChild(list);

  heads.forEach((h, i) => {
    if (!h.id) h.id = `h-${i}`;
    const li = document.createElement('li');
    li.className = `toc-lv${h.tagName[1]}`;
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${h.id}`);
    });
    li.appendChild(a);
    list.appendChild(li);
  });
  document.body.appendChild(toc);

  /* ---------- 滚动高亮（scrollspy） ---------- */
  const links = [...list.querySelectorAll('a')];
  let active = null;
  function spy() {
    const y = window.scrollY + 100;
    let current = 0;
    heads.forEach((h, i) => { if (h.offsetTop <= y) current = i; });
    if (current !== active) {
      active = current;
      links.forEach((a, i) => a.classList.toggle('active', i === current));
      // 让高亮项滚动到目录可视区
      links[current]?.scrollIntoView({ block: 'nearest' });
    }
  }
  window.addEventListener('scroll', spy, { passive: true });
  spy();
})();
