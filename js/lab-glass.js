/* 液态玻璃：透镜跟随鼠标（惯性缓动），第二块小透镜反向跟随 */
(function () {
  const l1 = document.getElementById('lens1');
  const l2 = document.getElementById('lens2');
  let mx = innerWidth / 2, my = innerHeight / 2;
  let x1 = mx, y1 = my, x2 = mx, y2 = my;

  addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

  function loop() {
    requestAnimationFrame(loop);
    // 主透镜：慢速跟随（液体迟滞感）
    x1 += (mx - x1) * 0.06;
    y1 += (my - y1) * 0.06;
    l1.style.left = (x1 - 170) + 'px';
    l1.style.top = (y1 - 110) + 'px';
    // 小透镜：反向 + 更慢
    x2 += ((innerWidth - mx) - x2) * 0.04;
    y2 += ((innerHeight - my) - y2) * 0.04;
    l2.style.left = (x2 - 95) + 'px';
    l2.style.top = (y2 - 95) + 'px';
  }
  loop();
})();
