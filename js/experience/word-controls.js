import {WORDS,cleanWords} from '../world/glyph-cloud.js';
export function wordControls({onText,onScatter,signal}){
 const element=document.createElement('form');element.className='word-controls';element.innerHTML='<label>给粒子一句话 <span>最多 12 个字</span><span class="word-entry"><input name="word-text" aria-label="粒子文字内容" autocomplete="off" value="eli3xir"><button type="submit">排字 ↗</button></span></label><div class="word-actions"><button type="button" data-word-next>换一句</button><button type="button" data-word-scatter>打散再聚合</button></div><p class="word-status" role="status"></p>';
 const input=element.querySelector('input'),status=element.querySelector('.word-status');let selected=WORDS[0],composing=false;
 const setText=text=>{selected=text;input.value=text;status.textContent=`「${text}」· 每个光点，都有自己的位置。`;};
 const submit=value=>{const text=cleanWords(value);if(!text){status.textContent='先写下几个字，再让它们动起来。';return;}if(onText(text)===false){status.textContent='这句话暂时无法排成粒子，请换几个字。';return;}setText(text);};
 input.addEventListener('compositionstart',()=>{composing=true;},{signal});input.addEventListener('compositionend',()=>{composing=false;},{signal});
 element.addEventListener('submit',event=>{event.preventDefault();if(!composing)submit(input.value);},{signal});
 element.querySelector('[data-word-next]').addEventListener('click',()=>submit(WORDS[(WORDS.indexOf(selected)+1)%WORDS.length]),{signal});
 element.querySelector('[data-word-scatter]').addEventListener('click',()=>onScatter(),{signal});setText(selected);
 return{element,input,setText,get text(){return selected;}};
}
