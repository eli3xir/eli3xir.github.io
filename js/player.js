/* 全局音乐播放器：跨页面续播（localStorage 同步），大音量条 + 百分比
 * 歌单来源：Meting API（网易云 playlist 6665470324，与原 Hexo 博客一致） */
(function () {
  const PLAYLIST_API = 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=6665470324';
  const LS_STATE = 'player-state';
  const LS_LIST = 'player-playlist-cache';

  /* ---------- 样式注入 ---------- */
  const css = `
    #gm-player {
      position: fixed; left: 16px; bottom: 16px; z-index: 75;
      width: 300px;
      background: color-mix(in srgb, var(--bg, #0a0a0f) 82%, #fff 18%);
      border: 1px solid color-mix(in srgb, var(--fg, #e8e6f0) 16%, transparent);
      border-radius: 14px;
      backdrop-filter: blur(12px);
      color: var(--fg, #e8e6f0);
      font-family: "Space Grotesk", "Noto Sans SC", sans-serif;
      box-shadow: 0 10px 32px rgba(0,0,0,0.4);
      overflow: hidden;
      transition: width 0.25s, height 0.25s;
    }
    #gm-player.mini { width: 52px; height: 52px; border-radius: 50%; cursor: pointer; }
    #gm-player .gm-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; }
    #gm-player.mini .gm-head { padding: 0; justify-content: center; height: 100%; }
    #gm-player img { width: 36px; height: 36px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: #333; }
    #gm-player.mini img { width: 30px; height: 30px; border-radius: 50%; }
    #gm-player .gm-info { flex: 1; min-width: 0; }
    #gm-player .gm-title { font-size: 0.82rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #gm-player .gm-artist { font-size: 0.7rem; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #gm-player.mini .gm-info, #gm-player.mini .gm-body { display: none; }
    #gm-player .gm-toggle { background: none; border: none; color: inherit; font-size: 0.9rem; cursor: pointer; opacity: 0.6; padding: 4px; }
    #gm-player .gm-body { padding: 0 12px 12px; }
    #gm-player .gm-btns { display: flex; align-items: center; justify-content: center; gap: 18px; margin-bottom: 10px; }
    #gm-player .gm-btns button { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.1rem; opacity: 0.85; }
    #gm-player .gm-btns button:hover { opacity: 1; }
    #gm-player .gm-play { width: 38px; height: 38px; border-radius: 50%; background: var(--accent, #7c5cff) !important; color: #fff !important; font-size: 1rem !important; }
    #gm-player .gm-progress { display: flex; align-items: center; gap: 8px; font-size: 0.68rem; opacity: 0.9; margin-bottom: 10px; font-variant-numeric: tabular-nums; }
    #gm-player .gm-progress input { flex: 1; accent-color: var(--accent, #7c5cff); height: 3px; }
    /* 音量区：加大 + 百分比 */
    #gm-player .gm-vol { display: flex; align-items: center; gap: 10px; background: color-mix(in srgb, var(--fg, #e8e6f0) 6%, transparent); border-radius: 10px; padding: 8px 12px; }
    #gm-player .gm-vol .gm-vol-icon { font-size: 1rem; }
    #gm-player .gm-vol input { flex: 1; accent-color: var(--accent2, #00e5c0); height: 5px; cursor: pointer; }
    #gm-player .gm-vol .gm-vol-num { font-size: 0.9rem; font-weight: 700; min-width: 42px; text-align: right; color: var(--accent2, #00e5c0); font-variant-numeric: tabular-nums; }
    #gm-player .gm-err { font-size: 0.75rem; opacity: 0.6; padding: 4px 12px 10px; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */
  const el = document.createElement('div');
  el.id = 'gm-player';
  el.innerHTML = `
    <div class="gm-head">
      <img class="gm-cover" alt="">
      <div class="gm-info">
        <div class="gm-title">加载歌单…</div>
        <div class="gm-artist">eli3xir 电台</div>
      </div>
      <button class="gm-toggle" title="收起/展开">−</button>
    </div>
    <div class="gm-body">
      <div class="gm-btns">
        <button class="gm-prev" title="上一首">⏮</button>
        <button class="gm-play" title="播放/暂停">▶</button>
        <button class="gm-next" title="下一首">⏭</button>
      </div>
      <div class="gm-progress">
        <span class="gm-cur">0:00</span>
        <input type="range" class="gm-seek" min="0" max="100" value="0" step="0.1">
        <span class="gm-dur">0:00</span>
      </div>
      <div class="gm-vol">
        <span class="gm-vol-icon">🔊</span>
        <input type="range" class="gm-volume" min="0" max="100" value="70" step="1">
        <span class="gm-vol-num">70%</span>
      </div>
    </div>`;
  document.body.appendChild(el);

  const $ = (s) => el.querySelector(s);
  const audio = new Audio();
  audio.preload = 'none';
  let playlist = [];
  let index = 0;
  let wantPlay = false;

  /* ---------- 状态持久化 ---------- */
  function saveState() {
    try {
      localStorage.setItem(LS_STATE, JSON.stringify({
        index, time: audio.currentTime || 0, playing: wantPlay, volume: audio.volume,
      }));
    } catch (_) {}
  }
  function loadState() {
    try { return JSON.parse(localStorage.getItem(LS_STATE)) || {}; } catch (_) { return {}; }
  }
  setInterval(saveState, 2000);
  addEventListener('beforeunload', saveState);

  /* ---------- 播放控制 ---------- */
  function fmt(t) {
    if (!isFinite(t)) return '0:00';
    const m = (t / 60) | 0, s = (t % 60) | 0;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  function showTrack() {
    const t = playlist[index];
    if (!t) return;
    $('.gm-title').textContent = t.name || '未知曲目';
    $('.gm-artist').textContent = t.artist || '';
    if (t.pic) { $('.gm-cover').src = t.pic; } else { $('.gm-cover').removeAttribute('src'); }
    if (audio.src !== t.url) { audio.src = t.url; }
    document.title = wantPlay ? `♪ ${t.name} · eli3xir` : document.title.replace(/^♪ .* · /, '');
  }
  function play() {
    wantPlay = true;
    audio.play().then(() => { $('.gm-play').textContent = '⏸'; showTrack(); })
      .catch(() => { $('.gm-play').textContent = '▶'; /* 等用户手势 */ });
  }
  function pause() {
    wantPlay = false;
    audio.pause();
    $('.gm-play').textContent = '▶';
    document.title = document.title.replace(/^♪ .* · /, '');
  }
  function next() { index = (index + 1) % playlist.length; showTrack(); if (wantPlay) play(); }
  function prev() { index = (index - 1 + playlist.length) % playlist.length; showTrack(); if (wantPlay) play(); }

  $('.gm-play').addEventListener('click', () => (audio.paused ? play() : pause()));
  $('.gm-next').addEventListener('click', next);
  $('.gm-prev').addEventListener('click', prev);
  audio.addEventListener('ended', next);

  audio.addEventListener('timeupdate', () => {
    if (audio.duration) $('.gm-seek').value = (audio.currentTime / audio.duration) * 100;
    $('.gm-cur').textContent = fmt(audio.currentTime);
    $('.gm-dur').textContent = fmt(audio.duration);
  });
  $('.gm-seek').addEventListener('input', () => {
    if (audio.duration) audio.currentTime = ($('.gm-seek').value / 100) * audio.duration;
  });

  const volSlider = $('.gm-volume'), volNum = $('.gm-vol-num');
  volSlider.addEventListener('input', () => {
    audio.volume = volSlider.value / 100;
    volNum.textContent = `${volSlider.value}%`;
    saveState();
  });

  /* 收起/展开 */
  $('.gm-toggle').addEventListener('click', () => {
    el.classList.toggle('mini');
    $('.gm-toggle').textContent = el.classList.contains('mini') ? '' : '−';
  });
  el.addEventListener('click', (e) => {
    if (el.classList.contains('mini') && !e.target.closest('.gm-play')) el.classList.remove('mini');
  });

  /* 跨页续播：新页面首个手势恢复播放 */
  function armResume() {
    if (!wantPlay) return;
    const resume = () => { play(); document.removeEventListener('pointerdown', resume); };
    document.addEventListener('pointerdown', resume);
  }

  /* ---------- 加载歌单 ---------- */
  async function loadPlaylist() {
    let list = null;
    try {
      const res = await fetch(PLAYLIST_API);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          list = data.map((t) => ({ name: t.title || t.name, artist: t.author || t.artist, url: t.url, pic: t.pic }));
          try { localStorage.setItem(LS_LIST, JSON.stringify(list)); } catch (_) {}
        }
      }
    } catch (_) {}
    if (!list) {
      try { list = JSON.parse(localStorage.getItem(LS_LIST)); } catch (_) {}
    }
    if (list && list.length) {
      playlist = list;
      const st = loadState();
      index = Math.min(st.index || 0, playlist.length - 1);
      wantPlay = !!st.playing;
      const vol = st.volume != null ? st.volume : 0.7;
      audio.volume = vol;
      volSlider.value = Math.round(vol * 100);
      volNum.textContent = `${Math.round(vol * 100)}%`;
      showTrack();
      if (st.time) {
        const seekTo = st.time;
        audio.addEventListener('loadedmetadata', () => { audio.currentTime = seekTo; }, { once: true });
      }
      if (wantPlay) { play(); armResume(); }
    } else {
      $('.gm-title').textContent = '歌单加载失败';
      $('.gm-artist').textContent = '网络受限，稍后再试';
    }
  }
  loadPlaylist();
})();
