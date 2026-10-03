export const CHAPTERS = [
  { id: 'home', number: '00', path: '/', label: '房间', title: 'A room for\ncurious minds.', subtitle: '一点好奇心，能走多远？', note: '深夜工作室 · 欢迎随便逛逛', color: '#dcaa65' },
  { id: 'lab', number: '01', path: '/lab/', label: '实验室', title: 'Good ideas\nmake a mess.', subtitle: '让好奇心，发生一点反应。', note: '九个实验 · 无限种意外', color: '#70dfbf' },
  { id: 'blog', number: '02', path: '/blog/', label: '文章', title: 'Thinking,\nin the margins.', subtitle: '写下来，思路才有了形状。', note: '技术笔记 · 思考的存档', color: '#dfbc7a' },
  { id: 'radio', number: '03', path: '/radio/', label: '电台', title: 'A little noise.\nA lot of feeling.', subtitle: '有些想法，适合用声音说。', note: '深夜频率 · 正在调频', color: '#eda18a' },
  { id: 'projects', number: '04', path: '/projects/', label: '项目', title: 'Small builds.\nReal signals.', subtitle: '从一个念头，到真实运行。', note: '系统 · 模型 · 一些折腾', color: '#90bce1' },
  { id: 'about', number: '05', path: '/about/', label: '关于', title: 'The human\nbehind the code.', subtitle: '你好，我是 eli3xir。', note: '代码之外 · 还有生活', color: '#e1bc7a' },
  { id: 'skin', number: '06', path: '/skin/', label: '皮肤', title: 'Same room.\nAnother mood.', subtitle: '给今天，换一种光。', note: '五种色调 · 一间房间', color: '#b7a3df' },
];

export const SKINS = {
  default: { name: '暖黄书房', description: '夜还长，灯还亮。', colors: ['#dfbc7a', '#755139', '#c5a387'], wall: [0.72, 0.65, 0.53] },
  brick: { name: '砖红复古', description: '一杯咖啡的温度。', colors: ['#c78870', '#753d32', '#b99169'], wall: [0.72, 0.48, 0.38] },
  forest: { name: '墨绿工作室', description: '把森林搬进思绪里。', colors: ['#80aa98', '#244a3a', '#c0b089'], wall: [0.42, 0.52, 0.42] },
  ocean: { name: '灰蓝夜晚', description: '灵感正在深海漫游。', colors: ['#91aac6', '#293e56', '#b0bbc9'], wall: [0.48, 0.56, 0.68] },
  cream: { name: '米白极简', description: '留白，也是一种答案。', colors: ['#eee3c9', '#9e8570', '#d1bd96'], wall: [0.88, 0.85, 0.78] },
};

export function readSetting(key, fallback = null, store = undefined) {
  try { return (typeof store==='string'?globalThis[store]:store||globalThis.localStorage).getItem(key) ?? fallback; } catch { return fallback; }
}

export function writeSetting(key, value, store = undefined) {
  try { (typeof store==='string'?globalThis[store]:store||globalThis.localStorage).setItem(key, String(value)); return true; } catch { return false; }
}

export function routeFor(pathname, doc = null) {
  const path = pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  const chapter = CHAPTERS.find(c => c.path.replace(/\/$/, '') === path) ||
    CHAPTERS.find(c => c.id !== 'home' && path.startsWith(c.path)) || CHAPTERS[0];
  const detail = path !== (chapter.path.replace(/\/$/, '') || '/');
  const title = doc?.querySelector('.post-head h1, .demo-hud h1')?.textContent.trim();
  const route={ ...chapter, pathname, detail, article: chapter.id === 'blog' && detail,
    experiment: chapter.id === 'lab' && detail, contentTitle: title || chapter.label };
  if(route.experiment){
    route.experimentId=pathname.split('/').pop().replace('.html','');
    const titles={moon:'A softer\nkind of landing.',ocean:'Some ideas\nset sail.',fluid:'Go with\nthe flow.',trails:'Time leaves\na trace.',galaxy:'There is room\nfor wonder.',glass:'A different\npoint of view.',breakout:'Break things.\nBeautifully.',partext:'Words,\nin motion.',bullet:'Almost hit.\nStill here.'};
    route.title=titles[route.experimentId]||route.title;
    route.subtitle=title||'动动手，让这个念头活起来。';
    route.note='实验 '+route.experimentId.toUpperCase()+' · 往下开始探索';
  }
  return route;
}

export function beatState(time, bpm = 112) {
  const beat = Math.max(0, time) * bpm / 60;
  return { beat, bar: Math.floor(beat / 4), phase: beat % 1,
    pulse: Math.exp(-(beat % 1) * 9), phrase: Math.floor(beat / 16) % 4 };
}

export function nextBeatDelay(time, subdivision = 0.5, bpm = 112) {
  const beat = time * bpm / 60;
  return ((Math.ceil((beat + 0.015) / subdivision) * subdivision - beat) * 60 / bpm);
}

export const MIXES = {
  home: [0.6, 0.38, 0.35, 0.18], lab: [0.52, 0.7, 0.72, 0.65],
  blog: [0.55, 0.28, 0.14, 0.08], radio: [0.6, 0.72, 0.85, 0.72],
  projects: [0.45, 0.66, 0.5, 0.48], about: [0.65, 0.3, 0.48, 0.18],
  skin: [0.6, 0.35, 0.36, 0.15],
};
