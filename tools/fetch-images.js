/**
 * 图床本地化：扫描 tools/posts/*.md 中的外链图片，下载到 blog/assets/img/，
 * 并把 md 里的链接改写为 /blog/assets/img/<hash>.<ext>。
 * 用法：node tools/fetch-images.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const POSTS_DIR = path.join(__dirname, 'posts');
const IMG_DIR = path.resolve(__dirname, '../assets/img');
const URL_PREFIX = '/assets/img';

const IMG_RE = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)[^)]*\)|<img[^>]+src="(https?:\/\/[^"]+)"/g;

function extOf(url) {
  const m = url.match(/\.(png|jpe?g|gif|webp|svg|bmp)(\?|#|$)/i);
  return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.png';
}

async function download(url, dest) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) throw new Error(`too small (${buf.length}B)`);
    fs.writeFileSync(dest, buf);
    return buf.length;
  } finally {
    clearTimeout(timer);
  }
}

(async () => {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  // 收集所有 URL
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
  const urls = new Set();
  for (const f of files) {
    const src = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    for (const m of src.matchAll(IMG_RE)) urls.add(m[1] || m[2]);
  }
  console.log(`found ${urls.size} external images`);

  let ok = 0;
  const failed = [];
  const map = new Map();
  for (const url of urls) {
    const name = crypto.createHash('md5').update(url).digest('hex').slice(0, 12) + extOf(url);
    const dest = path.join(IMG_DIR, name);
    if (fs.existsSync(dest)) { map.set(url, name); ok++; continue; }
    try {
      const size = await download(url, dest);
      map.set(url, name);
      ok++;
      console.log(`ok  ${(size / 1024).toFixed(0)}KB  ${url}`);
    } catch (e) {
      failed.push([url, e.message]);
      console.log(`FAIL ${e.message}  ${url}`);
    }
  }

  // 改写 md
  let changed = 0;
  for (const f of files) {
    const p = path.join(POSTS_DIR, f);
    let src = fs.readFileSync(p, 'utf8');
    let dirty = false;
    for (const [url, name] of map) {
      if (src.includes(url)) { src = src.split(url).join(`${URL_PREFIX}/${name}`); dirty = true; }
    }
    if (dirty) { fs.writeFileSync(p, src); changed++; }
  }

  console.log(`\ndone: ${ok}/${urls.size} downloaded, ${changed} md files rewritten`);
  if (failed.length) {
    console.log('failed urls (kept external):');
    failed.forEach(([u, why]) => console.log(`  ${why}  ${u}`));
  }
})();
