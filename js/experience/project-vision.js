import {BPM} from '../audio/composition.js';
import {nextBeatDelay} from './domain.js';

export function bindVision(main,{world,score,vision,signal,select,section}){
  const panel=document.createElement('div');panel.className='vision-panel';panel.hidden=panel.inert=true;
  panel.innerHTML='<p class="signal-caption">MTCNN / 人脸检测与五点定位</p><div class="vision-inputs" role="group" aria-label="选择检测照片"><button type="button" data-vision="sample">示例照片</button><label>本地照片<input type="file" accept="image/png,image/jpeg,image/webp" aria-label="选择本地照片"></label><button type="button" data-vision="blank">空白试片</button></div><p class="vision-source"></p><button class="vision-run" type="button">开始检测 ↗</button><p id="vision-status" role="status" aria-live="polite"></p><div class="vision-trace" aria-label="检测步骤"><span>01 / 金字塔</span><span>02 / 提议</span><span>03 / 复核</span><span>04 / 定位</span></div><p class="vision-help">照片仅在此设备处理。定位结果由原项目模型计算。</p><canvas class="vision-preview" width="512" height="512" role="img" aria-label="检测照片与实际人脸框"></canvas><div class="signal-links"><a class="vision-repository" target="_blank" rel="noopener">原项目源码 ↗</a><a href="/blog/39544.html#content">实现笔记 ↗</a></div>';
  panel.querySelector('.vision-repository').href=main.querySelector('#face-recognition-api a').href;
  const run=panel.querySelector('.vision-run'),status=panel.querySelector('#vision-status'),file=panel.querySelector('input'),source=panel.querySelector('.vision-source'),preview=panel.querySelector('canvas'),trace=[...panel.querySelectorAll('.vision-trace span')];
  const timing=()=>{const reduced=!world||world.reduced.matches;return{now:performance.now()/1000,delay:score.audible&&!reduced?nextBeatDelay(score.time,1):0,beat:60/BPM,reduced};};
  let sourceStamp=-1,paintStamp='',lastPhase='';
  function render(state){
    run.disabled=!state.image||state.phase==='image-loading';run.textContent=state.busy?'停止检测':state.report?'重新检测 ↗':'开始检测 ↗';
    file.disabled=state.busy;panel.querySelectorAll('[data-vision]').forEach(button=>button.disabled=state.busy);
    if(sourceStamp!==state.imageRevision){sourceStamp=state.imageRevision;source.replaceChildren();if(state.source){const label=document.createElement(state.source.url?'a':'span');label.textContent=state.source.label;if(state.source.url){label.href=state.source.url;label.target='_blank';label.rel='noopener';}source.append(label);}}
    const counts=state.report?.stages.map(stage=>stage.boxes.length)||[];
    status.textContent=state.error||({empty:'选一张照片，让光学台开始工作。','image-loading':'照片正在进入工作台…',ready:'按下开始，观察候选区域怎样被逐层筛选。',loading:'正在准备检测模型…',scanning:`扫描图像金字塔 ${state.scan?.completed||0} / ${state.scan?.total||0}`,rnet:'复核候选区域…',onet:'计算人脸框与五个关键点…',playing:[`展开 ${state.report?.scales.length||0} 层图像金字塔`,`${counts[0]} 个候选框，来自 P-Net`,`${counts[0]} → ${counts[1]}，R-Net 复核`,`${counts[1]} → ${counts[2]}，O-Net 定位`][state.stage],done:counts[2]?`找到 ${counts[2]} 个人脸区域，每个区域有五个关键点。`:state.source?.id==='blank'?'空白试片：未找到人脸区域。':'未找到人脸区域，可以换一张更清晰的正面照片。',cancelled:'演示已停止；可以重新检测。'})[state.phase]||'';
    trace.forEach((item,i)=>{item.dataset.active=String(state.report&&i<=state.stage);});
    const phase=state.phase+':'+state.stage+':'+state.serial;
    if(lastPhase!==phase&&state.phase==='playing'&&state.stage>0&&!panel.hidden){score.cue('hover');world?.actor.react();}lastPhase=phase;
    const stamp=state.imageRevision+':'+state.serial+':'+state.phase;
    if(stamp!==paintStamp&&state.image){paintStamp=stamp;const ctx=preview.getContext('2d');preview.width=state.image.width;preview.height=state.image.height;ctx.drawImage(state.image,0,0);ctx.lineWidth=2;ctx.strokeStyle='#10a383';ctx.fillStyle='#ffc970';
      if(state.report&&state.phase==='done')for(const {box,marks} of state.report.stages[2].boxes){ctx.strokeRect(box[0],box[1],box[2]-box[0],box[3]-box[1]);for(let i=0;i<10;i+=2){ctx.beginPath();ctx.arc(marks[i],marks[i+1],3,0,Math.PI*2);ctx.fill();}}
    }
    if(world)world.moving=1;
  }
  const unsubscribe=vision.subscribe(render);render(vision.state);
  panel.querySelector('[data-vision=sample]').addEventListener('click',()=>vision.loadSample(),{signal});panel.querySelector('[data-vision=blank]').addEventListener('click',()=>vision.blank(),{signal});
  file.addEventListener('change',async()=>{const chosen=file.files[0];if(chosen)await vision.loadFile(chosen);file.value='';},{signal});
  run.addEventListener('click',()=>{if(vision.state.busy)vision.cancel();else if(vision.run(timing))score.cue('hover');},{signal});
  const entry=document.createElement('button');entry.type='button';entry.className='compiler-entry vision-entry';entry.textContent='在视觉工作台试一试 ↗';main.querySelector('#face-recognition-api').append(entry);
  entry.addEventListener('click',()=>{select();panel.querySelector('[data-vision=sample]').focus({preventScroll:true});section.scrollIntoView({behavior:world?.reduced.matches?'instant':'smooth'});},{signal});
  signal.addEventListener('abort',()=>{unsubscribe();if(!world)vision.dispose();},{once:true});
  return{panel,activate(){if(!vision.state.image)vision.loadSample();}};
}
