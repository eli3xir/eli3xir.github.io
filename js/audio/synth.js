/* Original score: "After Hours / 好奇心仍在亮着". Every sound is PCM generated here. */
import { BPM, BARS } from './composition.js';
export { BPM, BARS } from './composition.js';
export const SAMPLE_RATE = 32000;
const TAU = Math.PI * 2;
const noteHz = midi => 440 * 2 ** ((midi - 69) / 12);
const beatSeconds = 60 / BPM;

export function randomSequence(seed = 74139) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };
}

function envelope(t, duration, attack = 0.008, release = 0.1) {
  return Math.min(1, t / attack) * Math.min(1, Math.max(0, duration - t) / release);
}

function bell(t, frequency) {
  return (Math.sin(TAU * frequency * t + 2.2 * Math.sin(TAU * frequency * 2 * t) * Math.exp(-t * 8)) * 0.65 +
    Math.sin(TAU * frequency * 3 * t) * 0.17 * Math.exp(-t * 6)) * Math.exp(-t * 2.6);
}

function lead(t, frequency) {
  const vibrato=frequency*.008/5.2*(1-Math.exp(-t*8));
  const phase = TAU * frequency * t + Math.sin(TAU * 5.2 * t) * vibrato;
  return (Math.sin(phase) + Math.sin(phase * 2) * .28 + Math.sin(phase * 3) * .13 + Math.sin(phase*5)*.045) * .55;
}

function pluck(t,frequency){
  const phase=TAU*frequency*t;
  return (Math.sin(phase)-Math.sin(phase*3)/9+Math.sin(phase*5)/25)*Math.exp(-t*7)*.72;
}

function addNote(buffer, rate, start, length, midi, kind, gain) {
  const offset = Math.round(start * rate);
  const duration = length;
  const frequency = noteHz(midi);
  const count = Math.min(Math.round(duration * rate), buffer.length - offset);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    let sample;
    if (kind === 'pad') {
      sample = (Math.sin(TAU * frequency * t) + Math.sin(TAU * frequency * 1.003 * t) * 0.42 +
        Math.sin(TAU * frequency * 0.998 * t) * 0.42) * 0.34;
    } else if (kind === 'bass') {
      sample = Math.sin(TAU * frequency * t) * 0.8 + Math.sin(TAU * frequency * 2 * t) * 0.13;
    } else sample = kind === 'bell' ? bell(t, frequency) : kind==='pluck'?pluck(t,frequency):lead(t, frequency);
    const amp = envelope(t, duration, kind === 'pad' ? 0.12 : 0.008, kind === 'pad' ? 0.35 : 0.09);
    buffer[offset + i] += sample * amp * gain;
  }
}

function addDrum(buffer, rate, start, kind, gain, noise) {
  const offset = Math.round(start * rate);
  const duration = kind === 'kick' ? 0.34 : kind === 'snare' ? 0.18 : 0.085;
  const count = Math.min(Math.round(duration * rate), buffer.length - offset);
  let previous = 0;
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const n = noise();
    const high = n - previous * 0.84;
    previous = n;
    const sample = kind === 'kick' ? Math.sin(TAU * (48 * t + 65 * (1 - Math.exp(-t * 26)) / 26)) * Math.exp(-t * 16) :
      kind === 'snare' ? (high * 0.64 + Math.sin(TAU * 175 * t) * 0.32) * Math.exp(-t * 26) : high * Math.exp(-t * 63);
    buffer[offset + i] += sample * Math.min(1, t / 0.002) * gain;
  }
}

