/* 博客列表页：搜索 + 标签过滤 */
(function () {
  const input = document.getElementById('search');
  const items = [...document.querySelectorAll('.post-item')];
  const hint = document.querySelector('.empty-hint');
  const tagBtns = [...document.querySelectorAll('.tag-btn')];
  let activeTag = null;

  function apply() {
    const q = input.value.trim().toLowerCase();
    let visible = 0;
    for (const li of items) {
      const okQ = !q || li.dataset.title.includes(q) || li.dataset.tags.includes(q);
      const okT = !activeTag || li.dataset.tags.split(',').includes(activeTag);
      const show = okQ && okT;
      li.style.display = show ? '' : 'none';
      if (show) visible++;
    }
    hint.hidden = visible > 0;
  }

  input.addEventListener('input', apply);

  for (const btn of tagBtns) {
    btn.addEventListener('click', () => {
      if (activeTag === btn.dataset.tag) {
        activeTag = null;
        btn.classList.remove('active');
      } else {
        activeTag = btn.dataset.tag;
        tagBtns.forEach((b) => b.classList.toggle('active', b === btn));
      }
      apply();
    });
  }
})();
