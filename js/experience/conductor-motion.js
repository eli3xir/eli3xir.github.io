import {BPM} from '../audio/composition.js';

const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const keys=['presence','pitch','yaw','tilt','lift','leftX','leftZ','rightX','rightZ','foot','antenna'];

// Audio sets the gesture; UI time lets its momentum settle after playback stops.
export function createConductorMotion(){
  const values=Object.fromEntries(keys.map(key=>[key,0])),velocities={...values};
  const pose={...values,arms:[[0,0,0],[0,0,0]],mode:'rest',strength:0};
  let last=null,quietSince=null;
  function advance(state,now,reduced=false){
    const dt=last===null?0:Math.max(0,Math.min(.06,now-last));last=now;
    const active=Boolean(state.active),enabled=state.stems?.some(Boolean)??true;
    const sounding=active&&enabled&&(state.volume??1)>0;
    if(active&&!sounding){quietSince??=now;}else quietSince=null;
    const listening=quietSince!==null&&now-quietSince>.35;
    const [pad,bass,lead,drum]=[0,1,2,3].map(i=>clamp(state.levels?.[i]));
    const strength=clamp(pad*.18+bass*.25+lead*.35+drum*.55);
    // Anticipate the short spring response so the downstroke reads on the beat.
    const phase=((Number.isFinite(state.time)?state.time:0)+.045)*BPM/60*Math.PI*2;
    const stroke=Math.cos(phase),sweep=Math.sin(phase/2),drive=sounding?.22+strength*.78:0;
    const target={presence:active?1:0,pitch:sounding?Math.sin(phase)*bass*.14:0,
      yaw:listening?.38:sounding?-.12+sweep*lead*.16:0,
      tilt:listening?.28:sounding?sweep*(.04+pad*.06):0,
      lift:sounding?(1-stroke)*bass*.014:listening?.014:0,
      leftX:sounding?Math.sin(phase/2+.8)*lead*.45:listening?-.5:0,
      leftZ:sounding?-(.25+(1+sweep)*(.13+lead*.38))*drive:listening?-.92:0,
      rightX:sounding?Math.sin(phase)*(.22+drum*.4)*drive:listening?-.35:0,
      rightZ:sounding?(.55-stroke*.85)*drive:listening?.75:0,
      foot:sounding?Math.sin(phase)*bass*.28:0,antenna:listening?-.14:sounding?-Math.sin(phase)*drum*.1:0};
    for(const key of keys){
      if(reduced){values[key]=velocities[key]=0;continue;}
      const frequency=key==='presence'?12:key==='leftX'||key==='leftZ'?18:30;
      const offset=values[key]-target[key],c=velocities[key]+frequency*offset,decay=Math.exp(-frequency*dt);
      values[key]=target[key]+(offset+c*dt)*decay;velocities[key]=(velocities[key]-frequency*c*dt)*decay;
    }
    Object.assign(pose,values);pose.arms[0][0]=values.leftX;pose.arms[0][2]=values.leftZ;
    pose.arms[1][0]=values.rightX;pose.arms[1][2]=values.rightZ;
    pose.mode=reduced?'rest':listening?'listening':sounding?'conducting':'rest';pose.strength=reduced?0:strength;
    return pose;
  }
  return{pose,advance};
}
