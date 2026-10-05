import {routeFor} from './domain.js';
import {prepareModel} from '../world/models.js';

export const featureLoaders={
  about:()=>import('./about.js'),
  radio:()=>import('./radio.js'),
  skin:()=>import('./skin.js'),
  projects:()=>Promise.all([
    import('./message-relay.js'),import('./project-signal.js'),import('./compiler-expression.js'),
    import('./project-compiler.js'),import('./vision.js'),
  ]).then(modules=>Object.assign({},...modules)),
  ocean:()=>import('./ocean.js'),
  partext:()=>import('./partext.js'),
  moon:()=>import('./moon.js'),
  fluid:()=>import('./fluid.js'),
  trails:()=>import('./trails.js'),
  galaxy:()=>import('./galaxy.js'),
  glass:()=>import('./glass.js'),
  breakout:()=>import('./breakout.js'),
  bullet:()=>import('./bullet.js'),
};
const pending=new Map();
export function prepareRoute(route){
  globalThis.__preloadExperience?.(route.pathname);
  const key=route.experiment?route.experimentId:route.id;
  if(!pending.has(key)){
    const features=Object.hasOwn(featureLoaders,key)?featureLoaders[key]():Promise.resolve({});
    pending.set(key,Promise.all([features,prepareModel(route)]).then(([module])=>module).catch(error=>{pending.delete(key);throw error;}));
  }
  return pending.get(key);
}
export const preparePath=pathname=>prepareRoute(routeFor(pathname));
