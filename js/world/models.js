import {createExperiment,prepareExperiment} from './experiments.js';

const loaders={
  home:()=>import('./room.js').then(m=>(route,renderer,status)=>m.createRoom(status,renderer)),
  lab:()=>import('./potion.js').then(m=>()=>m.createPotion()),
  blog:()=>import('./book.js').then(m=>route=>m.createBook(route.contentTitle,route.readingEntries,route.article?route.readingMeta:null)),
  radio:()=>import('./phonograph.js').then(m=>route=>m.createPhonograph(route.radioPlayback)),
  projects:()=>import('./signal-bench.js').then(m=>route=>m.createSignalBench(route.relay,route.compiler,route.vision)),
  about:()=>import('./leisure.js').then(m=>()=>m.createLeisure()),
  skin:()=>import('./skin-preview.js').then(m=>(route,renderer)=>m.createSkinPreview(renderer)),
};
const pending=new Map(),factories=new Map();
export function prepareModel(route){
  if(route.experiment)return prepareExperiment(route.experimentId);
  const key=Object.hasOwn(loaders,route.id)?route.id:'lab';
  if(!pending.has(key))pending.set(key,loaders[key]().then(factory=>factories.set(key,factory)).catch(error=>{pending.delete(key);throw error;}));
  return pending.get(key);
}

export function createModel(route,renderer,status) {
  if(route.experiment)return createExperiment(route.experimentId,renderer);
  const factory=factories.get(Object.hasOwn(loaders,route.id)?route.id:'lab');
  if(!factory)throw new Error('Scene modules are not ready');
  return factory(route,renderer,status);
}
