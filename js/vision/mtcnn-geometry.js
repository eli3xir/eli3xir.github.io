export const MAX_CANDIDATES=6000;
export function imageScales(width,height){
  let factor=1;
  if(Math.min(width,height)>500)factor=500/Math.min(width,height);else if(Math.max(width,height)<500)factor=500/Math.max(width,height);
  const result=[];let min=Math.min(Math.trunc(width*factor),Math.trunc(height*factor));
  for(let i=0;min>=12;i++,min*=.709){const scale=factor*.709**i;result.push({scale,width:Math.trunc(width*scale),height:Math.trunc(height*scale)});}
  return result;
}
function square(box){const w=box[2]-box[0],h=box[3]-box[1],side=Math.max(w,h);box[0]+=(w-side)*.5;box[1]+=(h-side)*.5;box[2]=box[0]+side;box[3]=box[1]+side;return box;}
function clip(box,width,height){for(const i of [0,2])box[i]=Math.max(0,Math.min(width,box[i]));for(const i of [1,3])box[i]=Math.max(0,Math.min(height,box[i]));return box;}
export function validCrop({box}){return box.every(Number.isFinite)&&Math.trunc(box[2])>Math.trunc(box[0])&&Math.trunc(box[3])>Math.trunc(box[1]);}
export function suppress(rectangles,threshold){
  const sorted=[...rectangles].sort((a,b)=>a.box[4]-b.box[4]||a.id-b.id),result=[];
  while(sorted.length){
    const selected=sorted.pop();result.push(selected);const a=selected.box,area=(a[2]-a[0]+1)*(a[3]-a[1]+1);
    for(let i=sorted.length-1;i>=0;i--){
      const b=sorted[i].box,w=Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0])+1),h=Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1])+1),intersection=w*h;
      if(intersection/(area+(b[2]-b[0]+1)*(b[3]-b[1]+1)-intersection)>threshold)sorted.splice(i,1);
    }
  }
  return result;
}
export function proposals(prob,roi,shape,scale,width,height,offset=0,scaleIndex=0){
  const rows=shape[1],cols=shape[2],side=Math.max(rows,cols),stride=side===1?0:(2*side-1)/(side-1),result=[];
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
    const index=y*cols+x,score=prob[index*2+1];if(score<.5)continue;
    const box=[Math.trunc(stride*x),Math.trunc(stride*y),Math.trunc(stride*x+11),Math.trunc(stride*y+11)].map((value,i)=>(value+roi[index*4+i]*12)/scale);
    box.push(score);result.push({id:offset+result.length,scaleIndex,box:clip(square(box),width,height)});
    if(offset+result.length>MAX_CANDIDATES)throw new Error('候选区域过多，请换一张更清晰、人数更少的照片。');
  }
  return result;
}
export function refine(rectangles,prob,roi,points,width,height,threshold){
  const result=[];
  rectangles.forEach((source,index)=>{
    const score=prob[index*2+1];if(score<threshold)return;
    const original=source.box,w=original[2]-original[0],h=original[3]-original[1];
    // The original implementation uses width for BOTH box-regression axes.
    const box=original.slice(0,4).map((value,i)=>value+roi[index*4+i]*w),marks=[];box.push(score);
    if(points){for(let i=0;i<5;i++)marks.push(original[0]+w*points[index*10+i],original[1]+h*points[index*10+i+5]);}else square(box);
    result.push({...source,box:clip(box,width,height),...(points?{marks}:{})});
  });
  return result;
}
