import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const output=path.join(root,'tools/test-results');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript',
  '.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.svg':'image/svg+xml','.glb':'model/gltf-binary','.ttf':'font/ttf','.woff2':'font/woff2','.wasm':'application/wasm'};

export async function startServer(){
  const server=http.createServer((request,response)=>{
    try{
      const url=new URL(request.url,'http://localhost');
      let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
      if(file!==root&&!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
      if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
      if(!fs.existsSync(file)){response.writeHead(404).end('Not found');return;}
      response.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':fs.statSync(file).size,'Cache-Control':'no-store'});
      fs.createReadStream(file).pipe(response);
    }catch{response.writeHead(400).end('Bad request');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return{base:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}

export async function launchBrowser(){
  return chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,
    args:process.env.BROWSER_ANGLE?[`--use-angle=${process.env.BROWSER_ANGLE}`]:[],
    proxy:process.env.BROWSER_PROXY?{server:process.env.BROWSER_PROXY}:undefined});
}

export function publicRoutes(){
  return ['/',...['lab','blog','radio','projects','about','skin'].flatMap(dir=>
    fs.readdirSync(path.join(root,dir)).filter(name=>name.endsWith('.html')).sort((a,b)=>a==='index.html'?-1:b==='index.html'?1:a.localeCompare(b))
      .map(name=>name==='index.html'?`/${dir}/`:`/${dir}/${name}`))];
}

export async function ready(page){
  await page.waitForFunction(()=>window.studio,null,{timeout:25000});
  await page.waitForFunction(()=>window.__ready||window.__error||window.studio.route.id!=='home',null,{timeout:150000});
  // A late room attachment reports asset readiness before its shaders finish.
  // Stable-scene audits wait for that work; opening/performance probes still
  // measure the first actual rendered frame separately.
  await page.evaluate(()=>window.studio.world?.whenRenderReady?.());
}

export async function settle(page){
  await page.waitForFunction(()=>!window.studio?.router?.busy&&!document.body.classList.contains('is-transitioning'));
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>a.effect?.target?.classList?.contains('hero-word')).map(a=>a.finished.catch(()=>{}))));
}

export function observe(page){
  const errors=[],failed=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error'&&message.text().includes('THREE.WebGLProgram')||/GL_INVALID_(VALUE|OPERATION|ENUM|FRAMEBUFFER_OPERATION)/.test(message.text()))errors.push(message.text());});
  page.on('response',response=>{if(response.status()>=400)failed.push({status:response.status(),url:response.url()});});
  page.on('requestfailed',request=>failed.push({error:request.failure()?.errorText,url:request.url()}));
  return{errors,failed,drain(){const result={errors:[...errors],failed:[...failed]};errors.length=0;failed.length=0;return result;}};
}
