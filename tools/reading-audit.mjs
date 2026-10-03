import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer();
const browser=await launchBrowser(),results=[];
fs.mkdirSync(output,{recursive:true});
try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page);
    await page.goto(server.base+'/blog/');await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
    const entries=await page.evaluate(()=>window.studio.route.readingEntries);assert.equal(entries.length,39);
    const link=page.locator('.reading-title'),next=page.getByRole('button',{name:'翻到下一篇'});
    assert.equal(await link.textContent(),entries[0].title);assert.equal(await link.getAttribute('href'),entries[0].href);
    assert.ok(entries.every(entry=>entry.href.startsWith('/blog/')));
    await page.screenshot({path:`${output}/reading-${viewport.width}.png`});
    // Blank hero space must not turn the book.
    await page.mouse.click(10,125);assert.equal(await page.evaluate(()=>window.studio.world.model.turning),false);
    await next.focus();await page.keyboard.press('Enter');await page.waitForTimeout(300);
    const halfway=await page.evaluate(()=>window.studio.world.model.turnProgress);assert.ok(halfway>0&&halfway<1);
    await page.screenshot({path:`${output}/reading-turn-${viewport.width}.png`});
    await page.waitForFunction(()=>!window.studio.world.model.turning);
    assert.equal(await link.textContent(),entries[1].title);
    // Rapid requests finish the active page and retain one next request.
    const continuous=await page.evaluate(()=>{const w=window.studio.world;w.interact();return new Promise(resolve=>setTimeout(()=>{
      const before=w.model.turnProgress;w.interact();w.interact();resolve({before,after:w.model.turnProgress});
    },250));});assert.equal(continuous.before,continuous.after);
    await page.waitForFunction(()=>!window.studio.world.model.turning);assert.equal(await link.textContent(),entries[3].title);
    // Explicitly frozen music time must not freeze the physical action.
    await page.evaluate(()=>{Object.defineProperty(window.studio.score,'time',{configurable:true,get:()=>12});window.studio.world.interact();});
    await page.waitForFunction(()=>!window.studio.world.model.turning);assert.equal(await link.textContent(),entries[4].title);
    await page.evaluate(()=>delete window.studio.score.time);
    // Raycast the actual book, not arbitrary hero space.
    const hit=await page.evaluate(async()=>{
      const {Vector3}=await import('three');const w=window.studio.world;w.camera.updateMatrixWorld();w.model.root.updateMatrixWorld(true);
      const p=w.model.root.localToWorld(new Vector3(.65,0,.15)).project(w.camera);
      return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
    });await page.mouse.click(hit.x,hit.y);await page.waitForFunction(()=>window.studio.world.model.index===5);
    await page.emulateMedia({reducedMotion:'reduce'});await next.click();
    assert.equal(await page.evaluate(()=>window.studio.world.model.turning),false);assert.equal(await link.textContent(),entries[6].title);
    // A full catalogue must keep texture allocations bounded.
    const memory=await page.evaluate(async()=>{
      const w=window.studio.world;const samples=[];
      for(let i=0;i<45;i++){w.interact();w.frame(performance.now());samples.push(w.renderer.info.memory.textures);}
      return samples;
    });assert.ok(Math.max(...memory)-Math.min(...memory)<=1,JSON.stringify(memory));
    await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('.sound-toggle').click();
    await page.waitForFunction(()=>window.studio.score.audible);
    await page.evaluate(()=>{
      const s=window.studio.score,original=s.cue.bind(s);window.readingCues=[];
      s.cue=(kind,delay=0)=>{window.readingCues.push({kind,delay,beat:(s.time+delay)*112/60});original(kind,delay);};
      window.studio.world.interact();window.studio.world.interact();window.studio.world.interact();
    });await page.waitForFunction(()=>!window.studio.world.model.turning);
    const cues=await page.evaluate(()=>window.readingCues);assert.equal(cues.length,2);
    assert.ok(cues[0].delay>=0&&cues[0].delay<.3);assert.ok(Math.abs(cues[0].beat*2-Math.round(cues[0].beat*2))<.04);
    assert.equal(cues[1].delay,0);await page.locator('.sound-toggle').click();
    await page.emulateMedia({reducedMotion:'reduce'});
    const target=await link.getAttribute('href');await link.click();await settle(page);
    assert.equal(new URL(page.url()).pathname,target);assert.equal(await page.locator('.reading-choice').count(),0);
    assert.equal(await page.locator('.post-content').count(),1);
    await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);
    await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
    assert.equal(await link.getAttribute('href'),entries[0].href);assert.equal(await page.locator('.post-item').count(),39);
    assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed.filter(item=>new URL(item.url).origin===server.base),[]);
    results.push({viewport,halfway,continuous,hit,cues,textures:{min:Math.min(...memory),max:Math.max(...memory)},entries:entries.length,errors:log.errors});
    await context.close();
  }
  const fallback=await browser.newContext(),page=await fallback.newPage();
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await page.goto(server.base+'/blog/');await ready(page);await settle(page);
  assert.equal(await page.evaluate(()=>window.studio.world),null);
  await page.getByRole('button',{name:'翻到下一篇'}).click();
  assert.equal(await page.locator('.reading-title').textContent(),await page.locator('.post-title').nth(1).textContent());
  results.push({noWebGL:true,readingAvailable:true});await fallback.close();
}finally{fs.mkdirSync(output,{recursive:true});fs.writeFileSync(`${output}/reading-audit.json`,JSON.stringify(results,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(results,null,2));