/* Dm9 / Bbmaj7 / Fadd9 / Cadd9. A question, lift, breath and answering theme. */
const CHORDS = [[50, 57, 60, 64, 65], [46, 53, 57, 60, 62], [41, 48, 53, 57, 67], [48, 55, 60, 62, 64]];
const MELODY = [
  [[0, 74, .7], [1, 77, .45], [1.5, 81, .4], [2, 79, .7], [3, 77, .45], [3.5, 76, .4]],
  [[0, 74, 1.2], [1.5, 72, .4], [2, 69, .7], [3, 72, .8]],
  [[0, 77, .7], [1, 81, .45], [1.5, 84, .4], [2, 81, .7], [3, 79, .7]],
  [[0, 76, .7], [1, 79, .7], [2, 74, .45], [2.5, 72, .4], [3, 69, .8]],
  [[0, 74, .45], [.5, 77, .4], [1, 81, .7], [2, 86, .7], [3, 84, .7]],
  [[0, 81, .7], [1, 79, .45], [1.5, 77, .4], [2, 74, 1.6]],
  [[0, 77, .45], [.5, 79, .4], [1, 81, .7], [2, 84, .7], [3, 81, .7]],
  [[0, 79, .7], [1, 76, .7], [2, 72, .7], [3, 74, .85]],
];
const BRIDGE=[
  [[0,77,1.7],[2,79,.7],[3,81,.8]],
  [[0,79,1.2],[1.5,77,.45],[2,76,1.65]],
  [[0,76,1.7],[2,72,1.65]],
  [[0,74,1.2],[1.5,76,.45],[2,79,1.65]],
  [[0,77,1.7],[2,76,.7],[3,74,.8]],
  [[0,72,1.7],[2,69,1.65]],
  [[0,74,1.7],[2,77,1.65]],
  [[0,79,.7],[1,77,.7],[2,76,.7],[3,74,.85]],
];
const ANSWER=[
  [[0,86,.7],[1,84,.45],[1.5,81,.4],[2,79,.7],[3,77,.8]],
  [[0,81,.7],[1,79,.45],[1.5,77,.4],[2,74,1.65]],
  [[0,82,.7],[1,81,.45],[1.5,77,.4],[2,74,.7],[3,72,.8]],
  [[0,77,.7],[1,74,.7],[2,72,.7],[3,74,.85]],
  [[0,81,.7],[1,84,.45],[1.5,86,.4],[2,84,.7],[3,81,.8]],
  [[0,79,.7],[1,77,.7],[2,76,.7],[3,77,.8]],
  [[0,79,.7],[1,76,.7],[2,74,.45],[2.5,72,.4],[3,69,.8]],
  [[0,72,.7],[1,76,.7],[2,77,.45],[2.5,76,.4],[3,74,.85]],
];

export function chordForBar(bar){
  const cycle=((Math.floor(bar)%BARS)+BARS)%BARS;
  const order=cycle>=16&&cycle<24?[2,3,0,1]:[0,1,2,3];
  return CHORDS[order[Math.floor((cycle%8)/2)]];
}

