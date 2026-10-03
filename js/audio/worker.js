import { renderScore } from './synth.js';
self.onmessage = () => {
  const score = renderScore();
  self.postMessage(score, score.stems.map(stem => stem.buffer));
};
