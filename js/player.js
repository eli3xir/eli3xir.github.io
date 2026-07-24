/* 全局音乐播放器 v2：歌单列表 / 播放模式 / 跨页续播 / 收起展开 / 大音量条
 * 歌单来源：Meting API（网易云 playlist 6665470324） */
(function () {
  const PLAYLIST_API = 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=6665470324';
  const LS_STATE = 'player-state';
  const LS_LIST = 'player-playlist-cache';

  /* ---------- 样式 ---------- */
  const css = `
    #gm-player {
      position: fixed; left: 16px; bottom: 16px; z-index: 75;
      width: 320px;
      background: color-mix(in srgb, var(--bg, #0a0a0f) 84%, #fff 16%);
      border: 1px solid color-mix(in srgb, var(--fg, #e8e6f0) 16%, transparent);
      border-radius: 14px;
      backdrop-filter: blur(12px);
      color: var(--fg, #e8e6f0);
      font-family: "Space Grotesk", "Noto Sans SC", sans-serif;
      box-shadow: 0 10px 32px rgba(0,0,0,0.45);
      overflow: hidden;
    }
    #gm-player * { box-sizing: border-box; user-select: none; }
    #gm-player.mini { width: 52px; height: 52px; border-radius: 50%; cursor: pointer; }
    #gm-player.mini .gm-head { padding: 0; justify-content: center; height: 100%; }
    #gm-player.mini .gm-info, #gm-player.mini .gm-body, #gm-player.mini .gm-list-wrap, #gm-player.mini .gm-toggle { display: none; }

    #gm-player .gm-head { display: flex; align-items: center; gap: 10px; padding: 10px 12px; }
    #gm-player .gm-cover-box { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: #222; }
    #gm-player .gm-cover-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
    #gm-player.playing .gm-cover-box { animation: gm-spin 12s linear infinite; }
    @keyframes gm-spin { to { transform: rotate(360deg); } }
    #gm-player .gm-info { flex: 1; min-width: 0; }
    #gm-player .gm-title { font-size: 0.84rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #gm-player .gm-artist { font-size: 0.7rem; opacity: 0.6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #gm-player .gm-toggle { background: none; border: none; color: inherit; font-size: 1rem; cursor: pointer; opacity: 0.6; padding: 4px; line-height: 1; }
    #gm-player .gm-toggle:hover { opacity: 1; }

    /* 歌单 */
    #gm-player .gm-list-wrap { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; border-top: 1px solid transparent; }
    #gm-player.list-open .gm-list-wrap { max-height: 260px; border-top-color: color-mix(in srgb, var(--fg, #e8e6f0) 12%, transparent); }
    #gm-player .gm-list { max-height: 260px; overflow-y: auto; scrollbar-width: thin; padding: 6px 0; }
    #gm-player .gm-track {
      display: flex; align-items: baseline; gap: 8px;
      padding: 7px 14px; cursor: pointer; font-size: 0.8rem;
    }
    #gm-player .gm-track:hover { background: color-mix(in srgb, var(--fg, #e8e6f0) 6%, transparent); }
    #gm-player .gm-track .gm-idx { width: 22px; flex-shrink: 0; opacity: 0.45; font-size: 0.7rem; font-variant-numeric: tabular-nums; }
    #gm-player .gm-track .gm-tname { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #gm-player .gm-track .gm-tartist { max-width: 90px; opacity: 0.5; font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #gm-player .gm-track.cur { color: var(--accent2, #00e5c0); }
    #gm-player .gm-track.cur .gm-idx { color: var(--accent2, #00e5c0); opacity: 1; }
    #gm-player .gm-track.bad { opacity: 0.35; text-decoration: line-through; }

    #gm-player .gm-body { padding: 2px 12px 12px; }
    #gm-player .gm-btns { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 6px 0 10px; }
    #gm-player .gm-btns button { background: none; border: none; color: inherit; cursor: pointer; font-size: 1.05rem; opacity: 0.85; padding: 4px; }
    #gm-player .gm-btns button:hover { opacity: 1; }
    #gm-player .gm-btns button.on { color: var(--accent2, #00e5c0); opacity: 1; }
    #gm-player .gm-play { width: 40px; height: 40px; border-radius: 50%; background: var(--accent, #7c5cff) !important; color: #fff !important; font-size: 1rem !important; }
    #gm-player .gm-mode { font-size: 0.9rem !important; width: 30px; }
    #gm-player .gm-progress { display: flex; align-items: center; gap: 8px; font-size: 0.68rem; opacity: 0.9; margin-bottom: 10px; font-variant-numeric: tabular-nums; }
    #gm-player .gm-progress input { flex: 1; accent-color: var(--accent, #7c5cff); height: 3px; cursor: pointer; }
    #gm-player .gm-vol { display: flex; align-items: center; gap: 10px; background: color-mix(in srgb, var(--fg, #e8e6f0) 6%, transparent); border-radius: 10px; padding: 8px 12px; }
    #gm-player .gm-vol input { flex: 1; accent-color: var(--accent2, #00e5c0); height: 5px; cursor: pointer; }
    #gm-player .gm-vol-num { font-size: 0.9rem; font-weight: 700; min-width: 42px; text-align: right; color: var(--accent2, #00e5c0); font-variant-numeric: tabular-nums; }
    #gm-player .gm-err { font-size: 0.72rem; opacity: 0.55; padding: 0 12px 8px; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */
  const el = document.createElement('div');
  el.id = 'gm-player';
  el.innerHTML = `
    <div class="gm-head">
      <div class="gm-cover-box"><img class="gm-cover" alt=""></div>
      <div class="gm-info">
        <div class="gm-title">加载歌单…</div>
        <div class="gm-artist">eli3xir 电台</div>
      </div>
      <button class="gm-toggle" title="收起">−</button>
    </div>
    <div class="gm-list-wrap"><div class="gm-list"></div></div>
    <div class="gm-body">
      <div class="gm-btns">
        <button class="gm-mode" title="顺序播放">🔁</button>
        <button class="gm-prev" title="上一首">⏮</button>
        <button class="gm-play" title="播放/暂停">▶</button>
        <button class="gm-next" title="下一首">⏭</button>
        <button class="gm-listbtn" title="歌单">☰</button>
      </div>
      <div class="gm-progress">
        <span class="gm-cur">0:00</span>
        <input type="range" class="gm-seek" min="0" max="100" value="0" step="0.1">
        <span class="gm-dur">0:00</span>
      </div>
      <div class="gm-vol">
        <span>🔊</span>
        <input type="range" class="gm-volume" min="0" max="100" value="70" step="1">
        <span class="gm-vol-num">70%</span>
      </div>
    </div>
    <div class="gm-err" hidden></div>`;
  document.body.appendChild(el);

  const $ = (s) => el.querySelector(s);
  const audio = new Audio();
  audio.preload = 'none';

  const MODES = [
    { id: 'order', icon: '🔁', name: '顺序播放' },
    { id: 'random', icon: '🔀', name: '随机播放' },
    { id: 'single', icon: '🔂', name: '单曲循环' },
  ];
  let playlist = [];
  let index = 0;
  let mode = 0;
  let wantPlay = false;
  const badTracks = new Set();

  /* ---------- 状态持久化 ---------- */
  function saveState() {
    try {
      localStorage.setItem(LS_STATE, JSON.stringify({
        index, time: audio.currentTime || 0, playing: wantPlay, volume: audio.volume, mode,
      }));
    } catch (_) {}
  }
  function loadState() {
    try { return JSON.parse(localStorage.getItem(LS_STATE)) || {}; } catch (_) { return {}; }
  }
  setInterval(saveState, 2000);
  addEventListener('beforeunload', saveState);

  /* ---------- UI 辅助 ---------- */
  function fmt(t) {
    if (!isFinite(t)) return '0:00';
    return `${(t / 60) | 0}:${String((t % 60) | 0).padStart(2, '0')}`;
  }
  function err(msg) {
    const e = $('.gm-err');
    e.textContent = msg;
    e.hidden = !msg;
    if (msg) setTimeout(() => { e.hidden = true; }, 4000);
  }

  function renderList() {
    const wrap = $('.gm-list');
    wrap.innerHTML = playlist.map((t, i) => `
      <div class="gm-track ${i === index ? 'cur' : ''} ${badTracks.has(i) ? 'bad' : ''}" data-i="${i}">
        <span class="gm-idx">${i === index && wantPlay ? '♪' : i + 1}</span>
        <span class="gm-tname">${t.name || '未知曲目'}</span>
        <span class="gm-tartist">${t.artist || ''}</span>
      </div>`).join('');
    const cur = wrap.querySelector('.cur');
    if (cur && el.classList.contains('list-open')) cur.scrollIntoView({ block: 'nearest' });
  }

  function showTrack() {
    const t = playlist[index];
    if (!t) return;
    $('.gm-title').textContent = `${index + 1}. ${t.name || '未知曲目'}`;
    $('.gm-artist').textContent = t.artist || '';
    if (t.pic && $('.gm-cover').src !== t.pic) $('.gm-cover').src = t.pic;
    if (audio.src !== t.url) audio.src = t.url;
    renderList();
    if (wantPlay) document.title = `♪ ${t.name} · eli3xir`;
  }

  function play() {
    wantPlay = true;
    el.classList.add('playing');
    audio.play().then(() => {
      $('.gm-play').textContent = '⏸';
      showTrack();
    }).catch(() => { $('.gm-play').textContent = '▶'; });
  }
  function pause() {
    wantPlay = false;
    el.classList.remove('playing');
    audio.pause();
    $('.gm-play').textContent = '▶';
    document.title = document.title.replace(/^♪ .* · /, '');
    renderList();
  }
  function goto(i, autoplay = true) {
    index = ((i % playlist.length) + playlist.length) % playlist.length;
    showTrack();
    if (autoplay || wantPlay) play();
  }
  function next() {
    if (mode === 1) goto(((index + 1 + ((Math.random() * (playlist.length - 1)) | 0)) % playlist.length));
    else goto(index + 1);
  }
  function prev() { goto(index - 1); }

  $('.gm-play').addEventListener('click', () => (audio.paused ? play() : pause()));
  $('.gm-next').addEventListener('click', () => next());
  $('.gm-prev').addEventListener('click', prev);
  audio.addEventListener('ended', () => {
    if (mode === 2) { audio.currentTime = 0; play(); } else next();
  });
  // 音源失效：标记并自动跳过
  audio.addEventListener('error', () => {
    badTracks.add(index);
    err(`「${playlist[index]?.name}」加载失败，已跳过`);
    setTimeout(next, 800);
  });

  /* 播放模式 */
  const modeBtn = $('.gm-mode');
  modeBtn.addEventListener('click', () => {
    mode = (mode + 1) % MODES.length;
    modeBtn.textContent = MODES[mode].icon;
    modeBtn.title = MODES[mode].name;
    modeBtn.classList.toggle('on', mode !== 0);
    saveState();
  });

  /* 歌单展开 */
  $('.gm-listbtn').addEventListener('click', () => {
    el.classList.toggle('list-open');
    $('.gm-listbtn').classList.toggle('on', el.classList.contains('list-open'));
    renderList();
  });
  $('.gm-list').addEventListener('click', (e) => {
    const t = e.target.closest('.gm-track');
    if (t) goto(Number(t.dataset.i));
  });

  /* 进度 */
  audio.addEventListener('timeupdate', () => {
    if (audio.duration) $('.gm-seek').value = (audio.currentTime / audio.duration) * 100;
    $('.gm-cur').textContent = fmt(audio.currentTime);
    $('.gm-dur').textContent = fmt(audio.duration);
  });
  $('.gm-seek').addEventListener('input', () => {
    if (audio.duration) audio.currentTime = ($('.gm-seek').value / 100) * audio.duration;
  });

  /* 音量 */
  const volSlider = $('.gm-volume'), volNum = $('.gm-vol-num');
  volSlider.addEventListener('input', () => {
    audio.volume = volSlider.value / 100;
    volNum.textContent = `${volSlider.value}%`;
    saveState();
  });

  /* 收起/展开 */
  $('.gm-toggle').addEventListener('click', (e) => {
    e.stopPropagation(); // 防止冒泡到下面的展开监听
    el.classList.add('mini');
    el.classList.remove('list-open');
  });
  el.addEventListener('click', (e) => {
    if (el.classList.contains('mini')) {
      el.classList.remove('mini');
      e.stopPropagation();
    }
  });

  /* 跨页续播 */
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
      mode = Math.min(st.mode || 0, MODES.length - 1);
      wantPlay = !!st.playing;
      const vol = st.volume != null ? st.volume : 0.7;
      audio.volume = vol;
      volSlider.value = Math.round(vol * 100);
      volNum.textContent = `${Math.round(vol * 100)}%`;
      modeBtn.textContent = MODES[mode].icon;
      modeBtn.title = MODES[mode].name;
      modeBtn.classList.toggle('on', mode !== 0);
      showTrack();
      if (st.time) {
        const seekTo = st.time;
        audio.addEventListener('loadedmetadata', () => { audio.currentTime = seekTo; }, { once: true });
      }
      if (wantPlay) { el.classList.add('playing'); play(); armResume(); }
    } else {
      $('.gm-title').textContent = '歌单加载失败';
      $('.gm-artist').textContent = '网络受限，稍后再试';
    }
  }
  loadPlaylist();
})();
