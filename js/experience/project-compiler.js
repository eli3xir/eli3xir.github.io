import {BPM} from '../audio/composition.js';
import {nextBeatDelay} from './domain.js';
import {COMPILER_EXAMPLE} from './compiler-expression.js';

export function bindCompiler(section,main,{world,score,compiler,signal}){
  const copy=section.querySelector('.hero-copy'),relayPanel=copy.querySelector('.signal-panel');
  const tools=document.createElement('div');tools.className='project-workbench';
  tools.innerHTML='<div class="project-instruments" role="group" aria-label="选择项目工作台"><button type="button" data-instrument="signal" aria-pressed="true">01 / 消息回路</button><button type="button" data-instrument="compiler" aria-pressed="false">03 / 语法工作台</button></div><div class="project-panels"></div>';
  copy.append(tools);const panels=tools.querySelector('.project-panels');panels.append(relayPanel);
  const panel=document.createElement('div');panel.className='compiler-panel';panel.hidden=true;panel.inert=true;
  panel.innerHTML='<p class="signal-caption">Pascal-S / 整数表达式演示</p><form class="compiler-form"><label for="compiler-source">把一个念头写成算式</label><div><input id="compiler-source" name="source" autocomplete="off" spellcheck="false" maxlength="64" aria-describedby="compiler-help compiler-status"><button type="submit">运行 ↗</button></div></form><p id="compiler-help" class="compiler-help">变量 := 整数算式;　支持 + − * 和括号。<br>浏览器内解析与求值；原项目使用 lex / yacc / LLVM。</p><div class="compiler-examples" role="group" aria-label="表达式示例"><button type="button" data-source="x := 2 + 3 * 4;">先乘后加</button><button type="button" data-source="x := (2 + 3) * 4;">加一对括号</button></div><p id="compiler-status" role="status" aria-live="polite"></p><div class="compiler-trace" aria-label="本次求值顺序"></div><div class="signal-links"><a class="compiler-repository" target="_blank" rel="noopener">原项目源码 ↗</a><a href="#pascal-s-compiler">项目介绍 ↓</a></div>';
  panels.append(panel);panel.querySelector('.compiler-repository').href=main.querySelector('#pascal-s-compiler a').href;
  const input=panel.querySelector('input'),run=panel.querySelector('[type="submit"]'),status=panel.querySelector('#compiler-status'),trace=panel.querySelector('.compiler-trace');input.value=COMPILER_EXAMPLE;
  const timing=()=>({now:performance.now()/1000,delay:score.audible&&!world?.reduced.matches?nextBeatDelay(score.time,1):0,reduced:!world||world.reduced.matches});
  let instrument='signal',lastSerial=0,lastPhase='',lastStep=-1;
  const select=id=>{
    if(id===instrument)return;instrument=id;const options=timing();
    for(const button of tools.querySelectorAll('[data-instrument]'))button.setAttribute('aria-pressed',String(button.dataset.instrument===id));
    relayPanel.hidden=relayPanel.inert=id!=='signal';panel.hidden=panel.inert=id!=='compiler';
    world?.model.setInstrument(id,{...options,duration:120/BPM});if(world)world.moving=1;score.cue('hover',options.delay);
  };
  tools.querySelectorAll('[data-instrument]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.instrument),{signal}));
  const render=state=>{
    run.disabled=state.busy;run.textContent=state.busy?'推演中…':'运行 ↗';
    panel.querySelectorAll('[data-source]').forEach(button=>button.disabled=state.busy);
    input.readOnly=state.busy;input.setAttribute('aria-invalid',String(Boolean(state.error)));
    if(state.error){status.textContent=`第 ${state.error.column} 列：${state.error.message}`;trace.replaceChildren();return;}
    const program=state.program;
    if(state.serial!==lastSerial){lastSerial=state.serial;trace.replaceChildren();for(const step of program.steps){const item=document.createElement('span');item.textContent=step.text;trace.append(item);}}
    const completed=state.phase==='done'?program.steps.length:Math.max(0,state.step);
    [...trace.children].forEach((item,i)=>{item.dataset.state=i<completed?'done':i===state.step&&state.busy?'active':'waiting';item.textContent=i<completed?program.steps[i].text:`${String(i+1).padStart(2,'0')} / ${program.nodes[program.steps[i].id].label}`;});
    const active=program.steps[state.step];
    status.textContent=state.phase==='ready'?'试着加一对括号，看看树怎样改变。':state.phase==='assembling'?'符号正在组成树；括号决定分支，不成为节点。':state.phase==='evaluating'?`第 ${state.step+1} 步 / ${active.text.split(' = ')[0].split(' ← ')[0]} → …`:`${program.target} = ${program.result} · ${program.steps.length} 步，思路接通。`;
    if(state.phase!==lastPhase||state.step!==lastStep){
      if(instrument==='compiler'&&state.serial&&['evaluating','done'].includes(state.phase)){score.cue('hover');if(state.phase==='done')world?.actor.react();}
      lastPhase=state.phase;lastStep=state.step;
    }
  };
  const unsubscribe=compiler.subscribe(render);render(compiler.state);
  const execute=()=>{
    const options=timing(),started=compiler.run(input.value,{...options,beat:60/BPM});
    if(started){score.cue('hover',options.delay);if(world)world.moving=1;}
    else if(compiler.state.error){input.focus();const at=compiler.state.error.column-1;input.setSelectionRange(at,Math.min(at+1,input.value.length));}
  };
  panel.querySelector('form').addEventListener('submit',event=>{event.preventDefault();execute();},{signal});
  panel.querySelectorAll('[data-source]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.source;execute();},{signal}));
  const entry=document.createElement('button');entry.type='button';entry.className='compiler-entry';entry.textContent='在语法工作台试一试 ↗';main.querySelector('#pascal-s-compiler').append(entry);
  entry.addEventListener('click',()=>{select('compiler');input.focus({preventScroll:true});section.scrollIntoView({behavior:world?.reduced.matches?'instant':'smooth'});},{signal});
  signal.addEventListener('abort',()=>{unsubscribe();if(!world)compiler.dispose();},{once:true});
}
