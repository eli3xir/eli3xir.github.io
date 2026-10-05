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
  catch(error){report.cases.push({name,ok:false,error:error.message,stack:error.stack});report.failures.push(`${name}: ${error.message}`);console.log(`FAIL ${name}: ${error.message}`);}
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
        assert.equal(metrics.canvasCount,1);assert.deepEqual(issues.errors,[]);assert.deepEqual(issues.failed,[]);
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
  await verify('portal follows the actual beacon on desktop, mobile, and focused room views',async()=>{
    const results=[];
    for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:568},{width:768,height:1024}]){
      const context=await browser.newContext({viewport});const page=await context.newPage();const log=observe(page);
      await page.goto(server.base+'/about/');await ready(page);
      for(const focus of [null,'lab']){
        if(focus){await page.evaluate(()=>window.studio.router.navigate('/'));await ready(page);await settle(page);await page.evaluate(()=>window.studio.world.focus('lab'));}
        await page.evaluate(()=>window.studio.router.transition(.72));
        await page.waitForTimeout(180);
        const evidence=await page.evaluate(()=>{
          const world=window.studio.world;const beacon=world.actor.beacon.getWorldPosition(world.actor.root.position.clone());
          const seed=world.particles.material.uniforms.uPortal.value.clone().applyMatrix4(world.particles.matrixWorld);
          const projected=beacon.clone().project(world.camera);
          const curtain=document.querySelector('.portal-layer');
          const x=parseFloat(curtain.style.getPropertyValue('--portal-x'))/100,y=parseFloat(curtain.style.getPropertyValue('--portal-y'))/100;
          const expectedX=Math.max(.03,Math.min(.97,(projected.x+1)/2)),expectedY=Math.max(.03,Math.min(.97,(1-projected.y)/2));
          return{seedDistance:seed.distanceTo(beacon),pixelError:Math.hypot((x-expectedX)*innerWidth,(y-expectedY)*innerHeight),
            focused:world.focused,actorX:world.actor.root.position.x,origin:[x,y],finite:[x,y].every(Number.isFinite)};
        });
        assert.ok(evidence.seedDistance<1e-5,JSON.stringify(evidence));assert.ok(evidence.pixelError<1,JSON.stringify(evidence));assert.equal(evidence.finite,true);
        if(focus){assert.equal(evidence.focused,'lab');assert.ok(evidence.actorX>1.5);}
        assert.deepEqual(log.errors,[]);results.push({viewport,focus,...evidence});await page.evaluate(()=>window.studio.router.transition(0));
        if(!focus){
          const tail=await page.evaluate(async()=>{
            const w=window.studio.world,r=window.studio.router;
            Object.defineProperty(window.studio.score,'time',{get:()=>4});
            const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            r.transition(1);w.show(window.studio.route);await w.whenRenderReady();r.transition(.001);await frame();const before=w.actor.root.position.clone();
            r.transition(0);await frame();return before.distanceTo(w.actor.root.position);
          });
          assert.ok(tail<.002,`reveal tail discontinuity ${tail}`);results.at(-1).revealTail=tail;
        }
      }
      await context.close();
    }
    return results;
  });
  await verify('HDR room maps load with their brightness range through skins and focused views',async()=>{
    const results=[];
    for(const width of [1440,390]){
      const context=await browser.newContext({viewport:{width,height:width===1440?1000:844}});
      const page=await context.newPage(),log=observe(page);
      await page.goto(server.base);await ready(page);await settle(page);
      const maps=await page.evaluate(async()=>{
        const manifest=await fetch('/assets/room/lightmaps/manifest.json').then(response=>response.json());
        const seen=new Set(),result=[];
        window.studio.world.model.room.traverse(obj=>{
          for(const mat of [obj.material].flat().filter(Boolean)){
            if(!mat.lightMap||seen.has(mat.uuid))continue;seen.add(mat.uuid);
            const file=mat.lightMap.userData.lightmapFile||new URL(mat.lightMap.image.src).pathname.split('/').pop();
            const entry=Object.values(manifest).find(entry=>entry.file===file);
            if(entry?.scale)result.push({file,intensity:mat.lightMapIntensity,expected:entry.scale*1.05,
              width:mat.lightMap.image.width,height:mat.lightMap.image.height,expectedSize:entry.size,channel:mat.lightMap.channel});
          }
        });
        window.auditHDRTextures=result.map(map=>map.file);
        return result;
      });
      assert.equal(maps.length,122);
      for(const map of maps){assert.ok(Number.isFinite(map.intensity)&&map.intensity>0);assert.ok(Math.abs(map.intensity-map.expected)<1e-6);
        assert.equal(map.width,map.expectedSize);assert.equal(map.height,map.expectedSize);assert.ok(map.width<=1024);assert.equal(map.channel,1);}
      for(const skin of ['default','brick','forest','ocean','cream']){
        await page.evaluate(skin=>window.studio.world.applySkin(skin),skin);
        await page.waitForTimeout(100);
      }
      for(const focus of ['lab','blog','radio','projects','about','skin']){
        await page.evaluate(focus=>window.studio.world.focus(focus),focus);await page.waitForTimeout(100);
      }
      const rendered=await page.evaluate(()=>window.studio.world.diagnostics());
      const source=await page.evaluate(()=>window.studio.world.model.lightmapSource);
      assert.deepEqual(source,{mode:'bundle',packed:122,fallback:0});
      assert.equal(rendered.roomReady,true);assert.ok(rendered.renderedFrames>15);assert.ok(rendered.drawCalls>0);
      assert.deepEqual(log.errors,[]);results.push({width,source,maps});await context.close();
    }
    return results;
  });
  await verify('compact scenes clear the text and follow scrolling through viewport changes',async()=>{
    const results=[];
    const context=await browser.newContext();const page=await context.newPage(),log=observe(page);
    await page.goto(server.base+'/about/');await ready(page);await settle(page);
    await page.evaluate(()=>{window.auditLayoutRenderer=window.studio.world.renderer;Object.defineProperty(window.studio.score,'time',{get:()=>4});});
    for(const viewport of [{width:320,height:568},{width:390,height:844},{width:768,height:1024}]){
      await page.setViewportSize(viewport);
      for(const route of ['/lab/','/blog/','/radio/','/projects/','/about/','/skin/','/lab/fluid.html','/blog/65374.html']){
        await page.evaluate(route=>window.studio.router.navigate(route),route);await settle(page);
        const layout=await page.evaluate(async()=>{
          const {Box3,Vector3}=await import('three'),w=window.studio.world;
          const box=new Box3().setFromObject(w.model.root).union(new Box3().setFromObject(w.actor.root));
          let top=Infinity;
          for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
            const point=new Vector3(x,y,z).project(w.camera);top=Math.min(top,(1-point.y)*innerHeight/2);
          }
          return{top,copyBottom:document.querySelector(w.route.id==='projects'?'.project-instruments':'.hero-copy').getBoundingClientRect().bottom,
            sameRenderer:w.renderer===window.auditLayoutRenderer,overflow:document.documentElement.scrollWidth>innerWidth+2,
            scale:w.layoutScale,aspect:w.camera.aspect,negativeFrame:w.frames.some(dt=>dt<0)};
        });
        assert.ok(layout.top>layout.copyBottom+5,JSON.stringify({viewport,route,...layout}));
        assert.equal(layout.sameRenderer,true);assert.equal(layout.overflow,false);assert.equal(layout.negativeFrame,false);
        assert.ok(layout.scale>0&&layout.scale<=.72);results.push({viewport,route,...layout});
      }
    }
    await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
    await page.setViewportSize({width:320,height:568});await page.waitForTimeout(100);
    const point=()=>page.evaluate(()=>window.studio.world.portalPosition().y*innerHeight);
    const before=await point();await page.evaluate(()=>scrollTo(0,230));await page.waitForTimeout(100);
    assert.ok(Math.abs(before-await point()-230)<2);
    await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>window.studio.world.compact),false);
    assert.ok(Math.abs(await page.evaluate(()=>window.studio.world.camera.aspect)-1.44)<1e-6);
    assert.deepEqual(log.errors,[]);await context.close();return results;
  });
  await verify('late audio activation preserves the shared clock and releases PCM copies',async()=>{
    const results=[];
    for(const config of [{width:1440,reduced:false},{width:390,reduced:false},{width:1280,reduced:true}]){
      const context=await browser.newContext({viewport:{width:config.width,height:900},reducedMotion:config.reduced?'reduce':'no-preference'});
      await context.addInitScript(()=>sessionStorage.setItem('score-position','320'));
      const page=await context.newPage(),log=observe(page);
      await page.goto(server.base+'/radio/');await ready(page);await settle(page);
      const before=await page.evaluate(()=>window.studio.score.time);
      await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.playing,{timeout:20000});
      await page.waitForFunction(()=>document.querySelector('[data-movement="breath"]').classList.contains('active'));
      const evidence=await page.evaluate(()=>{
        const score=window.studio.score,world=window.studio.world;
        window.auditLateSources=score.sources.slice();
        return{time:score.time,rate:score.data.rate,pcmBytes:score.data.pcmBytes,rawReleased:score.data.stems===null,
          generationMs:score.data.generationMs,sourceCount:score.sources.length,listeners:score.listeners.size,
          duration:score.data.musicalDuration,sourceRate:score.sources[0].playbackRate.value,
          story:world.storyFrame,particleTime:world.particles.material.uniforms.uTime.value,filmTime:world.film.uniforms.uTime.value,
          movement:score.rhythm.movement,progress:parseFloat(document.querySelector('.score-track i').style.width)};
      });
      assert.ok(before>=320);assert.ok(evidence.time>=before-.1&&evidence.time<before+15);
      assert.equal(evidence.rate,config.width<700?24000:32000);assert.ok(evidence.pcmBytes>25000000);
      assert.equal(evidence.rawReleased,true);assert.equal(evidence.sourceCount,4);assert.equal(evidence.listeners,2);
      assert.equal(evidence.movement,'breath');assert.ok(evidence.progress>50&&evidence.progress<75);
      assert.equal(evidence.story.time,evidence.particleTime);assert.equal(evidence.story.time,evidence.filmTime);
      if(!config.reduced)assert.ok(Math.abs(evidence.story.time-evidence.time)<.1);
      if(config.reduced){
        const meter=await page.locator('.sound-bars i').evaluateAll(bars=>bars.map(bar=>bar.style.transform));
        await page.waitForTimeout(180);
        assert.deepEqual(await page.locator('.sound-bars i').evaluateAll(bars=>bars.map(bar=>bar.style.transform)),meter);
        assert.ok(meter.every(value=>value==='scaleY(0.65)'));
      }
      await page.evaluate(()=>window.studio.router.navigate('/about/'));await settle(page);
      assert.equal(await page.evaluate(()=>window.studio.score.listeners.size),1);
      await page.evaluate(()=>window.studio.router.navigate('/radio/'));await settle(page);
      assert.equal(await page.evaluate(()=>window.studio.score.listeners.size),2);
      assert.equal(await page.evaluate(()=>window.studio.score.sources.every((source,i)=>source===window.auditLateSources[i])),true);
      const beforeInterruption=await page.evaluate(()=>window.studio.score.time);
      await page.evaluate(()=>window.studio.score.context.suspend());
      await page.waitForFunction(()=>document.querySelector('.sound-label').textContent==='继续声音');
      const frozen=await page.evaluate(()=>window.studio.score.time);
      assert.ok(frozen>=beforeInterruption-.05);
      assert.equal(await page.locator('.sound-toggle').getAttribute('aria-pressed'),'false');
      assert.ok((await page.locator('[data-score-toggle]').textContent()).includes('继续试听'));
      await page.waitForTimeout(150);assert.ok(Math.abs(await page.evaluate(()=>window.studio.score.time)-frozen)<.025);
      await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
      assert.ok(await page.evaluate(()=>window.studio.score.time)>=frozen-.025);
      assert.equal(await page.evaluate(()=>window.studio.score.sources.every((source,i)=>source===window.auditLateSources[i])),true);
      evidence.interruption={before:beforeInterruption,frozen,resumed:await page.evaluate(()=>window.studio.score.time)};
      await page.locator('.sound-toggle').click();const paused=await page.evaluate(()=>window.studio.score.time);
      await page.waitForTimeout(150);assert.ok(Math.abs(await page.evaluate(()=>window.studio.score.time)-paused)<.025);
      await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.playing);
      assert.ok(await page.evaluate(()=>window.studio.score.time)>=paused-.025);
      assert.deepEqual(log.errors,[]);results.push({...config,...evidence});await context.close();
    }
    return results;
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
  await verify('room stays hidden until delayed lighting is ready, including a missing map',async()=>{
    const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
    let release;const gate=new Promise(resolve=>{release=resolve;});let intercepted=0;
    const firstMap=page.waitForRequest('**/assets/room/lightmaps.bin',{timeout:135000});
    await page.route('**/assets/room/lightmaps.bin',async request=>{intercepted++;await gate;await request.continue();});
    try{
      await Promise.all([page.goto(server.base),firstMap]);await page.waitForFunction(()=>window.studio?.world.model.room.children.some(child=>child.type==='Group'&&child.name!=='practical-light'));
      const pending=await page.evaluate(()=>{const model=window.studio.world.model;const imported=model.room.children.find(child=>child.type==='Group'&&child.name!=='practical-light');return{loaded:model.loaded,visible:imported.visible,loading:document.querySelector('.scene-status').classList.contains('loading')};});
      assert.ok(intercepted>0);assert.equal(pending.loaded,false);assert.equal(pending.visible,false);assert.equal(pending.loading,true);
      await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.studio.world.model.loaded),false);
      release();await ready(page);
      assert.equal(await page.evaluate(()=>window.studio.world.model.room.children.find(child=>child.type==='Group'&&child.name!=='practical-light').visible),true);
      assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
      await page.unroute('**/assets/room/lightmaps.bin');
      await page.route('**/assets/room/lightmaps.bin',request=>request.abort('failed'));
      await page.route('**/assets/room/lightmaps/wall_back.jpg',request=>request.abort('failed'));await page.reload();await ready(page);
      assert.equal(await page.evaluate(()=>window.studio.world.model.loaded),true);assert.equal(await page.locator('.scene-status.loading').count(),0);
      assert.ok((await page.locator('.scene-status').textContent()).includes('部分材质'));
      return{pending,intercepted,missingMapReveals:true};
    }finally{release();await context.close();}
  });
  await verify('room guide focuses the potion scene and Escape returns to the overview',async()=>{
    const context=await browser.newContext();const page=await context.newPage();const log=observe(page);
    await page.goto(server.base);await ready(page);await settle(page);await page.locator('[data-explore]').click();
    assert.equal(await page.evaluate(()=>window.studio.world.focused),'lab');
    assert.equal(await page.locator('.object-preview a').getAttribute('href'),'/lab/');
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.studio.world.focused),null);
    assert.deepEqual(log.errors,[]);await context.close();return{guidedChapter:'lab'};
  });
  await verify('room focus carries the same character and camera continuously between objects',async()=>{
    const results=[];
    for(const viewport of [{width:1440,height:1000},{width:320,height:568},{width:390,height:844}]){
      const context=await browser.newContext({viewport});const page=await context.newPage(),log=observe(page);
      await page.goto(server.base);await ready(page);await settle(page);await page.waitForTimeout(120);
      if(viewport.width===390){await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);}
      const first=await page.evaluate(()=>{
        const w=window.studio.world;window.auditFlightActor=w.actor.root;window.auditFlightRenderer=w.renderer;
        const position=w.actor.root.position.clone(),projection=w.camera.projectionMatrix.clone();w.focus('lab');
        return{distance:position.distanceTo(w.actor.root.position),projectionDifference:Math.max(...projection.elements.map((n,i)=>Math.abs(n-w.camera.projectionMatrix.elements[i])))};
      });
      assert.equal(first.distance,0);assert.ok(first.projectionDifference<1e-8);
      await page.waitForTimeout(400);
      const middle=await page.evaluate(()=>({progress:window.studio.world.focusJourney?.progress,position:window.studio.world.actor.root.position.toArray()}));
      assert.ok(middle.progress>0&&middle.progress<1,JSON.stringify(middle));
      if(viewport.width===390){
        await page.evaluate(()=>window.studio.score.context.suspend());await page.waitForTimeout(80);
        assert.ok(await page.evaluate(()=>window.studio.world.focusJourney.progress)>middle.progress);
      }
      const redirected=await page.evaluate(()=>{const w=window.studio.world,p=w.actor.root.position.clone();w.focus('radio');return p.distanceTo(w.actor.root.position);});
      assert.equal(redirected,0);await page.waitForFunction(()=>!window.studio.world.focusJourney);
      const landed=await page.evaluate(()=>{const w=window.studio.world;return{x:w.actor.root.position.x,scale:w.actor.root.scale.x,aspect:w.camera.aspect,sameActor:w.actor.root===window.auditFlightActor,sameRenderer:w.renderer===window.auditFlightRenderer};});
      assert.ok(landed.x< -1.4);assert.equal(landed.scale,.5);assert.ok(Math.abs(landed.aspect-viewport.width/viewport.height)<1e-8);
      assert.equal(landed.sameActor,true);assert.equal(landed.sameRenderer,true);
      await page.evaluate(()=>window.studio.world.focus(null));await page.waitForFunction(()=>!window.studio.world.focusJourney);
      assert.equal(await page.evaluate(()=>window.studio.world.actor.root.scale.x),1);
      await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.studio.world.focus('lab'));
      await page.waitForTimeout(100);const reducedPosition=await page.evaluate(()=>window.studio.world.actor.root.position.toArray());
      await page.waitForTimeout(150);assert.deepEqual(await page.evaluate(()=>window.studio.world.actor.root.position.toArray()),reducedPosition);
      assert.deepEqual(log.errors,[]);results.push({viewport,first,middle,landed});await context.close();
    }
    return results;
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
