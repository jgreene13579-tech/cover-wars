// Tiny Web Audio synth: 8-bit sound effects plus a fallback chiptune loop
// that plays until the band's real MP3s are dropped in.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.22;
      master.connect(ctx.destination);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0.5;
      musicBus.connect(master);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.3, slide?: number, delay = 0, bus?: GainNode | null) {
  const c = ac();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(bus ?? master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.3, freq = 2000, delay = 0, type: BiquadFilterType = 'lowpass', bus?: GainNode | null) {
  const c = ac();
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(bus ?? master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  click: () => tone(880, 0.05, 'square', 0.12),
  select: () => { tone(660, 0.06, 'square', 0.12); tone(990, 0.08, 'square', 0.1, undefined, 0.05); },
  step: () => noise(0.03, 0.08, 900),
  rifle: () => { noise(0.12, 0.5, 3000); tone(220, 0.08, 'square', 0.2, 80); },
  pistol: () => { noise(0.07, 0.4, 4000); tone(420, 0.05, 'square', 0.15, 150); },
  sniper: () => { noise(0.35, 0.6, 1400); tone(160, 0.3, 'sawtooth', 0.25, 40); },
  note: () => { tone(784, 0.12, 'triangle', 0.25); tone(1046, 0.12, 'triangle', 0.2, undefined, 0.06); },
  shotgun: () => { noise(0.25, 0.8, 1800); tone(120, 0.15, 'square', 0.25, 50); },
  zap: () => { tone(1800, 0.12, 'sawtooth', 0.12, 200); noise(0.08, 0.3, 6000, 0, 'highpass'); },
  fire: () => { noise(0.8, 0.5, 700, 0, 'bandpass'); noise(0.5, 0.3, 300, 0.2); },
  heal: () => [523, 784, 1046, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.18, undefined, i * 0.08)),
  smash: () => { noise(0.4, 0.9, 500); tone(70, 0.4, 'square', 0.35, 30); },
  teleport: () => { tone(300, 0.3, 'sine', 0.2, 2400); tone(2400, 0.3, 'triangle', 0.1, 600, 0.15); },
  hypno: () => {
    tone(300, 0.7, 'sine', 0.2, 600); tone(450, 0.7, 'sine', 0.12, 900, 0.12); tone(600, 0.6, 'triangle', 0.08, 300, 0.25);
  },
  freed: () => { tone(900, 0.08, 'square', 0.15); tone(1350, 0.18, 'square', 0.15, undefined, 0.08); },
  whistle: () => { tone(2400, 0.18, 'square', 0.14); tone(2400, 0.3, 'square', 0.14, 2200, 0.24); },
  scan: () => { tone(400, 0.3, 'sine', 0.18, 1600); tone(1600, 0.12, 'square', 0.08, undefined, 0.3); },
  rally: () => [392, 523, 659, 784].forEach((f, i) => tone(f, 0.16, 'square', 0.18, undefined, i * 0.09)),
  rocket: () => { noise(0.45, 0.3, 900, 0, 'bandpass'); tone(300, 0.45, 'sawtooth', 0.1, 900); },
  boom: () => { noise(0.7, 0.9, 600); tone(90, 0.6, 'square', 0.35, 30); },
  hit: () => tone(200, 0.09, 'square', 0.25, 90),
  crit: () => { tone(1200, 0.06, 'square', 0.2); tone(1600, 0.12, 'square', 0.2, undefined, 0.06); },
  miss: () => tone(500, 0.1, 'triangle', 0.12, 300),
  death: () => tone(400, 0.55, 'square', 0.22, 50),
  alert: () => { tone(1000, 0.07, 'square', 0.18); tone(1000, 0.07, 'square', 0.18, undefined, 0.12); },
  clap: () => { for (let i = 0; i < 3; i++) noise(0.09, 0.7, 2500, i * 0.14, 'highpass'); },
  stealth: () => { tone(600, 0.5, 'sine', 0.2, 180); tone(900, 0.4, 'sine', 0.08, 300, 0.1); },
  coin: () => { tone(988, 0.06, 'square', 0.18); tone(1319, 0.16, 'square', 0.18, undefined, 0.06); },
  buy: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.18, undefined, i * 0.07)),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.2, undefined, i * 0.12)),
  lose: () => [392, 370, 349, 262].forEach((f, i) => tone(f, 0.3, 'triangle', 0.25, undefined, i * 0.25)),
};

// ------------------------------------------------------------ chip loop

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
// Am - F - C - G, a moody little indie progression
const CHORDS: [number, number[]][] = [
  [57, [0, 3, 7]], [53, [0, 4, 7]], [48, [0, 4, 7]], [55, [0, 4, 7]],
];
const EIGHTH = 0.2;
let timer: number | null = null;
let nextTime = 0;
let step = 0;

function scheduleStep(s: number, t: number) {
  const c = ac();
  if (!c) return;
  const delay = Math.max(0, t - c.currentTime);
  const [root, tones] = CHORDS[Math.floor(s / 8) % 4];
  const i = s % 8;
  tone(midi(root - 24 + (i % 2 ? 12 : 0)), EIGHTH * 0.9, 'triangle', 0.35, undefined, delay, musicBus);
  const arp = [0, 1, 2, 1, 0, 2, 1, 2][i];
  tone(midi(root + 12 + tones[arp]), EIGHTH * 0.6, 'square', 0.07, undefined, delay, musicBus);
  if (i === 0 || i === 4) tone(110, 0.12, 'sine', 0.5, 40, delay, musicBus);
  if (i === 2 || i === 6) noise(0.08, 0.25, 3000, delay, 'highpass', musicBus);
  else noise(0.02, 0.08, 7000, delay, 'highpass', musicBus);
}

export function startChipLoop() {
  const c = ac();
  if (!c || timer !== null) return;
  nextTime = c.currentTime + 0.1;
  step = 0;
  timer = window.setInterval(() => {
    while (nextTime < c.currentTime + 0.25) {
      scheduleStep(step++, nextTime);
      nextTime += EIGHTH;
    }
  }, 50);
}

export function stopChipLoop() {
  if (timer !== null) window.clearInterval(timer);
  timer = null;
}

export function setSynthMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.22;
}

export function unlockAudio() { ac(); }
