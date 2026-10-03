(function(){
  if(!new URLSearchParams(location.search).has('embedded'))return;
  document.documentElement.classList.add('embedded-experiment');
  const start=()=>{
    document.documentElement.classList.add('experiment-playing');
    document.querySelectorAll('svg').forEach(svg=>svg.unpauseAnimations?.());
    document.querySelectorAll('script[type="application/x-lab"]').forEach(original=>{
      const script=document.createElement('script');script.src=original.dataset.src;
      if(original.dataset.module==='true')script.type='module';document.body.append(script);
    });
  };
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.querySelectorAll('svg').forEach(svg=>svg.pauseAnimations?.());
    const gate=document.createElement('div');gate.className='experiment-gate';
    gate.innerHTML='<p>这个实验会动起来。<br>准备好了，再开始。</p><button type="button">开始实验 ↗</button>';
    gate.querySelector('button').addEventListener('click',()=>{gate.remove();start();},{once:true});document.body.append(gate);
  }else start();
  document.querySelectorAll('a[href]').forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();parent.postMessage({type:'lab-navigate',path:new URL(link.href).pathname},location.origin);
  }));
  addEventListener('pointerdown',()=>parent.postMessage({type:'lab-interact'},location.origin),{passive:true});
  const stat=document.querySelector('#stat');
  if(stat)new MutationObserver(()=>{if(/成功|着陆完成|软着陆|已着陆/.test(stat.textContent))parent.postMessage({type:'lab-reveal'},location.origin);}).observe(stat,{childList:true,subtree:true,characterData:true});
})();
