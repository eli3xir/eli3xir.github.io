import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer();
const browser=await launchBrowser(),report={base:server.base,cases:[]};fs.mkdirSync(output,{recursive:true});
try{
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page);
    await page.goto(server.base+'/projects/');await ready(page);await settle(page);
    const input=page.getByRole('textbox',{name:'发送一句话'}),sender=page.getByRole('combobox',{name:'发送终端'}),submit=page.locator('.signal-form button');
    assert.equal(await page.locator('.pcard').count(),4);assert.equal(await page.locator('.signal-source').getAttribute('href'),'https://gitee.com/buptsg2019/cpp-chat-room');
    await input.fill('');await submit.click();assert.equal(await page.evaluate(()=>window.studio.route.relay.state.serial),0);
    await sender.selectOption('1');await input.fill('从 B 发来的好奇心');await input.press('Enter');
    assert.equal(await submit.isDisabled(),true);assert.equal(await sender.isDisabled(),true);
    const sending=await page.evaluate(()=>({...window.studio.route.relay.state}));assert.equal(sending.sender,1);assert.equal(sending.clients[0],'');
    await page.waitForFunction(()=>window.studio.route.relay.state.phase==='delivering');
    await page.screenshot({path:`${output}/signal-flow-${viewport.width}.png`});
    await page.waitForFunction(()=>!window.studio.route.relay.state.busy);
    const delivered=await page.evaluate(()=>window.studio.route.relay.state);assert.deepEqual(delivered.clients,Array(3).fill('从 B 发来的好奇心'));
    await page.screenshot({path:`${output}/signal-done-${viewport.width}.png`});
    // Only a real terminal hit changes the sender; empty hero space is inert.
    await page.mouse.click(10,125);assert.equal(await sender.inputValue(),'1');
    const terminal=await page.evaluate(async()=>{
      const {Vector3}=await import('three');const w=window.studio.world,bench=w.model.root.children[0];w.camera.updateMatrixWorld();bench.updateWorldMatrix(true,true);
      const p=bench.localToWorld(new Vector3(-1.15,-.23,.36)).project(w.camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};
    });await page.mouse.click(terminal.x,terminal.y);assert.equal(await sender.inputValue(),'0');
    await page.locator('.sound-toggle').click();await page.waitForFunction(()=>window.studio.score.audible);
    await input.fill('声音与信号同拍');await submit.click();await page.locator('.sound-toggle').click();
    await page.waitForFunction(()=>!window.studio.route.relay.state.busy);assert.equal(await page.evaluate(()=>window.studio.route.relay.state.serial),2);
    await page.emulateMedia({reducedMotion:'reduce'});
    const memory=await page.evaluate(()=>{
      const w=window.studio.world,relay=window.studio.route.relay,samples=[];
      for(let i=0;i<40;i++){relay.select(i%3);relay.send('message '+i,{now:performance.now()/1000,reduced:true});w.moving=1;w.frame(performance.now());samples.push(w.renderer.info.memory.textures);}
      return samples;
    });assert.equal(Math.max(...memory),Math.min(...memory));
    await page.evaluate(()=>window.studio.router.navigate('/blog/'));await settle(page);
    await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);
    assert.equal(await page.evaluate(()=>window.studio.route.relay.state.serial),0);
    await input.fill('立即送达');await submit.click();assert.equal(await submit.isDisabled(),false);
    assert.equal(await page.evaluate(()=>window.studio.route.relay.state.phase),'delivered');
    await page.getByRole('link',{name:'实现笔记'}).click();await settle(page);
    assert.equal(new URL(page.url()).pathname,'/blog/50706.html');assert.equal(new URL(page.url()).hash,'#content');
    assert.ok(await page.locator('.post-content').count());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);
    assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
    report.cases.push({viewport,sending,delivered,terminal,textures:memory[0],...log.drain()});await context.close();
  }
  const context=await browser.newContext(),page=await context.newPage();
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  await page.goto(server.base+'/projects/');await ready(page);await settle(page);
  await page.getByRole('textbox',{name:'发送一句话'}).fill('文字依然可用');await page.locator('.signal-form button').click();
  assert.equal(await page.evaluate(()=>window.studio.route.relay.state.phase),'delivered');assert.equal(await page.locator('.pcard').count(),4);
  report.cases.push({noWebGL:true,localRelay:true});await context.close();
}finally{fs.writeFileSync(`${output}/signal-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify(report,null,2));