export function renderScore(rate = SAMPLE_RATE, bars = BARS) {
  const duration = bars * 4 * beatSeconds;
  const samples = Math.round(duration * rate);
  const stems = Array.from({ length: 4 }, () => new Float32Array(samples));
  const noise = randomSequence();
  for (let bar = 0; bar < bars; bar++) {
    const chord=chordForBar(bar),section=Math.floor((bar%BARS)/8),quiet=section===2,opening=section===0;
    const start = bar * 4 * beatSeconds;
    const drumGain=quiet?.18:opening?.5+(bar%8)*.06:section===3?.85:.95;
    for (const midi of chord.slice(1)) addNote(stems[0], rate, start, 4 * beatSeconds, midi, 'pad', .105*(quiet?1.12:.95));
    for (const beat of quiet?[0,2.5]:[0,1.5,2,3.5]) addNote(stems[1], rate, start + beat * beatSeconds, quiet?.62:.42, chord[0], 'bass', .29*(quiet?.55:opening?.7:1));
    if(!quiet&&bar%8===7)addNote(stems[1],rate,start+3.25*beatSeconds,.18,chord[0]+7,'bass',.13);
    const melody=(quiet?BRIDGE:section===3?ANSWER:MELODY)[bar%8];
    for (const [beat, midi, length] of melody) {
      addNote(stems[2], rate, start + beat * beatSeconds, length * beatSeconds, midi, opening||quiet?'bell':'lead', .2*(quiet?.65:opening?.8:section===3?1.05:1));
    }
    for (let eighth = 0; eighth < 8; eighth++) {
      if(!quiet||eighth%2===0)addNote(stems[2], rate, start + eighth * .5 * beatSeconds, .21, chord[1 + eighth % 4] + 12, section===3?'pluck':'bell', .06*(quiet?.25:opening?.6:section===3?.65:1));
      addDrum(stems[3], rate, start + eighth * .5 * beatSeconds, 'hat', (eighth % 2 ? .035 : .065)*drumGain, noise);
    }
    for (const beat of quiet?[0]:[0,2]) addDrum(stems[3], rate, start + beat * beatSeconds, 'kick', .5*drumGain, noise);
    for (const beat of quiet?[3]:[1,3]) addDrum(stems[3], rate, start + beat * beatSeconds, 'snare', .17*drumGain, noise);
    if (!quiet&&bar % 4 === 3) for (const beat of [3.25, 3.5, 3.75]) addDrum(stems[3], rate, start + beat * beatSeconds, 'snare', .07*drumGain, noise);
  }
  for (const stem of stems) {
    const delay = Math.round(beatSeconds * .75 * rate);
    for (let i = samples - 1; i >= delay; i--) stem[i] += stem[i - delay] * .16;
    for (let i = 0; i < samples; i++) stem[i] = Math.tanh(stem[i]);
    // Crossfade the seam without a pop. The loop contains complete musical phrases.
    const seam = Math.round(rate * .012);
    for (let i = 0; i < seam; i++) {
      stem[i] *= i / seam;
      stem[samples - i - 1] *= i / seam;
    }
  }
  return { rate, duration: samples / rate, musicalDuration:duration, stems };
}

export function renderCue(kind = 'reveal', rate = SAMPLE_RATE, bar=0) {
  const arcade=/^brick[0-4]$/.test(kind)||['paddle','miss','graze','hit'].includes(kind);
  const buffer = new Float32Array(Math.round(rate * (arcade?.3:.85)));
  const chord=chordForBar(bar);let root=chord[0]+24;if(root<69)root+=12;
  const third=chord[0]%12===2?3:4;
  if(arcade){
    const row=/^brick/.test(kind)?Number(kind.at(-1)):0;
    if(kind==='graze')addNote(buffer,rate,0,.13,root+19,'bell',.065);
    else if(kind==='hit'){addNote(buffer,rate,0,.18,root-12,'pluck',.09);const noise=randomSequence(783);for(let i=0;i<Math.min(buffer.length,rate*.07);i++)buffer[i]+=noise()*.022*Math.exp(-i/rate*70);}
    else if(kind==='miss'){addNote(buffer,rate,0,.16,root-12,'pluck',.08);addNote(buffer,rate,.1,.18,root-17,'bell',.06);}
    else{addNote(buffer,rate,0,kind==='paddle'?.12:.25,root+(kind==='paddle'?0:[12,third===3?10:9,7,third,0][row]),kind==='paddle'?'pluck':'bell',.11);const noise=randomSequence(782+row);for(let i=0;i<Math.min(buffer.length,rate*.04);i++)buffer[i]+=noise()*.025*Math.exp(-i/rate*120);}
  }
  else if (kind === 'hover') addNote(buffer, rate, 0, .13, root+12, 'bell', .1);
  else {
    [root,root+third,root+7].forEach((midi, i) => addNote(buffer, rate, i * .055, .65 - i * .055, midi, 'bell', .14));
    const noise = randomSequence(871);
    for (let i = 0; i < buffer.length; i++) {
      const t = i / rate;
      buffer[i] += noise() * Math.sin(Math.PI * Math.min(t / .45, 1)) ** 4 * Math.exp(-t * 6) * .028;
    }
  }
  return buffer;
}
