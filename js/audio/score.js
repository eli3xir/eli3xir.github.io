import { readSetting, writeSetting, MIXES, beatState } from '../experience/domain.js';
import { renderCue, SAMPLE_RATE } from './synth.js';
import { MASTER_GAIN, movementAt } from './composition.js';

export class Score {
  constructor() {
    this.context = null;
    this.playing = false;
    this.generating = false;
    this.volume = Number(readSetting('score-volume', '.45'));
    this.volume = Math.min(1, Math.max(0, Number.isFinite(this.volume) ? this.volume : .45));
    this.started = performance.now() / 1000;
    const position=Number(readSetting('score-position','0','sessionStorage'));
    this.offset=Number.isFinite(position)?Math.max(0,position):0;
    this.mix = MIXES.home;
    this.sources = [];
    this.gains = [];
    const stems=readSetting('score-stems','1111');
    this.stemEnabled=Array.from(/^[01]{4}$/.test(stems)?stems:'1111',value=>value==='1');
    this.meters=[];this.levelValues=new Float32Array(4);
    this.listeners = new Set();
  }

  subscribe(fn) { this.listeners.add(fn); fn(this); return () => this.listeners.delete(fn); }
  notify() { this.listeners.forEach(fn => fn(this)); }
  get audible() { return this.playing && this.context?.state === 'running'; }
  get time() {
    // Browser interruptions freeze currentTime. Keep that same clock until the
    // visitor explicitly pauses, rather than returning an old session offset.
    if(this.playing && this.context)return Math.max(0,this.context.currentTime-this.zero);
    if(this.sources.length)return this.offset;
    return this.offset + performance.now() / 1000 - this.started;
  }
  get rhythm() { const time=this.time;return{time,...beatState(time),...movementAt(time)}; }

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
      worker.postMessage({type:'compose',rate:innerWidth<700?24000:SAMPLE_RATE});
    }).then(data => { this.data = data; return data; }).finally(() => { this.generating = false; this.pending = null; this.notify(); });
    return this.pending;
  }

  async toggle() {
    if(this.toggling)return this.toggling;
    this.toggling=this.changePlayback().finally(()=>{this.toggling=null;});
    return this.toggling;
  }

  async changePlayback() {
    if (this.audible) { await this.pause(); return; }
    // Create and resume the context within the initiating user gesture.
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.context.addEventListener('statechange',()=>this.notify());
    }
    await this.context.resume();
    if (this.sources.length) { this.playing = true; this.started = performance.now() / 1000; this.notify(); return; }
    const data = await this.prepare();
    this.master = this.context.createGain();
    this.master.gain.value = this.volume * MASTER_GAIN;
    const limiter = this.context.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 5;
    this.master.connect(limiter).connect(this.context.destination);
    const start = this.context.currentTime + .06;
    const timeline=this.time,playbackRate=data.duration/data.musicalDuration;
    const position=(timeline%data.musicalDuration)*playbackRate;
    this.zero = start - timeline;
    data.stems.forEach((samples, i) => {
      const buffer = this.context.createBuffer(1, samples.length, data.rate);
      buffer.getChannelData(0).set(samples);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.playbackRate.value=playbackRate;
      const gain = this.context.createGain();
      gain.gain.value = this.mix[i]*(this.stemEnabled[i]?1:0);
      const pan = this.context.createStereoPanner();
      pan.pan.value = [-.28, 0, .22, .04][i];
      source.connect(gain).connect(pan).connect(this.master);
      const analyser=this.context.createAnalyser();analyser.fftSize=512;gain.connect(analyser);
      this.meters.push({analyser,samples:new Float32Array(512)});
      source.start(start, position);
      this.sources.push(source);
      this.gains.push(gain);
    });
    // AudioBuffers now own the samples. Release the transferred worker copies.
    this.data.pcmBytes=data.stems.reduce((sum,stem)=>sum+stem.byteLength,0);this.data.stems=null;
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
    this.gains.forEach((gain, i) => gain.gain.setTargetAtTime(this.mix[i]*(this.stemEnabled[i]?1:0), this.context.currentTime, .22));
  }

  toggleStem(index){
    if(!Number.isInteger(index)||index<0||index>3)return;
    this.stemEnabled[index]=!this.stemEnabled[index];
    const parameter=this.gains[index]?.gain;
    if(parameter)parameter.setTargetAtTime(this.stemEnabled[index]?this.mix[index]:0,this.context.currentTime,.035);
    writeSetting('score-stems',this.stemEnabled.map(enabled=>enabled?'1':'0').join(''));this.notify();
  }

  levels(){
    this.levelValues.fill(0);if(!this.audible||this.volume===0)return this.levelValues;
    this.meters.forEach(({analyser,samples},i)=>{
      analyser.getFloatTimeDomainData(samples);let power=0;for(const sample of samples)power+=sample*sample;
      this.levelValues[i]=Math.min(1,Math.sqrt(power/samples.length)*10*this.volume/.45);
    });return this.levelValues;
  }

  setVolume(value) {
    const numeric=Number(value);if(!Number.isFinite(numeric))return;
    this.volume = Math.min(1, Math.max(0, numeric));
    writeSetting('score-volume', this.volume);
    this.master?.gain.setTargetAtTime(this.volume * MASTER_GAIN, this.context.currentTime, .04);
    this.notify();
  }

  cue(kind = 'reveal', delay = 0) {
    if (!this.playing || this.context.state !== 'running') return;
    const rate=this.data?.rate||SAMPLE_RATE;
    const samples = renderCue(kind,rate,beatState(this.time+delay).bar);
    const buffer = this.context.createBuffer(1, samples.length, rate);
    buffer.getChannelData(0).set(samples);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.master);
    source.start(this.context.currentTime + Math.max(0, delay));
  }

  save() { writeSetting('score-position', this.time, 'sessionStorage'); }
}
