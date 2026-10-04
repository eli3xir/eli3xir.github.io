import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser();
const report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
const firstSource=JSON.parse(fs.readFileSync('assets/blog/recovered/manifest.json','utf8')).articles.find(a=>a.article==='/blog/4830.html').images[0].local;
async function openArticle(page,path='/blog/4830.html'){
 await page.goto(server.base+path,{waitUntil:'domcontentloaded'});await ready(page);await settle(page);await page.evaluate(()=>document.fonts.ready);
}
async function settledImage(page){
 await page.waitForFunction(()=>document.querySelector('.image-inspector[open] .image-inspector-viewport')?.getAttribute('aria-busy')===null);
 await page.locator('.image-inspector').evaluate(dialog=>Promise.all(dialog.getAnimations().map(animation=>animation.finished)));
}
const state=page=>page.locator('.image-inspector').evaluate(dialog=>{
 const view=dialog.querySelector('.image-inspector-viewport'),image=view.querySelector('img');
 return{open:dialog.open,modal:dialog.matches(':modal'),focus:document.activeElement.className,src:image.getAttribute('src'),alt:image.alt,
  natural:[image.naturalWidth,image.naturalHeight],image:image.getBoundingClientRect().toJSON(),view:view.getBoundingClientRect().toJSON(),dialog:dialog.getBoundingClientRect().toJSON(),
  scroll:[view.scrollLeft,view.scrollTop],size:[view.scrollWidth,view.scrollHeight],client:[view.clientWidth,view.clientHeight],
  status:dialog.querySelector('.image-inspector-status').textContent,overflow:document.documentElement.scrollWidth>innerWidth,
  buttons:[...dialog.querySelectorAll('button')].map(button=>({text:button.textContent,height:button.getBoundingClientRect().height}))};
});
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page);
  await openArticle(page);assert.equal(await page.locator('.article-image-open').count(),8);
  const opener=page.locator('.article-image-open').first();await opener.scrollIntoViewIfNeeded();await opener.locator('img').evaluate(image=>image.decode());
  await opener.focus();const original=await opener.evaluate(node=>({top:node.getBoundingClientRect().top,scroll:scrollY,width:node.querySelector('img').getBoundingClientRect().width,src:node.querySelector('img').src,alt:node.querySelector('img').alt}));
  await page.keyboard.press('Enter');await settledImage(page);const initial=await state(page);
  assert.ok(initial.image.width>original.width*1.1);assert.ok(Math.abs(initial.dialog.left-(viewport.width-initial.dialog.width)/2)<1,JSON.stringify(initial));
  await page.screenshot({path:`${output}/inspector-open-${viewport.width}.png`});
  await page.getByRole('button',{name:'适合窗口',exact:true}).click();const fit=await state(page);await page.getByRole('button',{name:'关闭图片'}).focus();
  assert.equal(fit.modal,true);assert.equal(initial.focus,'image-inspector-close');assert.equal(fit.overflow,false);assert.equal(fit.alt,original.alt);
  assert.ok(fit.image.left>=fit.view.left&&fit.image.right<=fit.view.right&&fit.image.top>=fit.view.top&&fit.image.bottom<=fit.view.bottom,JSON.stringify(fit));
  assert.ok(fit.buttons.every(button=>button.height>=44));
  await page.locator('.sound-toggle').evaluate(button=>button.focus());assert.equal(await page.evaluate(()=>document.activeElement.className),'image-inspector-close');
  const tabOrder=[];for(let i=0;i<5;i++){await page.keyboard.press('Tab');tabOrder.push(await page.evaluate(()=>({inDialog:!!document.activeElement.closest('.image-inspector'),label:document.activeElement.textContent?.slice(0,35)||document.activeElement.className})));}
  assert.ok(tabOrder.every(item=>item.inDialog),JSON.stringify(tabOrder));
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.className),'image-inspector-viewport');await page.keyboard.press('Tab');
  await page.screenshot({path:`${output}/inspector-fit-${viewport.width}.png`});
  await page.getByRole('button',{name:'原尺寸',exact:true}).click();const actual=await state(page);
  assert.equal(actual.image.width,actual.natural[0]);assert.equal(actual.image.height,actual.natural[1]);assert.ok(actual.status.startsWith('100%'));
  assert.equal(await page.locator('.image-inspector-original').getAttribute('href'),original.src);
  const region=page.locator('.image-inspector-viewport'),box=await region.boundingBox();
  const beforePan=actual.scroll;
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.6-100,box.y+box.height*.6-55,{steps:8});await page.mouse.up();
  const panned=await state(page);assert.ok(panned.scroll.some((value,i)=>value>beforePan[i]+20),JSON.stringify({actual,panned}));
  await page.mouse.down();await region.dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});assert.equal(await region.evaluate(node=>node.classList.contains('is-dragging')),false);await page.mouse.up();
  await region.focus();await page.keyboard.press('Home');await page.waitForTimeout(180);const home=await state(page);
  await page.keyboard.press('ArrowDown');await page.waitForTimeout(180);const keyboard=await state(page);assert.ok(keyboard.scroll[1]>home.scroll[1]+1);
  await page.screenshot({path:`${output}/inspector-detail-${viewport.width}.png`});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.image-inspector:modal').count(),0);
  const restored=await opener.evaluate(node=>({focused:document.activeElement===node,top:node.getBoundingClientRect().top,scroll:scrollY,overflow:document.body.style.overflow}));
  assert.equal(restored.focused,true);assert.ok(Math.abs(restored.top-original.top)<1,JSON.stringify({original,restored}));assert.equal(restored.overflow,'');
  for(let i=0;i<8;i++){await opener.click();await settledImage(page);await page.getByRole('button',{name:'原尺寸',exact:true}).click();await page.getByRole('button',{name:'关闭图片'}).click();}
  assert.equal(await page.locator('.image-inspector').count(),1);
  await opener.click();await settledImage(page);await page.getByRole('button',{name:'原尺寸',exact:true}).click();
  await page.setViewportSize(viewport.width===390?{width:844,height:390}:{width:320,height:568});await page.waitForTimeout(100);const resized=await state(page);
  assert.equal(resized.image.width,resized.natural[0]);assert.ok(resized.dialog.left>=0&&resized.dialog.right<=page.viewportSize().width);assert.ok(resized.dialog.bottom<=page.viewportSize().height);
  await page.getByRole('button',{name:'适合窗口',exact:true}).click();const fittedAgain=await state(page);assert.ok(fittedAgain.image.width<=fittedAgain.view.width);
  await page.mouse.click(2,2);assert.equal(await page.locator('.image-inspector:modal').count(),0);
  await page.setViewportSize(viewport);await opener.click();await settledImage(page);
  await page.evaluate(()=>window.studio.router.navigate('/blog/19721.html'));await settle(page);
  assert.equal(await page.locator('.image-inspector').count(),0);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.equal(await page.locator('.article-image-open').count(),6);
  await page.evaluate(()=>window.studio.router.navigate('/projects/'));await settle(page);assert.equal(await page.locator('.article-image-open').count(),0);
  assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({name:'inspect, pan, keyboard, return, resize and route cleanup',viewport,initial,fit,actual,panned,keyboard,restored,resized,tabOrder});await context.close();console.log(`PASS image inspector, input and cleanup ${viewport.width}`);
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  await openArticle(page);const source=page.locator('.article-image-open img').first();await source.scrollIntoViewIfNeeded();await source.evaluate(image=>image.decode());const box=await source.boundingBox();
  await page.touchscreen.tap(box.x+box.width*.35,box.y+box.height*.45);await settledImage(page);const initial=await state(page);
  assert.equal(initial.image.width,initial.natural[0]);
  const focus=[(initial.view.left+initial.client[0]/2-initial.image.left)/initial.image.width,(initial.view.top+initial.client[1]/2-initial.image.top)/initial.image.height];
  assert.ok(Math.abs(focus[0]-.35)<.03&&Math.abs(focus[1]-.45)<.03,JSON.stringify({initial,focus}));
  const cdp=await context.newCDPSession(page),x=initial.view.x+initial.view.width*.7,y=initial.view.y+initial.view.height*.6;
  for(const [dx,dy,end] of [[14,0,'touchEnd'],[0,10,'touchCancel']]){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*dx,y:y-i*dy}]});await page.waitForTimeout(20);}
   await cdp.send('Input.dispatchTouchEvent',{type:end,touchPoints:[]});await page.waitForTimeout(120);
  }
  const panned=await state(page);
  assert.ok(panned.scroll[0]>initial.scroll[0]+30&&panned.scroll[1]>initial.scroll[1]+20,JSON.stringify({initial,panned}));
  assert.equal(await page.locator('.image-inspector-viewport').evaluate(node=>node.classList.contains('is-dragging')),false);
  await page.screenshot({path:`${output}/inspector-touch-390.png`});await page.getByRole('button',{name:'关闭图片'}).tap();
  assert.equal(await page.evaluate(()=>document.activeElement.className),'article-image-open');assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({name:'emulated touch opens selected detail and natively pans/cancels',initial,focus,panned});await context.close();console.log('PASS touch detail, native pan and cancellation');
 }
 for(const outcome of ['close-before-load','image-failure']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**'+firstSource,async route=>{await gate;if(outcome==='image-failure')await route.fulfill({status:404,body:'Unavailable'});else await route.continue().catch(()=>{});});
  try{
   await openArticle(page);const opener=page.locator('.article-image-open').first();await opener.click();
   assert.equal(await page.locator('.image-inspector-viewport').getAttribute('aria-busy'),'true');
   if(outcome==='close-before-load'){
    await page.getByRole('button',{name:'关闭图片'}).click();release();await opener.locator('img').evaluate(image=>image.decode());
    assert.equal(await page.locator('.image-inspector:modal').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.className),'article-image-open');
    await opener.click();await settledImage(page);assert.ok((await state(page)).status.startsWith('100%'));await page.keyboard.press('Escape');
   }else{
    release();await page.waitForFunction(()=>document.querySelector('.image-inspector-status').textContent.includes('暂时无法载入'));
    await page.setViewportSize({width:430,height:740});await page.waitForTimeout(100);
    assert.ok((await state(page)).status.includes('暂时无法载入'));assert.equal(await page.locator('.image-inspector [data-image-mode]:disabled').count(),2);
    assert.equal(await page.locator('.article-image-open .image-fallback').count(),0);await page.getByRole('button',{name:'关闭图片'}).click();
    assert.equal(await page.evaluate(()=>document.activeElement.className),'image-fallback');
    assert.ok(await page.locator('.image-fallback').first().evaluate(node=>node.getBoundingClientRect().top>=60&&node.getBoundingClientRect().bottom<=innerHeight));
   }
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.deepEqual(log.errors,[]);
   assert.ok(log.failed.every(item=>new URL(item.url).pathname===firstSource&&(outcome==='image-failure'?item.status===404:item.error==='net::ERR_ABORTED')),JSON.stringify(log.failed));
   report.cases.push({name:outcome,expectedRequests:log.failed});console.log(`PASS ${outcome}`);
  }finally{release();await context.close();}
 }
 {
  const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page);
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
  await openArticle(page);await page.locator('.article-image-open').first().click();await settledImage(page);
  assert.equal(await page.evaluate(()=>window.studio.world),null);assert.equal(await page.locator('.image-inspector').evaluate(dialog=>dialog.getAnimations().length),0);
  await page.getByRole('button',{name:'原尺寸',exact:true}).click();const result=await state(page);assert.equal(result.image.width,result.natural[0]);await page.getByRole('button',{name:'关闭图片'}).click();
  assert.ok(log.errors.every(error=>error.includes('Error creating WebGL context')));assert.deepEqual(log.failed,[]);
  report.cases.push({name:'reduced motion without WebGL',result});await context.close();console.log('PASS reduced-motion inspector without WebGL');
 }
 {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
  await page.addInitScript(()=>{HTMLDialogElement.prototype.showModal=undefined;});await openArticle(page);
  const opener=page.locator('.article-image-open').first();assert.equal(await opener.evaluate(node=>node.tagName),'A');
  const waiting=page.waitForEvent('popup');await opener.click();const popup=await waiting;await popup.waitForLoadState('domcontentloaded');
  assert.equal(new URL(popup.url()).pathname,firstSource);assert.equal(await page.locator('.image-inspector').count(),0);await popup.close();
  report.cases.push({name:'unsupported dialog opens original image'});await context.close();console.log('PASS original-image fallback');
 }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/image-inspector-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
