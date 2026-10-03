import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {encodeLightmapBundle,decodeLightmapBundle} from '../js/world/lightmap-bundle.js';

const directory=new URL('../assets/room/lightmaps/',import.meta.url);
const target=new URL('../assets/room/lightmaps.bin',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',directory),'utf8'));
const files=[...new Set(Object.values(manifest).map(entry=>entry.file))].sort().map(name=>{
  const bytes=fs.readFileSync(new URL(name,directory));
  return{name,bytes,sha256:createHash('sha256').update(bytes).digest('hex')};
});
const bundle=encodeLightmapBundle(files);
if(process.argv.includes('--check')){
  const current=fs.readFileSync(target),decoded=decodeLightmapBundle(current);
  if(!current.equals(Buffer.from(bundle))||files.some(file=>!file.bytes.equals(Buffer.from(decoded.get(file.name).bytes)))){
    throw new Error('Lightmap bundle differs from source JPEGs; run npm run build:lightmaps');
  }
}else fs.writeFileSync(target,bundle);
console.log(JSON.stringify({files:files.length,sourceBytes:files.reduce((sum,file)=>sum+file.bytes.length,0),bundleBytes:bundle.length,exact:true}));
