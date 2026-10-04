import { createExperiment } from './experiments.js';
import { createBook } from './book.js';
import { createSignalBench } from './signal-bench.js';
import {createPhonograph} from './phonograph.js';
import {createPotion} from './potion.js';
import {createSkinPreview} from './skin-preview.js';
import {createLeisure} from './leisure.js';

export function createModel(route,renderer) {
  if(route.experiment)return createExperiment(route.experimentId,renderer);
  return ({ lab:createPotion, blog:()=>createBook(route.contentTitle,route.readingEntries,route.article?route.readingMeta:null), radio:()=>createPhonograph(route.radioPlayback), projects:()=>createSignalBench(route.relay), about:createLeisure, skin:createSkinPreview }[route.id] || createPotion)();
}
