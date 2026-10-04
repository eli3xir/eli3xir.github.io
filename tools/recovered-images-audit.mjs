import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';

const articles=JSON.parse(fs.readFileSync('assets/blog/recovered/manifest.json','utf8')).articles;
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer();
const browser=await launchBrowser(),report={base:server.base,cases:[],failures:[]};
const layoutOnly=process.env.RECOVERED_LAYOUT_ONLY==='1';
fs.mkdirSync(output,{recursive:true});
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();
  if(!layoutOnly)for(const article of articles){
   const unresolved=new Set(article.unresolved.map(image=>image.original));
   // Explicitly exercise the existing failed-image UI for the two unresolved
   // originals. Their real HTTP 404 responses are recorded in the source audit.
   for(const url of unresolved)await page.route(url,route=>route.fulfill({status:404,contentType:'text/plain',body:'Not found'}));
   const log=observe(page);
   await page.goto(server.base+article.article,{waitUntil:'domcontentloaded'});await ready(page);await settle(page);
   await page.locator('.post-content img').evaluateAll(images=>images.forEach(image=>{image.loading='eager';}));
   const figures=page.locator('.post-content img'),results=[];
   for(const expected of article.images){
    const figure=figures.nth(expected.index);await figure.evaluate(image=>image.decode());await figure.scrollIntoViewIfNeeded();
    const actual=await figure.evaluate(image=>({src:new URL(image.src).pathname,alt:image.alt,width:image.naturalWidth,height:image.naturalHeight,
     rendered:image.getBoundingClientRect().toJSON(),hidden:image.hidden,overflow:document.documentElement.scrollWidth>innerWidth}));
    assert.equal(actual.src,expected.local);assert.equal(actual.alt,expected.alt);assert.equal(actual.width,expected.width);assert.equal(actual.height,expected.height);
    assert.equal(actual.hidden,false);assert.equal(actual.overflow,false);assert.ok(actual.rendered.width>0);assert.ok(actual.rendered.left>=-1&&actual.rendered.right<=viewport.width+1);
    assert.ok(Math.abs(actual.rendered.height/actual.rendered.width-expected.height/expected.width)<.01);
    results.push(actual);
    if([article.images[0],article.images.at(-1)].includes(expected))await page.screenshot({path:`${output}/recovered-${article.article.split('/').pop()}-${viewport.width}-${expected.index}.png`});
   }
   const credits=await page.locator('.post-image-sources a').evaluateAll(links=>links.map(link=>({label:link.textContent,url:link.href})));
   assert.deepEqual(credits,article.credits);
   const source=page.locator('.post-image-sources');await source.scrollIntoViewIfNeeded();
   await page.screenshot({path:`${output}/recovered-credit-${article.article.split('/').pop()}-${viewport.width}.png`});
   assert.equal(await page.locator('.image-fallback').count(),unresolved.size);
   const failed=log.drain();assert.deepEqual(failed.errors,[]);assert.ok(failed.failed.every(request=>unresolved.has(request.url)),JSON.stringify(failed));
   report.cases.push({article:article.article,viewport,images:results,credits,simulatedUnavailable:[...unresolved]});
   console.log(`PASS ${article.article} ${viewport.width}: ${results.length} recovered figures, credits and overflow`);
   for(const url of unresolved)await page.unroute(url);
  }
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/blog/recovered/*.png',async route=>{await gate;await route.continue();});
  try{
   await page.goto(server.base+'/blog/59698.html#section-10',{waitUntil:'domcontentloaded'});await ready(page);await settle(page);
   await page.waitForFunction(()=>document.activeElement.id==='section-10');
   // Compare image-induced movement after typography has settled. A late
   // font may reflow the title while native scroll anchoring holds the target.
   await page.evaluate(()=>document.fonts.ready);
   const positions=()=>page.locator('.post-content h1,.post-content h2,.post-content h3').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top+scrollY));
   const before=await positions(),reserved=await page.locator('.post-content img[src^="/assets/blog/recovered/"]').evaluateAll(images=>images.map(image=>({height:image.getBoundingClientRect().height,naturalWidth:image.naturalWidth})));
   assert.equal(reserved.length,26);assert.ok(reserved.every(image=>image.height>0&&image.naturalWidth===0));
   await page.locator('.post-content img').evaluateAll(images=>images.forEach(image=>{image.loading='eager';}));release();
   await page.locator('.post-content img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));await page.waitForTimeout(150);
   const after=await positions();assert.ok(after.every((value,index)=>Math.abs(value-before[index])<1),JSON.stringify({before,after}));
   assert.equal(await page.evaluate(()=>window.studio.world.model.index),10);
   assert.ok(await page.locator('#section-10').evaluate(node=>Math.abs(node.getBoundingClientRect().top-62)<1));
   report.cases.push({name:'26 recovered images preserve direct chapter link',viewport,reserved,before,after});
   console.log(`PASS delayed restored figures and direct chapter ${viewport.width}`);
  }finally{release();await context.close();}
  const fontContext=await browser.newContext({viewport,reducedMotion:'reduce'}),fontPage=await fontContext.newPage();
  let releaseFont,intercepted=false;const fontGate=new Promise(resolve=>{releaseFont=resolve;});
  await fontPage.route('**/assets/fonts/SpaceGrotesk.ttf',async route=>{intercepted=true;await fontGate;await route.continue();});
  const position=()=>fontPage.evaluate(()=>({top:document.querySelector('#section-10').getBoundingClientRect().top,scroll:scrollY,
   titleHeight:document.querySelector('.post-head h2').getBoundingClientRect().height,active:document.activeElement.id,index:window.studio.world.model.index,
   fonts:document.fonts.status,overflow:document.documentElement.scrollWidth>innerWidth}));
  try{
   await fontPage.goto(server.base+'/blog/59698.html#section-10',{waitUntil:'domcontentloaded'});await ready(fontPage);await settle(fontPage);
   await fontPage.waitForFunction(()=>document.activeElement.id==='section-10');
   const before=await position();assert.equal(intercepted,true);assert.equal(before.fonts,'loading');releaseFont();
   await fontPage.evaluate(()=>document.fonts.ready);await fontPage.waitForTimeout(150);const after=await position();
   assert.equal(after.fonts,'loaded');assert.equal(after.active,'section-10');assert.equal(after.index,10);assert.equal(after.overflow,false);
   // Font substitution can produce a small native anchoring residual (1.3125
   // CSS px measured repeatedly); bound both the final position and movement.
   assert.ok(Math.abs(before.top-62)<=2&&Math.abs(after.top-62)<=2&&Math.abs(after.top-before.top)<=2,JSON.stringify({before,after}));
   report.cases.push({name:'late font preserves viewport reading position',viewport,before,after});console.log(`PASS delayed font and viewport reading position ${viewport.width}`);
  }finally{releaseFont();await fontContext.close();}
 }
 assert.equal(report.cases.reduce((count,result)=>count+(result.images?.length||0),0),layoutOnly?0:130);
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/recovered-images-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log(JSON.stringify({cases:report.cases.length,failures:report.failures}));
