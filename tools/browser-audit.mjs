import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { root,output,startServer,launchBrowser,publicRoutes,ready,settle,observe } from './browser-support.mjs';

fs.mkdirSync(output,{recursive:true});
const server=process.env.BASE_URL?{base:process.env.BASE_URL.replace(/\/$/,''),close:async()=>{}}:await startServer();let browser;
const report={date:new Date().toISOString(),environment:{platform:process.platform,cpu:os.cpus()[0].model,node:process.version},
  routes:[],direct:[],cases:[],failures:[],knownExternalFailures:[]};
report.base=server.base;
const routes=publicRoutes();
const major=['/','/lab/','/blog/','/radio/','/projects/','/about/','/skin/'];
const visual=process.env.AUDIT_SCREENSHOTS!=='0';
const subset=process.env.AUDIT_CASE?[]:process.env.AUDIT_QUICK==='1'?major:routes;
report.scope=process.env.AUDIT_CASE|| (process.env.AUDIT_QUICK==='1'?'major routes':'full');
async function verify(name,action){
  if(process.env.AUDIT_CASE&&!name.includes(process.env.AUDIT_CASE))return;
  try{const evidence=await action();report.cases.push({name,ok:true,evidence});console.log(`PASS ${name}`);}
  catch(error){report.cases.push({name,ok:false,error:error.message});report.failures.push(`${name}: ${error.message}`);console.log(`FAIL ${name}: ${error.message}`);}
}

