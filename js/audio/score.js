import { readSetting, writeSetting, MIXES, beatState } from '../experience/domain.js';
import { renderCue, SAMPLE_RATE } from './synth.js';

export class Score {
  constructor() {
    this.context = null;
    this.playing = false;
    this.generating = false;
    this.volume = Number(readSetting('score-volume', '.45'));
    this.volume = Math.min(1, Math.max(0, Number.isFinite(this.volume) ? this.volume : .45));
    this.started = performance.now() / 1000;
    this.offset = Number(readSetting('score-position', '0', 'sessionStorage')) || 0;
    this.mix = MIXES.home;
    this.sources = [];
    this.gains = [];
    this.listeners = new Set();
  }

  subscribe(fn) { this.listeners.add(fn); fn(this); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this)); }
  get time() {
    if(this.playing && this.context?.state === 'running')return Math.max(0,this.context.currentTime-this.zero);
    if(this.sources.length)return this.offset;
    return this.offset + performance.now() / 1000 - this.started;
  }
  get rhythm() { return beatState(this.time); }

  async prepare() {
    if (this.data) return this.data;
    if (this.pending) return this.pending;
    this.generating = true;
    this.notify();
    this.pending = new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
      const timeout = setTimeout(() => { worker.terminate(); reject(new Error('配乐生成超时，请重试')); }, 15000);
      worker.onmessage = ({ data }) => { clearTimeout(timeout); worker.terminate(); resolve(data); };
      worker.onerror = e => { clearTimeout(timeout); worker.terminate(); reject(new Error(e.message)); };
      worker.postMessage({type:'compose'});
    }).then(data => { this.data = data; return data; }).finally(() => { this.generating = false; this.pending = null; this.notify(); });
    return this.pending;
  }

  async toggle() {
    if(this.toggling)return this.toggling;
    this.toggling=this.changePlayback().finally(()=>{this.toggling=null;});
    return this.toggling;
  }

  async changePlayback() {
    if (this.playing) { await this.pause(); return; }
    // Create and resume the context within the initiating user gesture.
    this.context ||= new (window.AudioContext || window.webkitAudioContext)();
    await this.context.resume();
    if (this.sources.length) { this.playing = true; this.started = performance.now() / 1000; this.notify(); return; }
    const data = await this.prepare();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume * .48;
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 5;
    this.master.connect(limiter).connect(this.context.destination);
    const start = this.context.currentTime + .06;
    const position = this.time % data.duration;
    this.zero = start - position;
    data.stems.forEach((samples, i) => {
      const buffer = this.context.createBuffer(1, samples.length, data.rate);
      buffer.getChannelData(0).set(samples);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = this.context.createGain();
      gain.gain.value = this.mix[i];
      const pan = this.context.createStereoPanner();
      pan.pan.value = [-.28, 0, .22, .04][i];
      source.connect(gain).connect(pan).connect(this.master);
      source.start(start, position);
      this.sources.push(source);
      this.gains.push(gain);
    });
    this.playing = true;
    this.notify();
  }

  async pause() {
    this.offset = this.time;
    this.started = performance.now() / 1000;
    await this.context?.suspend();
    this.playing = false;
    this.notify();
  }

  scene(id) {
    this.mix = MIXES[id] || MIXES.home;
    this.gains.forEach((gain, i) => gain.gain.setTargetAtTime(this.mix[i], this.context.currentTime, .22));
  }

  setVolume(value) {
    this.volume = Math.min(1, Math.max(0, Number(value)));
    writeSetting('score-volume', this.volume);
    this.master?.gain.setTargetAtTime(this.volume * .48, this.context.currentTime, .04);
    this.notify();
  }

  cue(kind = 'reveal', delay = 0) {
    if (!this.playing || this.context.state !== 'running') return;
    const samples = renderCue(kind);
    const buffer = this.context.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master);
    source.start(this.context.currentTime + Math.max(0, delay));
  }

  save() { writeSetting('score-position', this.time, 'sessionStorage'); }
}
