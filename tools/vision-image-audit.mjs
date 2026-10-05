import fs from 'node:fs';import assert from 'node:assert/strict';
import {startServer,launchBrowser,ready,settle,observe,output} from './browser-support.mjs';
const server=process.env.BASE_URL?{base:process.env.BASE_URL,close:async()=>{}}:await startServer(),browser=await launchBrowser(),report={base:server.base,cases:[],failures:[]};fs.mkdirSync(output,{recursive:true});
async function comparePixels(page){return page.evaluate(async()=>{
 const T=await import('three'),w=window.studio.world,m=w.model.optical,r=w.renderer;w.stop();w.moving=1;w.frame(performance.now());
 // Normalize the independent input to the display contract before comparing
 // uploads. Different texture sizes otherwise use different mipmap footprints.
 const input=window.studio.route.vision.state.image,expected=document.createElement('canvas');expected.width=expected.height=512;expected.getContext('2d').drawImage(input,0,0,512,512);
 const reference=new T.CanvasTexture(expected);reference.colorSpace=T.SRGBColorSpace;
 const scene=new T.Scene(),target=new T.WebGLRenderTarget(64,64),old=r.getRenderTarget(),buffers=[];
 const material=new T.ShaderMaterial({uniforms:{source:{value:m.photo}},vertexShader:'varying vec2 sampleUV;void main(){sampleUV=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'varying vec2 sampleUV;uniform sampler2D source;void main(){gl_FragColor=texture2D(source,sampleUV);}',toneMapped:false});
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),material);scene.add(quad);
 try{for(const texture of [m.photo,reference]){material.uniforms.source.value=texture;r.setRenderTarget(target);r.render(scene,new T.Camera());const bytes=new Uint8Array(64*64*4);r.readRenderTargetPixels(target,0,0,64,64,bytes);buffers.push(bytes);}}
 finally{r.setRenderTarget(old);target.dispose();quad.geometry.dispose();material.dispose();reference.dispose();w.moving=1;w.frame(performance.now());w.start();}
 let sum=0,maximum=0,bright=0;for(let i=0;i<buffers[0].length;i+=4){if(buffers[0][i]+buffers[0][i+1]+buffers[0][i+2]>180)bright++;for(let c=0;c<3;c++){const d=Math.abs(buffers[0][i+c]-buffers[1][i+c]);sum+=d;maximum=Math.max(maximum,d);}}
 const surface=m.root.children.find(child=>child.material?.map===m.photo);
 return{meanDifference:sum/(64*64*3),maximum,bright,textureSize:[m.photo.image.width,m.photo.image.height],aspect:surface.scale.x/surface.scale.y};
});}
try{for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
 const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage(),log=observe(page),warnings=[];page.on('console',m=>{if(/GL_INVALID|texSubImage|texStorage/i.test(m.text()))warnings.push(m.text());});
 let release,arrived;const gate=new Promise(resolve=>release=resolve),waiting=new Promise(resolve=>arrived=resolve);
 await context.route('**/assets/vision/astronaut.png',async route=>{arrived();await gate;await route.fulfill({contentType:'image/png',body:fs.readFileSync('assets/vision/astronaut.png')});});
 await page.goto(server.base+'/projects/');await ready(page);await settle(page);await page.locator('[data-instrument=vision]').click();await waiting;
 // Render the placeholder into real immutable GPU storage before any image arrives.
 await page.waitForFunction(()=>window.studio.world.model.instrumentLevels.vision===1);const placeholder=await page.evaluate(()=>{const w=window.studio.world;w.moving=1;w.frame(performance.now());window.firstPhoto=w.model.optical.photo;return[w.model.optical.photo.image.width,w.model.optical.photo.image.height];});
 release();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready');const loaded=await comparePixels(page);
 report.cases.push({viewport,placeholder,loaded,warnings});assert.ok(loaded.meanDifference<1&&loaded.bright>400,JSON.stringify({loaded,warnings}));assert.deepEqual(warnings,[]);
 await page.locator('.vision-run').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='done',null,{timeout:60000});if(viewport.width<700)await page.evaluate(()=>scrollTo(0,280));await page.screenshot({path:`${output}/vision-delayed-image-${viewport.width}.png`});
 await page.locator('[data-vision=blank]').click();const blank=await comparePixels(page);assert.ok(blank.meanDifference<1);await context.unroute('**/assets/vision/astronaut.png');await page.locator('[data-vision=sample]').click();await page.waitForFunction(()=>window.studio.route.vision.state.phase==='ready');const replaced=await comparePixels(page);assert.ok(replaced.meanDifference<1&&replaced.bright>400);assert.equal(await page.evaluate(()=>window.firstPhoto===window.studio.world.model.optical.photo),true);
 const crops=[];for(const [width,height] of [[320,512],[512,320]]){await page.evaluate(async([width,height])=>{const image=new Image();image.src='/assets/vision/astronaut.png';await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').drawImage(image,0,0);await window.studio.route.vision.loadFile(await new Promise(resolve=>canvas.toBlob(resolve)));},[width,height]);const pixels=await comparePixels(page);assert.ok(pixels.meanDifference<1&&pixels.bright>400,JSON.stringify(pixels));assert.ok(Math.abs(pixels.aspect-width/height)<1e-8);crops.push({width,height,...pixels});}
 assert.deepEqual(log.errors,[]);assert.deepEqual(log.failed,[]);report.cases.at(-1).blank=blank;report.cases.at(-1).replaced=replaced;report.cases.at(-1).crops=crops;await context.close();console.log(`PASS vision delayed GPU image ${viewport.width}`);
}}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{fs.writeFileSync(`${output}/vision-image-audit.json`,JSON.stringify(report,null,2));await browser.close();await server.close();}console.log(JSON.stringify(report));
