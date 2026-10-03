import fs from 'node:fs';import path from 'node:path';import { fileURLToPath } from 'node:url';import { execFileSync } from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];const warnings=[];
function files(dir,excluded=new Set(['.git','node_modules','temp-docs','.playwright-cli'])){
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>excluded.has(entry.name)?[]:entry.isDirectory()?files(path.join(dir,entry.name),excluded):[path.join(dir,entry.name)]);
}
const all=files(root);const html=all.filter(f=>f.endsWith('.html')&&!f.includes(path.sep+'vendor'+path.sep));
for(const file of html){
  const source=fs.readFileSync(file,'utf8');const label=path.relative(root,file);
  if(!source.includes('/js/experience/entry.js'))failures.push(`${label}: missing experience entry`);
  if(!source.includes('data-experience-style'))failures.push(`${label}: missing visual system`);
  if(!source.includes('three/addons/'))failures.push(`${label}: missing local import map`);
  if(/lab[\\/](?!index)[^\\/]+\.html$/.test(file)){
    if(!source.includes('<script src="/js/experience/lab-host.js"></script>'))failures.push(`${label}: missing experiment bootstrap`);
    for(const match of source.matchAll(/data-src="([^"]+)" data-module="([^"]+)"/g)){
      const code=fs.readFileSync(path.join(root,match[1]),'utf8');
      if(String(/^import\s|^export\s/m.test(code))!==match[2])failures.push(`${label}: invalid script type for ${match[1]}`);
    }
  }
  for(const match of source.matchAll(/(?:src|href)=["']([^"'#]+)["']/g)){
    const ref=match[1];if(/^(https?:|data:|mailto:|javascript:)/.test(ref))continue;
    const withoutQuery=decodeURIComponent(ref.split(/[?#]/)[0]);
    const target=withoutQuery.startsWith('/')?path.join(root,withoutQuery):path.resolve(path.dirname(file),withoutQuery);
    if(!target.startsWith(root+path.sep))continue;
    if(!fs.existsSync(target))failures.push(`${label}: missing ${ref}`);
  }
}
for(const file of all.filter(f=>/\.(js|mjs|cjs)$/.test(f)&&!f.includes(path.sep+'vendor'+path.sep))){
  const lines=fs.readFileSync(file,'utf8').split('\n').length;
  if(lines>500)warnings.push(`${path.relative(root,file)}: legacy file has ${lines} lines`);
  try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'});}catch(error){failures.push(`${path.relative(root,file)}: ${error.stderr}`);}
}
const articles=html.filter(f=>/blog[\\/]\d+\.html$/.test(f));
for(const file of articles){
  const relative=path.relative(root,file).replaceAll('\\','/');
  const current=fs.readFileSync(file,'utf8').match(/<article class="post-content">([\s\S]*?)<\/article>/)?.[1];
  const baseline=execFileSync('git',['show',`8485a72:${relative}`],{cwd:root,encoding:'utf8'}).match(/<article class="post-content">([\s\S]*?)<\/article>/)?.[1];
  const normalize=html=>html?.replace(/\r/g,'').replace('https://repo.openeuler.org/openEuler-20.03-LTS/ISO/x86_64/openEuler-20.03-LTS-x86_64-dvd.iso','/download/openEuler-20.03-LTS-x86_64-dvd.iso');
  if(normalize(current)!==normalize(baseline))failures.push(`${relative}: article content changed`);
}
console.log(JSON.stringify({pages:html.length,articles:articles.length,warnings,failures},null,2));
if(failures.length)process.exitCode=1;
