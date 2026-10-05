const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const dirs=['about','projects','radio','skin','blog','lab'];let count=0;
const map={imports:{three:'/vendor/three/three.module.min.js','three/addons/':'/vendor/three/addons/','pixi.js':'/vendor/pixi/pixi.min.mjs'}};
function integrate(source,isLab=false){
  let html=source.replace(/\s*<script\b[^>]*src=["'][^"']*\/(?:click-fx|page-transition|player|back-to-room|blog|post)\.js["'][^>]*>\s*<\/script>/g,'');
  html=html.replace(/\s*<link\b[^>]*href=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com[^>]*>/g,'');
  if(isLab){
    html=html.replace(/<script\b([^>]*?\s)src=["'](\/js\/lab-[^"']+\.js)["']([^>]*)>\s*<\/script>/g,(_,before,src,after)=>`<script type="application/x-lab" data-src="${src}" data-module="${/type=["']module/.test(before+after)}"></script>`);
    html=html.replace(/\s*<script type="application\/x-lab" data-src="\/js\/experience\/lab-host\.js"[^>]*><\/script>/g,'');
    html=html.replace(/<script type="application\/x-lab" data-src="([^"]+)" data-module="[^"]+"><\/script>/g,(_,src)=>{
      const file=path.join(root,src);const module=/^import\s|^export\s/m.test(fs.readFileSync(file,'utf8'));
      return `<script type="application/x-lab" data-src="${src}" data-module="${module}"></script>`;
    });
  }
  html=html.replace(/\s*<script type="importmap">[\s\S]*?<\/script>/g,'');
  html=html.replace(/\s*<script\b[^>]*src=["']\/js\/experience\/preload\.js["'][^>]*>\s*<\/script>/g,'');
  if(!html.includes('data-experience-style'))html=html.replace('</head>','  <link rel="stylesheet" href="/css/experience.css" data-experience-style>\n</head>');
  html=html.replace('</head>',`  <script type="importmap">${JSON.stringify(map)}</script>\n  <script async src="/js/experience/preload.js"></script>\n</head>`);
  if(!html.includes('/js/experience/entry.js'))html=html.replace('</body>','  <script type="module" src="/js/experience/entry.js"></script>\n</body>');
  if(isLab&&!html.includes('src="/js/experience/lab-host.js"'))html=html.replace('</body>','  <script src="/js/experience/lab-host.js"></script>\n</body>');
  return html;
}
if(require.main===module)for(const dir of dirs)for(const file of fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.html'))){
  const target=path.join(root,dir,file);fs.writeFileSync(target,integrate(fs.readFileSync(target,'utf8'),dir==='lab'&&file!=='index.html'));count++;
}
if(require.main===module)console.log(`Integrated ${count} content routes`);
module.exports={integrate};
