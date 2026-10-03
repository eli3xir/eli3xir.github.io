export const BPM=112;
export const BARS=32;
export const MASTER_GAIN=1.2;
export const MOVEMENTS=[
  {movement:'opening',title:'灯亮了',energy:.55},
  {movement:'lift',title:'灵感开始冒险',energy:1},
  {movement:'breath',title:'留一点空白',energy:.34},
  {movement:'return',title:'带着答案回来',energy:.9},
];

/* Four eight-bar movements share the audio and visual timeline. The first
   beat of each movement eases the visual energy into its new orchestration. */
export function movementAt(time){
  const seconds=Number.isFinite(time)?Math.max(0,time):0;
  let bar=seconds*BPM/240;
  if(Math.abs(bar-Math.round(bar))<1e-8)bar=Math.round(bar);
  const cycleBar=bar%BARS,index=Math.floor(cycleBar/8);
  const current=MOVEMENTS[index],previous=MOVEMENTS[(index+3)%4];
  const beatIntoMovement=(cycleBar-index*8)*4;
  const fade=Math.min(1,beatIntoMovement),eased=fade*fade*(3-2*fade);
  return{...current,index,cycleBar,progress:(cycleBar-index*8)/8,
    energy:previous.energy+(current.energy-previous.energy)*eased};
}
