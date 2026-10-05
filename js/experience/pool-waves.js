// A small damped height field. Fixed substeps keep wave propagation independent
// of display refresh; only moving, submerged palms add energy.
export function createPoolWaves(width=65,height=43){
 const count=width*height,heights=new Float32Array(count),velocity=new Float32Array(count),next=new Float32Array(count),pixels=new Float32Array(count*4);
 const dx=1/(width-1),dz=.66/(height-1),step=1/120,speed2=.34**2,damping=Math.exp(-2.4*step);
 let last=null,remainder=0,previous=null,energy=0,peak=0,injections=0,revision=0,sources=[];
 function clear(){heights.fill(0);velocity.fill(0);pixels.fill(0);energy=peak=remainder=0;previous=null;revision++;}
 function force(point,amount){
  const [x,y,z]=point;
  if(x<-.48||x>.48||z<-.31||z>.31||y>.025||y<-.19||amount<=0)return;
  const radius=.052,cx=(x+.5)/dx,cz=(z+.33)/dz,rx=Math.ceil(radius*2.5/dx),rz=Math.ceil(radius*2.5/dz);
  let sum=0;
  for(let j=Math.max(0,Math.floor(cz)-rz);j<=Math.min(height-1,Math.ceil(cz)+rz);j++)for(let i=Math.max(0,Math.floor(cx)-rx);i<=Math.min(width-1,Math.ceil(cx)+rx);i++){
   const r2=(((i-cx)*dx)**2+((j-cz)*dz)**2)/(radius*radius),v=(1-r2*.5)*Math.exp(-r2*.5)*amount;
   velocity[j*width+i]+=v;sum+=v;
  }
  // The paddle displaces water locally without raising the entire pool.
  const mean=sum/count;for(let i=0;i<count;i++)velocity[i]-=mean;
  injections++;sources.push({point:point.slice(),amount});
 }
 function tick(){
  for(let z=0;z<height;z++)for(let x=0;x<width;x++){
   const i=z*width+x,h=heights[i],left=heights[x?i-1:i],right=heights[x<width-1?i+1:i],up=heights[z?i-width:i],down=heights[z<height-1?i+width:i];
   velocity[i]=(velocity[i]+speed2*step*((left+right-2*h)/(dx*dx)+(up+down-2*h)/(dz*dz)))*damping;
   next[i]=h+velocity[i]*step;
  }
  heights.set(next);
 }
 function pack(){
  energy=peak=0;
  for(let z=0;z<height;z++)for(let x=0;x<width;x++){
   const i=z*width+x,h=heights[i],left=heights[x?i-1:i],right=heights[x<width-1?i+1:i],up=heights[z?i-width:i],down=heights[z<height-1?i+width:i];
   pixels[i*4]=h;pixels[i*4+1]=(right-left)/(2*dx);pixels[i*4+2]=(down-up)/(2*dz);pixels[i*4+3]=(left+right-2*h)/(dx*dx)+(up+down-2*h)/(dz*dz);
   peak=Math.max(peak,Math.abs(h));energy+=h*h+velocity[i]*velocity[i]*.01;
  }
  energy/=count;if(energy<1e-13){heights.fill(0);velocity.fill(0);pixels.fill(0);energy=peak=0;}revision++;
 }
 return{width,height,pixels,heights,get revision(){return revision;},
  advance(time,hands=[],strength=0,reduced=false){
   sources=[];
   if(reduced){if(energy||previous)clear();last=time;return;}
   if(last===null||time<last){last=time;previous=hands.map(p=>p.slice());remainder=0;return;}
   const dt=time-last;last=time;if(dt===0)return;
   if(dt>.2){
    // Hidden tabs and debugger jumps never draw a stroke across missing time.
    const decay=Math.exp(-dt*1.2);for(let i=0;i<count;i++){heights[i]*=decay;velocity[i]*=decay;}
    remainder=0;previous=hands.map(p=>p.slice());pack();return;
   }
   const start=previous||hands;let elapsed=step-remainder;remainder+=dt;
   while(remainder+1e-10>=step){
    for(let h=0;h<hands.length;h++)if(start[h]&&strength>.01){
     const from=start[h],to=hands[h],travel=Math.hypot(...to.map((v,i)=>v-from[i])),a=Math.min(1,elapsed/dt),point=to.map((v,i)=>from[i]+(v-from[i])*a);
     force(point,Math.min(1.2,travel/dt)*strength*1.1*step);
    }
    if(energy||sources.length)tick();remainder-=step;elapsed+=step;
   }
   previous=hands.map(p=>p.slice());if(energy||sources.length)pack();
  },
  clear,
  diagnostics(){return{energy,peak,injections,revision,sources:sources.map(source=>({...source,point:source.point.slice()})),width,height};}
 };
}
