import {readSetting,writeSetting} from './domain.js';

const key='visual-quality',listeners=new Set();
export const validQuality=value=>['auto','high','low'].includes(value);
let selected=readSetting(key,'auto');
if(!validQuality(selected))selected='auto';
export const visualQuality=()=>selected;
export function qualityRatio({mobile=1.25,desktop=1.6}={}){
  return selected==='low'?1:Math.min(devicePixelRatio,selected==='high'?2:innerWidth<700?mobile:desktop);
}
export function setVisualQuality(value,{persist=true}={}){
  if(!validQuality(value)||value===selected)return;
  selected=value;
  // Keep the current choice even when storage is unavailable.
  if(persist)writeSetting(key,value);
  listeners.forEach(listener=>listener(value));
}
export function watchVisualQuality(listener){listeners.add(listener);return()=>listeners.delete(listener);}
addEventListener('storage',event=>{
  try{
    if(event.storageArea!==localStorage||(event.key!==key&&event.key!==null))return;
    const value=event.newValue;
    setVisualQuality(validQuality(value)?value:'auto',{persist:false});
  }catch{/* A denied storage getter must not disable the controls. */}
});
