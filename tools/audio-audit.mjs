import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {startServer,launchBrowser,output} from './browser-support.mjs';
import {MIXES} from '../js/experience/domain.js';

fs.mkdirSync(output,{recursive:true});
const server=await startServer();let browser;
const report={date:new Date().toISOString(),environment:{node:process.version,cpu:os.cpus()[0].model},scores:[],failures:[]};
try{
  browser=await launchBrowser();report.environment.browser=browser.version();
  const page=await browser.newPage();
  await page.route(server.base+'/audio-audit',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Original score audit</title>'}));
  await page.goto(server.base+'/audio-audit');
  for(const rate of [32000,24000]){
    const evidence=await page.evaluate(async({rate,mix})=>{
      const {renderScore,renderCue}=await import('/js/audio/synth.js');
      const {MASTER_GAIN}=await import('/js/audio/composition.js');
      const started=performance.now(),score=renderScore(rate),generationMs=performance.now()-started;
      const result={rate,duration:score.duration,musicalDuration:score.musicalDuration,generationMs,
        pcmBytes:score.stems.reduce((sum,stem)=>sum+stem.byteLength,0),renders:[]};
      for(const volume of [.45,1]){
        const context=new OfflineAudioContext(2,Math.round((score.musicalDuration+.1)*rate),rate);
        const master=context.createGain();master.gain.value=volume*MASTER_GAIN;
        const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=5;
        master.connect(limiter).connect(context.destination);
        score.stems.forEach((samples,i)=>{
          const buffer=context.createBuffer(1,samples.length,rate);buffer.getChannelData(0).set(samples);
          const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.playbackRate.value=score.duration/score.musicalDuration;
          const gain=context.createGain();gain.gain.value=mix[i];const pan=context.createStereoPanner();pan.pan.value=[-.28,0,.22,.04][i];
          source.connect(gain).connect(pan).connect(master);source.start();
        });
        for(const at of [2,2.03,2.06]){
          const samples=renderCue('reveal',rate,0),buffer=context.createBuffer(1,samples.length,rate);buffer.getChannelData(0).set(samples);
          const source=context.createBufferSource();source.buffer=buffer;source.connect(master);source.start(at);
        }
        for(const [i,kind]of ['brick0','brick1','brick2','brick3','brick4','paddle','miss'].entries()){
          const samples=renderCue(kind,rate,0),buffer=context.createBuffer(1,samples.length,rate);buffer.getChannelData(0).set(samples);
          const source=context.createBufferSource();source.buffer=buffer;source.connect(master);source.start(4+i*.065);
        }
        const rendered=await context.startRendering(),channels=[rendered.getChannelData(0),rendered.getChannelData(1)];
        let peak=0,power=0,clipped=0,finite=true;
        for(const channel of channels)for(const value of channel){finite&&=Number.isFinite(value);peak=Math.max(peak,Math.abs(value));power+=value*value;if(Math.abs(value)>=.999)clipped++;}
        const rms=Math.sqrt(power/(rendered.length*2)),parts=[];
        for(let section=0;section<4;section++){
          const start=Math.round(section*score.musicalDuration/4*rate),end=Math.round((section+1)*score.musicalDuration/4*rate);let sum=0;
          for(const channel of channels)for(let i=start;i<end;i++)sum+=channel[i]**2;
          parts.push(Math.sqrt(sum/((end-start)*2)));
        }
        result.renders.push({volume,peak,rms,rmsDb:20*Math.log10(rms),finite,clipped,movementRms:parts});
      }
      return result;
    },{rate,mix:MIXES.radio});
    for(const render of evidence.renders){assert.equal(render.finite,true);assert.equal(render.clipped,0);assert.ok(render.peak>0&&render.peak<1);
      assert.ok(render.movementRms[2]<render.movementRms[1],'breathing section remains audible and calmer after mastering');}
    report.scores.push(evidence);console.log(JSON.stringify(evidence));
  }
}catch(error){report.failures.push(error.stack);process.exitCode=1;}
finally{
  fs.writeFileSync(path.join(output,'audio-audit.json'),JSON.stringify(report,null,2));
  if(browser)await browser.close();await server.close();
}
console.log(JSON.stringify({scores:report.scores.length,failures:report.failures}));
