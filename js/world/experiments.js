export const experimentLoaders={
 ocean:()=>import('./ocean.js').then(m=>m.createOcean),
 partext:()=>import('./word-machine.js').then(m=>m.createWordMachine),
 moon:()=>import('./moon.js').then(m=>m.createMoon),
 fluid:()=>import('./fluid.js').then(m=>m.createFluid),
 trails:()=>import('./trails.js').then(m=>m.createTrails),
 galaxy:()=>import('./galaxy.js').then(m=>m.createGalaxy),
 glass:()=>import('./glass.js').then(m=>m.createGlass),
 breakout:()=>import('./breakout.js').then(m=>m.createBreakout),
 bullet:()=>import('./bullet.js').then(m=>m.createBullet),
};
const pending=new Map(),factories=new Map(),keyFor=id=>Object.hasOwn(experimentLoaders,id)?id:'fluid';
export function prepareExperiment(id){
 const key=keyFor(id);
 if(!pending.has(key))pending.set(key,experimentLoaders[key]().then(factory=>factories.set(key,factory)).catch(error=>{pending.delete(key);throw error;}));
 return pending.get(key);
}
export function createExperiment(id,renderer){
 const factory=factories.get(keyFor(id));
 if(!factory)throw new Error('Experiment modules are not ready');
 return keyFor(id)==='fluid'?factory(renderer):factory();
}
