// Exercise public controls during measurement; never advance simulation clocks by hand.
export const experiments=[
  {id:'ocean',global:'oceanExperiment',hero:'[data-wind="1.6"]',action:'drive'},
  {id:'partext',global:'wordExperiment',hero:'[data-word-scatter]',action:'[data-word-scatter]'},
  {id:'moon',global:'moonExperiment',hero:'[data-moon-launch]'},
  {id:'fluid',global:'fluidExperiment',hero:'[data-fluid-drop]',action:'[data-fluid-drop]'},
  {id:'trails',global:'trailsExperiment',hero:'[data-trails-launch]'},
  {id:'galaxy',global:'galaxyExperiment',hero:'[data-galaxy-band="1"]',action:'[data-galaxy-push]'},
  {id:'glass',global:'glassExperiment',hero:'[data-glass-action="stamp"]',action:'lens'},
  {id:'breakout',global:'breakoutExperiment',hero:'[data-breakout-launch]'},
  {id:'bullet',global:'bulletExperiment',hero:'[data-bullet-launch]'}
];

export async function measure(surface,{global=null,action=null}={}){
  return surface.evaluate(async({global,action})=>{
    const experiment=global?window[global]:null,w=window.studio?.world;
    const renderer=experiment?.renderer||(!global?w?.renderer:null);
    const compact=value=>Object.fromEntries(Object.entries(value||{}).filter(([key,value])=>
      ['number','boolean','string'].includes(typeof value)&&!['epoch','serial'].includes(key)));
    const snapshot=()=>{
      const d=experiment?.diagnostics?.()||w?.diagnostics?.()||{};
      return {state:compact(d),model:compact(!global?w?.model?.diagnostics?.():null),
        memory:renderer?{...renderer.info.memory}:d.resources||null,
        render:renderer?{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),programs:renderer.info.programs.length}:null};
    };
    const before=snapshot(),frames=[],longTasks=[];let observer;
    if(PerformanceObserver.supportedEntryTypes.includes('longtask')){
      observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));
      observer.observe({type:'longtask'});
    }
    const canvas=renderer?.domElement||document.querySelector('canvas');
    const gl=canvas?.getContext('webgl2'),debug=gl?.getExtension('WEBGL_debug_renderer_info');
    const started=performance.now();let previous,lastAction=started,actions=0;
    if(action==='drive')dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',key:'w',bubbles:true}));
    try{
      await new Promise(resolve=>{
        const collect=now=>{
          const clock=performance.now();
          if(previous!==undefined)frames.push(now-previous);previous=now;
          if(action&&action!=='drive'&&clock-lastAction>=600){
            lastAction=clock;actions++;
            if(action==='lens'){
              const stage=experiment?.desk?.stage||document.querySelector('.world-hero'),b=stage.getBoundingClientRect();
              stage.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',
                clientX:b.x+b.width*(actions%2?.4:.65),clientY:b.y+b.height*.58}));
            }else document.querySelector(action)?.click();
          }
          if((clock-started<2400||frames.length<120)&&clock-started<12000)requestAnimationFrame(collect);else resolve();
        };requestAnimationFrame(collect);
      });
    }finally{if(action==='drive')dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',key:'w',bubbles:true}));}
    // Deliver the final observer batch without incorporating it into frame cadence.
    await new Promise(resolve=>setTimeout(resolve,0));observer?.disconnect();
    const sorted=[...frames].sort((a,b)=>a-b),elapsedMs=frames.reduce((sum,n)=>sum+n,0);
    return {durationMs:performance.now()-started,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)],maxMs:Math.max(...frames),
      over25Ms:frames.filter(n=>n>25).length,over50Ms:frames.filter(n=>n>50).length,frames:frames.length,elapsedMs,
      gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):null,longTasks,actions,before,after:snapshot()};
  },{global,action});
}
