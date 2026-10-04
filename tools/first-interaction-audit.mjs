import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,quality:process.env.QUALITY_MODE||'auto',note:'Fresh browser contexts; measurements include the first control activation. Frame cadence is desktop emulation, not physical-phone GPU time.',cases:[],failures:[]};
fs.mkdirSync(output,{recursive:true});
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}])for(const id of ['fluid','breakout']){
  const context=await browser.newContext({viewport,deviceScaleFactor:viewport.width<700?3:2}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+`/lab/${id}.html`);await ready(page);await settle(page);
  if(process.env.QUALITY_MODE){await page.locator('.sound-settings summary').click();await page.getByLabel('画面质量',{exact:true}).selectOption(process.env.QUALITY_MODE);await page.locator('.sound-settings summary').click();}
  await page.locator('.hero-copy .explore-button').click();const frame=await(await page.locator('.experiment-frame').elementHandle()).contentFrame();
  await frame.waitForFunction(id=>window[id+'Experiment']?.diagnostics().active,id);
  await page.evaluate(()=>document.querySelector('.experiment-frame').scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(220);
  const data=await frame.evaluate(async id=>{
   const e=window[id+'Experiment'],r=e.renderer,model=e.model;
   const before={programs:r.info.programs.length,...r.info.memory,frames:e.diagnostics().frames},frames=[];let previous;
   const collecting=new Promise(resolve=>{const start=performance.now();function frame(now){if(previous!==undefined)frames.push(now-previous);previous=now;if(performance.now()-start<2800)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   // Use the same semantic controls as a visitor, without modifying simulation state.
   if(id==='fluid')document.querySelector('canvas').focus();
   document.querySelector(`[data-${id}-${id==='fluid'?'drop':'launch'}]`).click();
   await collecting;
   const after={programs:r.info.programs.length,...r.info.memory,frames:e.diagnostics().frames};
   const sorted=[...frames].sort((a,b)=>a-b);
   return{before,after,maxMs:Math.max(...frames),p95Ms:sorted[Math.floor(sorted.length*.95)],over50Ms:frames.filter(n=>n>50).length,
    state:id==='fluid'?{steps:model.diagnostics().steps,drop:model.diagnostics().drop}: {hits:e.state.state.hits,lives:e.state.state.lives},
    colorPool:id==='breakout'?Boolean(model.effects.shards.instanceColor):null};
  },id);
  report.cases.push({id,viewport,...data});assert.equal(data.after.programs,data.before.programs,`${id}: first interaction compiled another shader variant`);
  assert.ok(data.after.frames-data.before.frames>30);
  if(id==='breakout'){assert.ok(data.state.hits>0);assert.equal(data.colorPool,true);}else assert.ok(data.state.steps>30);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  await page.screenshot({path:`${output}/first-${id}-${viewport.width}.png`});
  console.log(`PASS ${id} ${viewport.width}: programs=${data.before.programs} max=${data.maxMs.toFixed(1)}ms >50=${data.over50Ms}`);await context.close();
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/first-interaction-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
