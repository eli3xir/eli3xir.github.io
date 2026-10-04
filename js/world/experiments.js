import {createOcean} from './ocean.js';
import {createWordMachine} from './word-machine.js';
import {createMoon} from './moon.js';
import {createFluid} from './fluid.js';
import {createTrails} from './trails.js';
import {createGalaxy} from './galaxy.js';
import {createGlass} from './glass.js';
import {createBreakout} from './breakout.js';
import {createBullet} from './bullet.js';
export function createExperiment(id,renderer){
 return({moon:createMoon,ocean:createOcean,fluid:()=>createFluid(renderer),trails:createTrails,galaxy:createGalaxy,glass:createGlass,breakout:createBreakout,partext:createWordMachine,bullet:createBullet}[id]||(()=>createFluid(renderer)))();
}