try{
  browser=await launchBrowser();report.environment.browser=browser.version();
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const context=await browser.newContext({viewport,deviceScaleFactor:1,permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage();const log=observe(page);
    await page.goto(server.base,{waitUntil:'domcontentloaded'});await ready(page);
    await page.evaluate(()=>{window.auditRenderer=window.studio.world.renderer;window.auditCanvas=window.studio.world.renderer.domElement;});
    for(const route of subset){
      try{
        if(route!=='/')await page.evaluate(route=>window.studio.router.navigate(route),route);
        await settle(page);
        if(visual&&(major.includes(route)||['/lab/moon.html','/lab/fluid.html','/blog/65374.html'].includes(route))){
          const name=route==='/'?'home':route.replaceAll('/','-').replace(/^-|-$/g,'');
          await page.screenshot({path:path.join(output,`${name}-${viewport.width}.png`),timeout:60000});
        }
        const metrics=await page.evaluate(()=>{
          const world=window.studio.world;const renderer=world.renderer;const gl=renderer.getContext();const debug=gl.getExtension('WEBGL_debug_renderer_info');
          return{path:location.pathname,chapter:window.studio.route.id,h1:document.querySelector('h1')?.textContent,
            overflow:document.documentElement.scrollWidth>innerWidth+2,
            overflowElements:[...document.querySelectorAll('#content *')].filter(el=>el.getBoundingClientRect().right>innerWidth+2).slice(0,10).map(el=>({tag:el.tagName,class:el.className,text:el.textContent.slice(0,80)})),
            canvasCount:document.querySelectorAll('#world-stage canvas').length,
            continuous:renderer===window.auditRenderer&&renderer.domElement===window.auditCanvas,
            gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),...world.diagnostics(),frameTimes:undefined};
        });
        const issues=log.drain();report.routes.push({route,viewport,...metrics,...issues});
        assert.equal(metrics.path,route);assert.equal(metrics.overflow,false);assert.equal(metrics.continuous,true);
        const failures=issues.failed.filter(issue=>{
          if(new URL(issue.url).hostname==='articlecdn.lmonkey.com'){
            report.knownExternalFailures.push({route,...issue});return false;
          }return true;
        });
        assert.equal(metrics.canvasCount,1);assert.deepEqual(issues.errors,[]);assert.deepEqual(failures,[]);
        console.log(`ROUTE ${viewport.width} ${route}: ${metrics.drawCalls} calls / ${metrics.triangles} triangles`);
      }catch(error){report.failures.push(`${viewport.width} ${route}: ${error.message}`);console.log(`FAIL ${viewport.width} ${route}: ${error.message}`);}
    }
    if(viewport.width===1440){
      await verify('original PCM audio, persistent context, pause/resume, finite output',async()=>{
        await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.playing,{timeout:20000});
        await page.evaluate(()=>{window.auditAudio=window.studio.score.context;window.auditSources=window.studio.score.sources.slice();});
        const before=await page.evaluate(()=>window.studio.score.time);
        await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
        const audio=await page.evaluate(async()=>{
          const score=window.studio.score;
          const analyser=score.context.createAnalyser();analyser.fftSize=2048;score.master.connect(analyser);
          await new Promise(resolve=>setTimeout(resolve,150));const pcm=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(pcm);
          score.master.disconnect(analyser);analyser.disconnect();
          return{playing:score.playing,contextState:score.context.state,time:score.time,duration:score.data.duration,sources:score.sources.length,
            continuous:score.context===window.auditAudio&&score.sources.every((source,i)=>source===window.auditSources[i]),
            peak:Math.max(...pcm.map(Math.abs)),finite:pcm.every(Number.isFinite),clockDifference:Math.abs(score.rhythm.beat-score.time*112/60)};
        });
        assert.equal(audio.playing,true);assert.equal(audio.sources,4);assert.equal(audio.continuous,true);
        assert.ok(audio.time>before);assert.ok(audio.peak>0&&audio.peak<1);assert.equal(audio.finite,true);assert.ok(audio.clockDifference<.05);
        await page.locator('.sound-toggle').click();const paused=await page.evaluate(()=>window.studio.score.time);
        await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,160)));
        assert.ok(Math.abs(await page.evaluate(()=>window.studio.score.time)-paused)<.025);
        await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.playing);
        await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,160)));
        assert.ok(await page.evaluate(()=>window.studio.score.time)>paused);
        return audio;
      });
      await verify('search, tags, code copy, article anchor',async()=>{
        await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
        await page.locator('#search').fill('Linux');
        const matches=await page.locator('.post-item:visible').count();assert.ok(matches>0&&matches<39);
        await page.locator('#search').fill('zz-no-such-post-zz');assert.equal(await page.locator('.post-item:visible').count(),0);
        await page.locator('#search').fill('');
        const tag=page.locator('.tag-btn[data-tag="c++"]');await tag.click();assert.equal(await tag.getAttribute('aria-pressed'),'true');
        const tagged=await page.locator('.post-item:visible').count();assert.ok(tagged>0&&tagged<39);await tag.click();assert.equal(await page.locator('.post-item:visible').count(),39);
        await page.evaluate(()=>window.studio.router.navigate('/blog/24471.html'));await settle(page);
        const button=page.locator('.code-bar button').first();await button.click();await page.waitForFunction(()=>document.querySelector('.code-bar button')?.textContent==='已复制');
        const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.ok(copied.length>0);
        const toc=page.locator('.studio-toc a').first();await toc.click();assert.ok(new URL(page.url()).hash.length>1);
        return{matches,tagged,copiedCharacters:copied.length};
      });
      await verify('particle journey preserves seeds through gathering and release',async()=>{
        await page.evaluate(()=>window.studio.router.navigate('/lab/'));await settle(page);
        await page.evaluate(()=>{
          window.auditSeeds=window.studio.world.particles.geometry;
          const transition=window.studio.router.transition;window.auditJourney=[];
          window.studio.router.transition=progress=>{
            transition(progress);window.auditJourney.push({progress,mode:window.studio.world.particles.material.uniforms.uMode.value,
              gather:window.studio.world.particles.material.uniforms.uGather.value,cover:Number(document.querySelector('.portal-layer').style.getPropertyValue('--portal'))});
          };
          window.auditRestoreTransition=()=>{window.studio.router.transition=transition;};
        });
        await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
        const evidence=await page.evaluate(()=>{
          const sameSeeds=window.auditSeeds===window.studio.world.particles.geometry;
          const journey=window.auditJourney;window.auditRestoreTransition();
          return{sameSeeds,frames:journey.length,maxGather:Math.max(...journey.map(frame=>frame.gather)),minGather:Math.min(...journey.map(frame=>frame.gather)),
            visibleGather:journey.some(frame=>frame.gather>.25&&frame.gather<.48&&frame.cover===0),
            destination:window.studio.world.particles.material.uniforms.uMode.value,
            finalGather:window.studio.world.particles.material.uniforms.uGather.value};
        });
        assert.equal(evidence.sameSeeds,true);assert.ok(evidence.frames>10);assert.equal(evidence.maxGather,1);assert.equal(evidence.minGather,0);
        assert.equal(evidence.visibleGather,true);assert.equal(evidence.destination,2);assert.equal(evidence.finalGather,0);
        assert.deepEqual(log.errors,[]);return evidence;
      });
      await verify('offscreen article pauses GPU rendering and navigation resumes it',async()=>{
        await page.evaluate(()=>window.studio.router.navigate('/blog/24471.html'));await settle(page);
        await page.evaluate(()=>scrollTo(0,innerHeight*1.5));
        await page.waitForFunction(()=>!window.studio.world.running);
        const before=await page.evaluate(()=>({frames:window.studio.world.renderedFrames,time:window.studio.score.time}));
        await page.waitForTimeout(300);
        const after=await page.evaluate(()=>({frames:window.studio.world.renderedFrames,time:window.studio.score.time}));
        assert.equal(after.frames,before.frames);assert.ok(after.time>before.time);
        await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>window.studio.world.running);
        await page.waitForFunction(frames=>window.studio.world.renderedFrames>frames,before.frames);
        await page.evaluate(()=>scrollTo(0,innerHeight*1.5));await page.waitForFunction(()=>!window.studio.world.running);
        await page.evaluate(()=>window.studio.router.navigate('/lab/'));await settle(page);
        assert.equal(await page.evaluate(()=>window.studio.world.running),true);
        return{idleFrames:after.frames-before.frames,scoreContinues:true,final:'/lab/'};
      });
      await verify('back/forward, rapid navigation, failed fetch recovery',async()=>{
        await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
        await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);
        await page.goBack({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.studio.route.id==='about');await settle(page);
        await page.goForward({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.studio.route.id==='projects');await settle(page);
        await page.evaluate(()=>{window.studio.router.navigate('/blog/');window.studio.router.navigate('/lab/');window.studio.router.navigate('/skin/');});
        await page.waitForFunction(()=>window.studio.route.id==='skin'&&!window.studio.router.busy,{timeout:20000});await settle(page);
        await page.route('**/radio/?failure=1',route=>route.abort('failed'));
        await page.evaluate(()=>window.studio.router.navigate('/radio/?failure=1'));await settle(page);
        assert.equal(await page.evaluate(()=>window.studio.route.id),'skin');
        assert.ok((await page.locator('.studio-toast').textContent()).includes('暂时无法'));
        await page.unroute('**/radio/?failure=1');await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
        const unexpected=log.errors.slice();assert.deepEqual(unexpected,[]);log.drain();return{final:await page.evaluate(()=>location.pathname)};
      });
      await verify('skin selection and GPU allocation plateau over repeated routes',async()=>{
        await page.evaluate(()=>window.studio.router.navigate('/skin/'));await settle(page);
        await page.locator('button[data-skin="ocean"]').click();assert.equal(await page.evaluate(()=>localStorage.getItem('room-skin')),'ocean');
        await page.evaluate(()=>window.studio.router.navigate('/'));await settle(page);await ready(page);
        const tint=await page.evaluate(()=>{let wall;window.studio.world.model.room.traverse(o=>{if(o.material?.name==='wall_plaster')wall=o.material.color.toArray();});return wall;});
        assert.deepEqual(tint,[.48,.56,.68]);const allocations=[];
        for(let round=0;round<3;round++){
          for(const route of ['/lab/','/blog/','/radio/','/projects/','/about/','/skin/','/'])await page.evaluate(route=>window.studio.router.navigate(route),route);
          await settle(page);allocations.push(await page.evaluate(()=>window.studio.world.diagnostics()));
        }
        assert.ok(allocations[2].geometries<=allocations[0].geometries+3);assert.ok(allocations[2].textures<=allocations[0].textures+2);
        await page.evaluate(()=>{localStorage.setItem('room-skin','default');window.studio.world.applySkin('default');});
        return{tint,allocations:allocations.map(({geometries,textures})=>({geometries,textures}))};
      });
    }else{
      await verify('mobile menu and touch controls',async()=>{
        await page.locator('.menu-toggle').click();assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'true');
        await page.locator('.studio-nav a[href="/lab/"]').click();await page.waitForFunction(()=>window.studio.route.id==='lab');await settle(page);
        assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
        await page.evaluate(()=>window.studio.router.navigate('/skin/'));await settle(page);
        await page.locator('button[data-skin="forest"]').click();assert.equal(await page.locator('button[data-skin="forest"]').getAttribute('aria-pressed'),'true');
        return{width:viewport.width};
      });
    }
    await context.close();
  }
  const direct=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const page=await direct.newPage();const log=observe(page);
  for(const route of subset){
    try{
      await page.goto(server.base+route,{waitUntil:'domcontentloaded'});await ready(page);
      const metrics=await page.evaluate(()=>({path:location.pathname,h1:!!document.querySelector('.hero-title'),reduced:window.studio.world.reduced.matches}));
      assert.equal(metrics.h1,true);assert.equal(metrics.reduced,true);assert.deepEqual(log.errors,[]);
      report.direct.push({route,...metrics,...log.drain()});console.log(`DIRECT ${route}`);
    }catch(error){report.failures.push(`direct ${route}: ${error.message}`);}
  }
  await direct.close();
  await verify('all nine isolated interactive experiments execute and draw',async()=>{
    const experiments=routes.filter(route=>route.startsWith('/lab/')&&route.endsWith('.html'));const result=[];
    const context=await browser.newContext({viewport:{width:840,height:580}});const page=await context.newPage();const log=observe(page);
    for(const route of experiments){
      await page.goto(server.base+route+'?embedded=1',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('canvas,.glass-stage,.lens');
      await page.evaluate(()=>new Promise(resolve=>{let frames=0;const loop=()=>++frames>12?resolve():requestAnimationFrame(loop);requestAnimationFrame(loop);}));
      await page.mouse.move(220,340);await page.mouse.down();await page.mouse.move(620,190,{steps:8});await page.mouse.up();
      const drawn=await page.evaluate(()=>[...document.querySelectorAll('canvas')].some(canvas=>canvas.width>100&&canvas.height>100)||!!document.querySelector('.lens'));
      const issues=log.drain();assert.equal(drawn,true);assert.deepEqual(issues.errors,[]);assert.deepEqual(issues.failed,[]);
      result.push({route,drawn});console.log(`EXPERIMENT ${route}`);
    }
    await context.close();return result;
  });
  await verify('blocked storage, reduced motion, keyboard navigation',async()=>{
    const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
    await context.addInitScript(()=>{for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){throw new DOMException('Blocked','SecurityError');}});});
    const page=await context.newPage();const log=observe(page);await page.goto(server.base+'/skin/');await ready(page);
    await page.locator('button[data-skin="cream"]').click();assert.equal(await page.locator('button[data-skin="cream"]').getAttribute('aria-pressed'),'true');
    await page.locator('.studio-nav a[href="/about/"]').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>window.studio.route.id==='about');await settle(page);assert.deepEqual(log.errors,[]);
    await context.close();return{usable:true};
  });
  await verify('WebGL failure keeps every text destination usable',async()=>{
    const context=await browser.newContext({reducedMotion:'reduce'});
    await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /^webgl/.test(type)?null:original.call(this,type,...args);};});
    const page=await context.newPage();await page.goto(server.base);await ready(page);
    assert.equal(await page.locator('body.no-webgl').count(),1);
    await page.locator('.chapter-dock a[href="/blog/"]').click();await page.waitForFunction(()=>window.studio.route.id==='blog');await settle(page);
    assert.equal(await page.locator('.post-item').count(),39);await context.close();return{articleCount:39};
  });
  await verify('room loading failure releases status and leaves navigation',async()=>{
    const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();
    await page.route('**/assets/room/room.glb',route=>route.abort('failed'));await page.goto(server.base);await ready(page);
    assert.ok(await page.evaluate(()=>window.__error));assert.equal(await page.locator('.scene-status.loading').count(),0);
    await page.locator('.chapter-dock a[href="/projects/"]').click();await page.waitForFunction(()=>window.studio.route.id==='projects');await settle(page);
    await context.close();return{recovered:true};
  });
  await verify('room guide focuses the potion scene and Escape returns to the overview',async()=>{
    const context=await browser.newContext();const page=await context.newPage();const log=observe(page);
    await page.goto(server.base);await ready(page);await settle(page);await page.locator('[data-explore]').click();
    assert.equal(await page.evaluate(()=>window.studio.world.focused),'lab');
    assert.equal(await page.locator('.object-preview a').getAttribute('href'),'/lab/');
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.studio.world.focused),null);
    assert.deepEqual(log.errors,[]);await context.close();return{guidedChapter:'lab'};
  });
  await verify('reduced-motion experiment waits for deliberate playback',async()=>{
    const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();const log=observe(page);
    await page.goto(server.base+'/lab/moon.html?embedded=1');await page.waitForSelector('.experiment-gate button');
    assert.equal(await page.locator('script[src="/js/lab-moon.js"]').count(),0);await page.locator('.experiment-gate button').click();
    await page.waitForFunction(()=>document.querySelector('canvas')?.width>300);assert.equal(await page.locator('.experiment-gate').count(),0);
    assert.deepEqual(log.errors,[]);await context.close();return{requiresGesture:true};
  });
}catch(error){report.failures.push(error.stack);}
finally{
  fs.writeFileSync(path.join(output,'browser-audit.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();await server.close();
}
console.log(JSON.stringify({routes:report.routes.length,direct:report.direct.length,cases:report.cases.length,failures:report.failures},null,2));
if(report.failures.length)process.exitCode=1;
