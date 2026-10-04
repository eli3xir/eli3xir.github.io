import * as THREE from 'three';

// The canvas follows the physical page ratio, so type keeps its proportions.
export function bookPage({title='A curious mind.',kicker='FIELD NOTES / ELI3XIR',date='',tags='',number='01',excerpt=''}={}) {
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1062;
  const ctx=canvas.getContext('2d'),left=64,width=640;
  ctx.fillStyle='#e7d7b4';ctx.fillRect(0,0,768,1062);
  for(let i=0;i<2800;i++){
    ctx.fillStyle=i%2?'#5a4a3010':'#fff3d918';ctx.fillRect((i*127.61)%768,(i*319.73)%1062,1.2,2);
  }
  ctx.fillStyle='#535a48';ctx.font='18px monospace';ctx.fillText(kicker,left,76);
  ctx.strokeStyle='#8c866d';ctx.beginPath();ctx.moveTo(left,106);ctx.lineTo(left+width,106);ctx.stroke();
  ctx.fillStyle='#a0834e';ctx.font='italic 78px Georgia,serif';ctx.fillText(number,left,214);
  ctx.fillStyle='#29352d';ctx.font='68px Georgia,"Microsoft YaHei",serif';
  const lines=[];let line='';
  for(const character of Array.from(title)){
    if(ctx.measureText(line+character).width>width&&line){lines.push(line.trim());line=character;}
    else line+=character;
  }
  if(line)lines.push(line.trim());
  if(lines.length>4){let last=lines[3];while(ctx.measureText(last+'…').width>width)last=last.slice(0,-1);lines[3]=last+'…';}
  let y=307;for(const line of lines.slice(0,4)){ctx.fillText(line,left,y);y+=84;}
  ctx.font='18px monospace';ctx.fillStyle='#676952';
  if(date)ctx.fillText(date,left,y+20);
  if(tags){ctx.font='20px "Microsoft YaHei",sans-serif';ctx.fillText(tags,left,y+60,width);}
  const baseline=Math.max(640,y+115);ctx.strokeStyle='#a8a08a';
  if(excerpt){
    ctx.font='27px "PingFang SC","Microsoft YaHei",sans-serif';ctx.fillStyle='#525746';let row='',y=baseline;
    for(const character of Array.from(excerpt)){
      if(ctx.measureText(row+character).width>width){ctx.fillText(row,left,y);y+=43;row=character;if(y>915){row='…';break;}}
      else row+=character;
    }
    if(row&&y<=958)ctx.fillText(row,left,y);
  }else for(let row=0;row<7&&baseline+row*29<930;row++){
    ctx.beginPath();ctx.moveTo(left,baseline+row*29);ctx.lineTo(left+width*(row===6?.67:1),baseline+row*29);ctx.stroke();
  }
  canvas.dataset.title=title;canvas.dataset.excerpt=excerpt;
  ctx.fillStyle='#74715e';ctx.font='16px monospace';ctx.fillText('KEEP WONDERING.',left,998);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}
