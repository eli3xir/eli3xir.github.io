import * as THREE from 'three';
import {downloadBinary} from './room-download.js';
import {decodeLightmapBundle} from './lightmap-bundle.js';

function imageTexture(url,timeout) {
  return new Promise((resolve,reject)=>{
    const image=new Image();image.crossOrigin='anonymous';
    const finish=error=>{
      clearTimeout(timer);image.onload=image.onerror=null;
      if(error){image.src='';reject(error);return;}
      const texture=new THREE.Texture(image);texture.needsUpdate=true;resolve(texture);
    };
    const timer=setTimeout(()=>finish(new Error('光照图暂时未能加载')),timeout);
    image.onload=()=>finish();image.onerror=()=>finish(new Error('光照图暂时未能加载'));image.src=url;
  });
}

function imageQueue(limit=4) {
  const waiting=[];let active=0;
  const drain=()=>{
    while(active<limit&&waiting.length){
      const job=waiting.shift();active++;
      Promise.resolve().then(job.run).then(job.resolve,job.reject).finally(()=>{active--;drain();});
    }
  };
  return run=>new Promise((resolve,reject)=>{waiting.push({run,resolve,reject});drain();});
}

export async function createRoomLightmaps(progress) {
  let packed=null;
  const stats={mode:'files',packed:0,fallback:0};
  try{
    packed=decodeLightmapBundle(await downloadBinary('/assets/room/lightmaps.bin',progress));
    stats.mode='bundle';
  }catch{ /* Individual originals remain usable if the archive is unavailable. */ }
  const queue=imageQueue(),expires=performance.now()+60000;
  const remaining=()=>{
    const time=expires-performance.now();if(time<=0)throw new Error('光照图加载超时');
    return Math.min(30000,time);
  };
  return{stats,load:file=>queue(async()=>{
    remaining();const entry=packed?.get(file);let texture;
    if(entry){
      let url;
      try{
        const digest=await crypto.subtle.digest('SHA-256',entry.bytes);
        const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
        if(hash!==entry.sha256)throw new Error('Lightmap checksum mismatch');
        url=URL.createObjectURL(new Blob([entry.bytes],{type:'image/jpeg'}));
        texture=await imageTexture(url,remaining());stats.packed++;
      }catch{ /* Only this image falls back; the remaining archive stays useful. */ }
      finally{if(url)URL.revokeObjectURL(url);}
    }
    if(!texture){stats.fallback++;texture=await imageTexture('/assets/room/lightmaps/'+file,remaining());}
    texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.channel=1;
    texture.userData.lightmapFile=file;return texture;
  })};
}
