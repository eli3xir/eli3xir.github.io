const PHASES=['sending','relay','delivering'];
export function createMessageRelay(){
  const listeners=new Set();
  const state={sender:0,message:'',serial:0,phase:'idle',progress:0,busy:false,clients:['','','']};
  let flight=null;
  const notify=()=>listeners.forEach(listener=>listener(state));
  return{state,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    select(sender){if(state.busy||!Number.isInteger(sender)||sender<0||sender>2)return false;state.sender=sender;notify();return true;},
    send(message,{now,delay=0,duration=2,reduced=false}){
      const text=Array.from(String(message).replace(/[\u0000-\u001f\u007f]/g,' ').trim()).slice(0,32).join('');
      if(state.busy||!text)return false;
      state.message=text;state.serial++;state.busy=true;state.progress=0;state.phase='sending';
      state.clients[state.sender]=text;flight={start:now+delay,duration};notify();
      if(reduced)this.advance(now,true);return true;
    },
    advance(now,reduced=false){
      if(!flight)return;
      state.progress=reduced?1:Math.max(0,Math.min(1,(now-flight.start)/flight.duration));
      const phase=state.progress<.3?PHASES[0]:state.progress<.46?PHASES[1]:state.progress<1?PHASES[2]:'delivered';
      if(state.progress===1){state.clients.fill(state.message);state.busy=false;flight=null;}
      if(phase!==state.phase){state.phase=phase;notify();}
    },
    dispose(){flight=null;listeners.clear();}
  };
}
