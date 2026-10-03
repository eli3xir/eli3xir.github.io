import { renderScore, SAMPLE_RATE } from './synth.js';
self.onmessage = ({data}) => {
  if(data?.type!=='compose')return;
  const rate=data.rate===24000?24000:SAMPLE_RATE;
  const started=performance.now();const score = renderScore(rate);
  score.generationMs=performance.now()-started;
  self.postMessage(score, score.stems.map(stem => stem.buffer));
};
