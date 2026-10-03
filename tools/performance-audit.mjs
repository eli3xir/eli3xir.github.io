import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {startServer,launchBrowser,ready,settle,output} from './browser-support.mjs';

const server=await startServer();let browser;
const report={date:new Date().toISOString(),environment:{cpu:os.cpus()[0].model,platform:os.platform()},
  note:'Headless Chromium cadence on the reported desktop GPU; phone-sized viewport is emulation, not a physical phone benchmark.',profiles:[]};
try{
  browser=await launchBrowser();report.environment.browser=browser.version();
  for(const profile of [{name:'desktop',viewport:{width:1440,height:1000},dpr:2},{name:'phone-emulation',viewport:{width:390,height:844},dpr:3}]){
    const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.dpr});
    const page=await context.newPage();await page.goto(server.base);await ready(page);const samples=[];
    for(const route of ['/','/lab/','/blog/','/radio/','/projects/','/about/','/skin/']){
      if(route!=='/')await page.evaluate(route=>window.studio.router.navigate(route),route);await settle(page);
      const data=await page.evaluate(()=>new Promise(resolve=>{
        const frames=[];let last;const start=performance.now();
        const collect=now=>{if(last&&now-start>400)frames.push(now-last);last=now;if(frames.length<120)requestAnimationFrame(collect);else{
          const sorted=frames.slice().sort((a,b)=>a-b);const gl=window.studio.world.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
          resolve({medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:Math.max(...frames),
            frames:frames.length,gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,...window.studio.diagnostics(),frameTimes:undefined});
        }};requestAnimationFrame(collect);
      }));
      samples.push({route,...data});console.log(`${profile.name} ${route} median=${data.medianMs.toFixed(2)}ms p95=${data.p95Ms.toFixed(2)}ms @${data.pixelRatio}`);
    }
    report.profiles.push({...profile,samples});await context.close();
  }
}finally{
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'performance-audit.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();await server.close();
}
