import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
import {experiments,measure} from './performance-scenarios.mjs';

const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer();let browser;
const report={date:new Date().toISOString(),base:server.base,environment:{cpu:os.cpus()[0].model,platform:os.platform(),angle:process.env.BROWSER_ANGLE||'default'},
  note:'Headless desktop GPU rAF cadence, not GPU timing or physical-phone performance. Auto quality, silent audio. Active controls are scripted; repeated clicks/pointer events are included in the workload.',profiles:[],failures:[]};
const filter=process.env.PERF_CASE;
const profiles=[{name:'desktop',viewport:{width:1440,height:1000},dpr:2},{name:'phone-emulation',viewport:{width:390,height:844},dpr:3}];
function record(samples,route,phase,data){
  samples.push({route,phase,...data});
  console.log(`${route} ${phase}: ${data.frames} frames median=${data.medianMs.toFixed(2)}ms p95=${data.p95Ms.toFixed(2)}ms >50ms=${data.over50Ms}`);
}
async function heroPosition(page){
  await page.evaluate(()=>{const h=document.querySelector('.world-hero');scrollTo({top:innerWidth<=850?Math.max(0,h.offsetHeight-innerHeight+40):0,behavior:'instant'});});
  await page.waitForTimeout(100);
}
try{
  browser=await launchBrowser();report.environment.browser=browser.version();
  for(const profile of profiles){
    const context=await browser.newContext({viewport:profile.viewport,deviceScaleFactor:profile.dpr,hasTouch:profile.viewport.width<700});
    const page=await context.newPage(),log=observe(page),samples=[];report.profiles.push({...profile,samples});
    // First load is deliberately excluded: resource-loading has a separate audit.
    await page.goto(server.base+(filter?`/lab/${filter}.html`:''));await ready(page);await settle(page);
    if(!filter)for(const route of ['/','/lab/','/blog/','/radio/','/projects/','/about/','/skin/']){
      if(route!=='/')await page.evaluate(route=>window.studio.router.navigate(route),route);await settle(page);await heroPosition(page);
      await page.waitForTimeout(400);const data=await measure(page);assert.ok(data.after.state.renderedFrames>data.before.state.renderedFrames);
      record(samples,route,'hero ambient',data);
    }
    for(const scenario of experiments.filter(s=>!filter||s.id===filter)){
      const route=`/lab/${scenario.id}.html`;await page.evaluate(route=>window.studio.router.navigate(route),route);await settle(page);
      await page.locator(scenario.hero).click();await heroPosition(page);
      const data=await measure(page,{action:scenario.action==='drive'?null:scenario.action});
      assert.ok(data.after.state.renderedFrames>data.before.state.renderedFrames);record(samples,route,'hero active',data);
      await page.screenshot({path:path.join(output,`performance-${scenario.id}-hero-${profile.viewport.width}.png`)});
      await page.locator('.hero-copy .explore-button').click();
      const frame=await(await page.locator('.experiment-frame').elementHandle()).contentFrame();
      await frame.waitForFunction(key=>{const d=window[key]?.diagnostics();return d&&(d.active===true||d.visible===true);},scenario.global);
      await page.evaluate(()=>document.querySelector('.experiment-frame').scrollIntoView({block:'center',behavior:'instant'}));
      await page.waitForTimeout(220);
      if(scenario.id==='moon'){
        await frame.waitForFunction(()=>window.moonExperiment.diagnostics().mode==='landed');
        await frame.locator('#land-btn').click();await frame.locator('#land-btn').click();
      }else if(['trails','breakout','bullet'].includes(scenario.id)){
        if(scenario.id!=='trails')await frame.locator(`[data-${scenario.id}-reset]`).click();
        else await frame.locator('[data-trails-reset]').click();
        await frame.locator(scenario.hero).click();
      }
      const parentBefore=await page.evaluate(()=>window.studio.world.renderedFrames);
      const child=await measure(frame,{global:scenario.global,action:scenario.action});
      const parentAfter=await page.evaluate(()=>window.studio.world.renderedFrames);
      child.parentFrames=parentAfter-parentBefore;
      const first=child.before.state.frames??child.before.state.renderedFrames;
      if(first!==undefined)assert.ok((child.after.state.frames??child.after.state.renderedFrames)>first,`${scenario.id} must actually render`);
      assert.ok(child.parentFrames<=2,`${scenario.id}: offscreen hero rendered ${child.parentFrames} times`);
      record(samples,route,'embedded active',child);
      await page.screenshot({path:path.join(output,`performance-${scenario.id}-play-${profile.viewport.width}.png`)});
    }
    const errors=log.drain();assert.deepEqual(errors.errors,[]);assert.deepEqual(errors.failed,[]);await context.close();
  }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'performance-audit.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();await server.close();
}
console.log(JSON.stringify({profiles:report.profiles.map(p=>({name:p.name,samples:p.samples.length})),failures:report.failures}));
