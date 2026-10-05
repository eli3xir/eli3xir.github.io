import fs from 'node:fs';import path from 'node:path';import { fileURLToPath } from 'node:url';import { execFileSync } from 'node:child_process';
import {createHash} from 'node:crypto';
import imageMetadata from './image-dimensions.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];const warnings=[];
const restored=JSON.parse(fs.readFileSync(path.join(root,'assets/blog/transport/manifest.json'),'utf8'));
const recoveryManifest=JSON.parse(fs.readFileSync(path.join(root,'assets/blog/recovered/manifest.json'),'utf8'));
const recovered=recoveryManifest.articles,originals=recovered.flatMap(article=>article.images);
const originalRepository='https://gitee.com/buptsg2019/picgo',originalCommit='f2dca76bbe1f19fa7294573a31458d6be27b6ff5';
if(recoveryManifest.repository.url!==originalRepository||recoveryManifest.repository.commit!==originalCommit)failures.push('Original image repository provenance changed');
if(originals.length!==67||new Set(originals.map(image=>image.local)).size!==66||recovered.some(article=>article.unresolved.length))failures.push('Original image recovery is incomplete');
for(const image of originals){
  const bytes=fs.readFileSync(path.join(root,image.local));
  const gitBlob=createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  const filename=image.original.replace('https://gitee.com/sg2019/picgo/raw/master/','');
  if(image.source!==`${originalRepository}/raw/${originalCommit}/${filename}`||gitBlob!==image.gitBlob)failures.push(`Original image provenance differs: ${image.local}`);
}
const formatting=JSON.parse(fs.readFileSync(path.join(root,'tools/article-formatting.json'),'utf8'));
for(const image of [...restored.images,...recovered.flatMap(article=>article.images)]){
  const bytes=fs.readFileSync(path.join(root,image.local));
  if(createHash('sha256').update(bytes).digest('hex')!==image.sha256)failures.push(`Restored article image changed: ${image.local}`);
  const size=imageMetadata.imageDimensions(root,image.local);
  if(size.width!==image.width||size.height!==image.height||bytes.length!==image.bytes)failures.push(`Restored article image metadata differs: ${image.local}`);
}
try{execFileSync(process.execPath,['tools/pack-room-lightmaps.mjs','--check'],{cwd:root,stdio:'pipe'});}catch(error){failures.push(`Lightmap bundle: ${error.stderr||error.message}`);}
try{execFileSync(process.execPath,['tools/validate-room-reflections.mjs'],{cwd:root,stdio:'pipe'});}catch(error){failures.push(`Room reflections: ${error.stderr||error.message}`);}
try{execFileSync(process.execPath,['tools/validate-room-artwork.mjs'],{cwd:root,stdio:'pipe'});}catch(error){failures.push(`Room artwork: ${error.stderr||error.message}`);}
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
  const emphasis=formatting.filter(fix=>fix.article===relative);
  const recovery=recovered.find(article=>article.article.slice(1)===relative);
  const imageTags=[...current.matchAll(/<img\b[^>]*>/g)].map(match=>match[0]);
  for(const image of recovery?.images||[]){
    const tag=imageTags[image.index]||'';
    if(!tag.includes(`src="${image.local}"`)||!tag.includes(`alt="${image.alt}"`))failures.push(`${relative}: restored figure position or label differs: ${image.index}`);
  }
  const dimensioned=new Map();
  for(const match of current.matchAll(/<img\b[^>]*>/g)){
    const tag=match[0],src=tag.match(/\bsrc="([^"]+)"/)?.[1];
    if(!src?.startsWith('/'))continue;
    const size=imageMetadata.imageDimensions(root,src),attributes=`width="${size.width}" height="${size.height}" `;
    if(!tag.startsWith(`<img ${attributes}`))failures.push(`${relative}: image dimensions differ from source bytes: ${src}`);
    else dimensioned.set(tag,tag.replace(`<img ${attributes}`,'<img '));
  }
  for(const fix of emphasis)if(!current?.includes(`<strong>${fix.strong}</strong>`))failures.push(`${relative}: documented emphasis missing`);
  const normalize=html=>{
    let content=html?.replace(/\r/g,'').replace('https://repo.openeuler.org/openEuler-20.03-LTS/ISO/x86_64/openEuler-20.03-LTS-x86_64-dvd.iso','/download/openEuler-20.03-LTS-x86_64-dvd.iso');
    for(const [tag,original] of dimensioned)content=content?.replaceAll(tag,original);
    let imageIndex=0;
    content=content?.replace(/<img\b[^>]*>/g,tag=>{
      const currentIndex=imageIndex++;
      const image=recovery?.images.find(image=>image.index===currentIndex);
      return image?tag.replace(`src="${image.local}"`,`src="${image.original}"`):tag;
    });
    if(relative===restored.article.slice(1))for(const image of restored.images)content=content?.replaceAll(image.local,image.original);
    for(const fix of emphasis)content=content?.replace(`<strong>${fix.strong}</strong>`,`**${fix.strong}**`);
    return content;
  };
  if(normalize(current)!==normalize(baseline))failures.push(`${relative}: article content changed`);
}
console.log(JSON.stringify({pages:html.length,articles:articles.length,warnings,failures},null,2));
if(failures.length)process.exitCode=1;
