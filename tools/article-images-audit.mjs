import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const manifest=JSON.parse(fs.readFileSync('assets/blog/transport/manifest.json','utf8'));
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[]};
fs.mkdirSync(output,{recursive:true});
try{
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  const context=await browser.newContext({viewport}),page=await context.newPage(),log=observe(page);
  await page.goto(server.base+manifest.article);await ready(page);await settle(page);
  const images=page.locator('.post-content img');assert.equal(await images.count(),12);
  const results=[];
  for(let index=0;index<12;index++){
   const image=images.nth(index);await image.scrollIntoViewIfNeeded();
   await image.evaluate(image=>image.decode());
   const data=await image.evaluate(image=>({src:new URL(image.src).pathname,alt:image.alt,width:image.naturalWidth,height:image.naturalHeight,
    rendered:image.getBoundingClientRect().width,hidden:image.hidden,overflow:document.documentElement.scrollWidth>innerWidth}));
   const expected=manifest.images[index];assert.equal(data.src,expected.local);assert.equal(data.alt,expected.alt);assert.equal(data.width,expected.width);assert.equal(data.height,expected.height);assert.equal(data.hidden,false);assert.equal(data.overflow,false);results.push(data);
   if([2,9,11].includes(index))await page.screenshot({path:`${output}/article-figures-${viewport.width}-${index}.png`});
  }
  const credit=page.locator('.post-source a');assert.equal(await credit.getAttribute('href'),manifest.sourcePage);assert.ok((await credit.textContent()).includes(manifest.author));
  await credit.scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/article-credit-${viewport.width}.png`});
  assert.equal(await page.locator('.image-fallback').count(),0);assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);
  report.cases.push({viewport,images:results,credit:await credit.textContent()});await context.close();console.log(`PASS 12 original-label figures and source credit ${viewport.width}`);
 }
}finally{fs.writeFileSync(`${output}/article-images-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}
