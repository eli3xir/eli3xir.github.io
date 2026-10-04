import * as THREE from 'three';
import {GLASS_INKS} from './glass-state.js';
export function createGlassPaper(){
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=850;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;let previous='';
 function draw(s){const key=[s.stampCount,s.ink,s.count].join(':');if(key===previous)return;previous=key;const ink=GLASS_INKS[s.ink];ctx.fillStyle='#ece2cb';ctx.fillRect(0,0,1200,850);ctx.lineWidth=1;ctx.strokeStyle='#526f6d1c';for(let x=36;x<1200;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,850);ctx.stroke();}for(let y=18;y<850;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1200,y);ctx.stroke();}
  ctx.fillStyle='#526b64';ctx.font='22px monospace';ctx.fillText('FIELD NOTES     /     ELI3XIR',72,74);ctx.fillText('NO. 07',1010,74);ctx.fillStyle='#253b36';ctx.font='italic 112px Georgia';ctx.fillText('Stay curious.',66,213);ctx.font='26px "Microsoft YaHei", sans-serif';ctx.fillText('靠近一点，平常的事也会有新发现。',73,276);ctx.fillStyle=ink;ctx.fillRect(72,307,1056,3);
  const titles=['一封小信','换一笔颜色','好奇心收集处'],body=['谢谢你，停下来看看。','今天想用哪种颜色？','微小的发现也算数。'],buttons=[s.stamped?'已收到 ✓':'盖个章','换一笔',`发现 +${s.count}`];
  for(let i=0;i<3;i++){const x=72+i*358;ctx.fillStyle=i===1?'#d3ded0':'#f4ecd9';ctx.fillRect(x,350,338,384);ctx.strokeStyle='#a3a68b';ctx.strokeRect(x,350,338,384);ctx.fillStyle=ink;ctx.font='21px monospace';ctx.fillText('0'+(i+1),x+23,394);ctx.fillStyle='#263b35';ctx.font='29px "Microsoft YaHei", sans-serif';ctx.fillText(titles[i],x+22,454);ctx.font='20px "Microsoft YaHei", sans-serif';ctx.fillText(body[i],x+22,497);
   if(i===1){for(let j=0;j<5;j++){ctx.fillStyle=ink;ctx.globalAlpha=.25+j*.15;ctx.fillRect(x+23+j*58,536,48,44);}ctx.globalAlpha=1;}else if(i===2){ctx.fillStyle=ink;ctx.font='italic 66px Georgia';ctx.fillText(String(s.count).padStart(2,'0'),x+23,586);}else if(s.stamped){ctx.save();ctx.translate(x+185,557);ctx.rotate(-.14);ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.strokeRect(-100,-34,200,66);ctx.fillStyle=ink;ctx.font='24px "Microsoft YaHei", sans-serif';ctx.fillText('收到好奇 · '+s.stampCount,-88,10);ctx.restore();}
   ctx.fillStyle='#29413b';ctx.fillRect(x+23,642,292,56);ctx.fillStyle='#f2e6cb';ctx.font='22px "Microsoft YaHei", sans-serif';ctx.fillText(buttons[i],x+43,679);
  }ctx.fillStyle='#647669';ctx.font='20px monospace';ctx.fillText('A LITTLE CLOSER.  A LITTLE DIFFERENT.',72,799);texture.needsUpdate=true;
 }
 return{canvas,texture,draw};
}
