// A deterministic illustrative galaxy, not a catalogue or an N-body simulation.
export const GALAXY_RADIUS=2.1;
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{const t=clamp(x);return t*t*(3-2*t);};
function hash(x,y){let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;}
function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=smooth(x-a),v=smooth(y-b);return(1-v)*(hash(a,b)*(1-u)+hash(a+1,b)*u)+v*(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u);}
function cloud(x,y){return noise(x,y)*.55+noise(x*2.03+7,y*2.03-9)*.28+noise(x*4.11-3,y*4.11+2)*.12+noise(x*8.2,y*8.2)*.05;}
export const armAngle=r=>1.7*Math.log(r+.17);
export function galaxyDensity(x,z){
 const r=Math.hypot(x,z),edge=1-smooth((r-.76)/.24);if(!edge)return[0,0,0];
 const theta=Math.atan2(z,x),n=cloud(x*18+20,z*18+30),fine=noise(x*95+20,z*95+30);
 const phase=(theta-armAngle(r))*4+(n-.5)*1.6;
 const arm=Math.exp(-Math.pow(Math.sin(phase*.5)/.29,2)),lane=Math.exp(-Math.pow(Math.sin((phase+.33)*.5)/.18,2));
 const strength=.52+.48*Math.cos(theta-armAngle(r))**2;
 const disk=Math.exp(-2.5*r)*(.24+arm*.66*strength)*edge;
 const dust=lane*smooth((r-.07)/.18)*(.1+n*n*1.2)*edge*(.4+fine*.8)*strength;
 const knots=arm*Math.pow(Math.max(0,(n-.47)*3.5),2)*smooth((r-.15)/.18)*edge;
 return[clamp(dust),clamp(disk),clamp(knots)];
}
export function galaxyData(count=60000,size=512){
 let seed=48271;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return(seed+.5)/4294967296;};
 const normal=()=>Math.sqrt(-2*Math.log(random()))*Math.cos(2*Math.PI*random());
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3),detail=new Float32Array(count*2),density=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const d=galaxyDensity((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;density[i]=Math.round(d[0]*255);density[i+1]=Math.round(d[1]*255);density[i+2]=Math.round(d[2]*255);density[i+3]=255;}
 for(let i=0;i<count;i++){
  const bulge=i<count*.22,young=i>=count*.78;let x,y,z,r;
  if(bulge){x=Math.max(-.5,Math.min(.5,normal()*.12));z=Math.max(-.5,Math.min(.5,normal()*.12));y=Math.max(-.18,Math.min(.18,normal()*.065));r=Math.hypot(x,z);}
  else{do{r=-Math.log(random()*random())*.185;}while(r>.98);const a=young?(i%4)*Math.PI*.5+armAngle(r)+normal()*(.1+.045/(r+.18)):random()*Math.PI*2;x=Math.cos(a)*r;z=Math.sin(a)*r;y=normal()*(.011+r*.012)*(young?.5:1);}
  positions.set([x*GALAXY_RADIUS,y*GALAXY_RADIUS,z*GALAXY_RADIUS],i*3);
  const warm=bulge||random()>.38+r*.35,brightness=.36+random()*.60;
  colors.set((warm?[1,.66,.34]:[.36,.59,1]).map(v=>v*brightness),i*3);
  detail.set([i%379===0?2.2:.5+random()*.65,bulge?0:young?1:clamp(r)],i*2);
 }
 return{positions,colors,detail,density,size,count};
}
