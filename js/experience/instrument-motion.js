const IDS=['signal','compiler','vision'];

// A finite, bounded trajectory. On reversal, brake before changing direction;
// otherwise a Hermite curve with inherited velocity can leave the shaft limits.
function trajectory(value,velocity,target,start,duration){
  const segments=[];
  if(velocity*(target-value)<0){
    const room=velocity>0?1-value:value;
    const time=Math.min(duration*.2,1.8*room/Math.abs(velocity));
    if(time>0){segments.push({value,velocity,start,duration:time,brake:true});value+=velocity*time/2;start+=time;duration-=time;}
    velocity=0;
  }
  if(velocity&&target!==value)duration=Math.min(duration,2.9*Math.abs((target-value)/velocity));
  segments.push({value,velocity,target,start,duration});
  return now=>{
    for(const s of segments){
      if(now<s.start)return{value:s.value,velocity:s.velocity};
      if(now>=s.start+s.duration)continue;
      const p=(now-s.start)/s.duration;
      if(s.brake)return{value:s.value+s.velocity*s.duration*(p-p*p/2),velocity:s.velocity*(1-p)};
      const delta=s.target-s.value,tangent=s.velocity*s.duration;
      return{value:s.value+delta*p*p*(3-2*p)+tangent*p*(1-p)**2,
        velocity:(6*delta*p*(1-p)+tangent*(1-4*p+3*p*p))/s.duration};
    }
    return{value:target,velocity:0};
  };
}

export function createInstrumentMotion(){
  let selected='signal',commands=[];
  const levels={signal:1,compiler:0,vision:0};
  // Public levels change only on advance(), never synchronously inside a click.
  let tracks=Object.fromEntries(IDS.map(id=>{const value=Number(id==='signal');return[id,()=>({value,velocity:0})];}));
  function plan({id,start,duration}){
    const pose=Object.fromEntries(IDS.map(key=>[key,tracks[key](start)]));
    const outgoing=IDS.find(key=>key!==id&&pose[key].value>0);
    tracks=Object.fromEntries(IDS.map(key=>[key,()=>({value:0,velocity:0})]));
    if(outgoing){
      const p=pose[outgoing];tracks[outgoing]=trajectory(p.value,p.velocity,0,start,duration*.46);
      tracks[id]=trajectory(0,0,1,start+duration*.52,duration*.48);
    }else{
      const p=pose[id];tracks[id]=trajectory(p.value,p.velocity,1,start,duration);
    }
  }
  return{
    levels,
    get selected(){return selected;},
    select(id,{now,delay=0,duration=.8,reduced=false}){
      if(!IDS.includes(id)||id===selected)return;
      selected=id;
      // A newer choice replaces future commands, while an already due choice
      // is sampled at its exact boundary even if the next RAF arrives late.
      commands=commands.filter(command=>command.start<=now);
      commands.push({id,start:now+(reduced?0:delay),duration:reduced?0:duration});
    },
    advance(now,reduced=false){
      if(reduced){commands=[];tracks=Object.fromEntries(IDS.map(id=>{const value=Number(id===selected);return[id,()=>({value,velocity:0})];}));}
      while(commands.length&&commands[0].start<=now)plan(commands.shift());
      for(const id of IDS)levels[id]=tracks[id](now).value;
      return levels;
    },
    velocities(now){return Object.fromEntries(IDS.map(id=>[id,tracks[id](now).velocity]));}
  };
}
