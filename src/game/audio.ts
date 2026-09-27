// All game sounds are synthesized with the Web Audio API — no audio files needed.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let hiss: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
let muted = false;

function ac() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  return ctx;
}

function out() {
  ac();
  return master!;
}

function noise() {
  const c = ac();
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

/** Must be called from a user gesture (iOS/Safari requirement). */
export function unlockAudio() {
  const c = ac();
  if (c.state === "suspended") void c.resume();
}

export function setMuted(value: boolean) {
  muted = value;
  if (master && ctx) master.gain.setTargetAtTime(value ? 0 : 0.9, ctx.currentTime, 0.02);
}

export function isMuted() {
  return muted;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  { type = "sine" as OscillatorType, vol = 0.3, endFreq = 0, attack = 0.005 } = {},
) {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(out());
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noiseBurst(
  start: number,
  dur: number,
  { vol = 0.3, type = "highpass" as BiquadFilterType, freq = 3000, endFreq = 0, q = 1 } = {},
) {
  const c = ac();
  const src = c.createBufferSource();
  src.buffer = noise();
  const f = c.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, start);
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(out());
  src.start(start, Math.random() * 1.5);
  src.stop(start + dur + 0.05);
}

/** Clock-like "tick" / "tock" of the bomb. */
export function playTick(high: boolean) {
  const t = ac().currentTime;
  tone(high ? 2400 : 1800, t, 0.045, { type: "square", vol: 0.12, attack: 0.001 });
  tone(high ? 1200 : 900, t, 0.03, { type: "triangle", vol: 0.2, attack: 0.001 });
  noiseBurst(t, 0.03, { vol: 0.25, freq: 5000 });
}

/** Low burning-fuse hiss that plays while the bomb is armed. */
export function startFuse() {
  if (hiss) return;
  const c = ac();
  const src = c.createBufferSource();
  src.buffer = noise();
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 6000;
  f.Q.value = 0.8;
  const gain = c.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(0.035, c.currentTime, 0.3);
  src.connect(f).connect(gain).connect(out());
  src.start();
  hiss = { src, gain };
}

export function stopFuse() {
  if (!hiss || !ctx) return;
  const { src, gain } = hiss;
  gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  src.stop(ctx.currentTime + 0.3);
  hiss = null;
}

export function playExplosion() {
  const c = ac();
  const t = c.currentTime;
  // crack
  noiseBurst(t, 0.25, { vol: 0.9, type: "lowpass", freq: 8000, endFreq: 1500 });
  // body of the blast
  const src = c.createBufferSource();
  src.buffer = noise();
  const shaper = c.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / curve.length) * 2 - 1;
    curve[i] = Math.tanh(x * 4);
  }
  shaper.curve = curve;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(4000, t);
  lp.frequency.exponentialRampToValueAtTime(80, t + 2.5);
  const g = c.createGain();
  g.gain.setValueAtTime(1.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
  src.connect(shaper).connect(lp).connect(g).connect(out());
  src.start(t);
  src.stop(t + 3);
  // sub boom
  tone(90, t, 1.6, { vol: 0.9, endFreq: 28, attack: 0.002 });
  tone(55, t + 0.05, 2, { vol: 0.6, endFreq: 20, type: "triangle" });
  // debris rattle
  for (let i = 0; i < 8; i++) {
    noiseBurst(t + 0.3 + Math.random() * 1.2, 0.08, { vol: 0.15, type: "bandpass", freq: 1500 + Math.random() * 3000, q: 4 });
  }
}

/** Happy "coin" arpeggio for bonus time. */
export function playBonus(seconds: number) {
  const t = ac().currentTime;
  const notes = seconds >= 20 ? [523, 659, 784, 1047, 1319] : seconds >= 10 ? [523, 659, 784, 1047] : seconds >= 5 ? [659, 988] : [880];
  notes.forEach((n, i) => tone(n, t + i * 0.07, 0.18, { type: "square", vol: 0.12 }));
  tone(notes[notes.length - 1] * 2, t + notes.length * 0.07, 0.35, { type: "sine", vol: 0.15 });
}

export function playClick() {
  const t = ac().currentTime;
  tone(700, t, 0.08, { vol: 0.25, endFreq: 300 });
}

export function playWhoosh() {
  const t = ac().currentTime;
  noiseBurst(t, 0.3, { vol: 0.35, type: "bandpass", freq: 400, endFreq: 4000, q: 2 });
}

export function playPick() {
  const t = ac().currentTime;
  tone(600, t, 0.1, { type: "triangle", vol: 0.25, endFreq: 1200 });
  tone(1200, t + 0.08, 0.12, { type: "triangle", vol: 0.2 });
}

/** Sad trombone for losing a life. */
export function playLifeLost() {
  const t = ac().currentTime;
  [392, 370, 349].forEach((n, i) => tone(n, t + i * 0.35, 0.33, { type: "sawtooth", vol: 0.12, attack: 0.03 }));
  tone(330, t + 1.05, 0.9, { type: "sawtooth", vol: 0.12, endFreq: 300, attack: 0.03 });
}

export function playFanfare() {
  const t = ac().currentTime;
  const seq: [number, number, number][] = [
    [523, 0, 0.15], [523, 0.15, 0.15], [523, 0.3, 0.15], [659, 0.45, 0.45], [587, 0.9, 0.15], [659, 1.05, 0.15], [784, 1.2, 0.8],
  ];
  seq.forEach(([n, s, d]) => {
    tone(n, t + s, d, { type: "square", vol: 0.1 });
    tone(n / 2, t + s, d, { type: "triangle", vol: 0.15 });
  });
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}

/** Descending "uh-oh" for losing time. */
export function playPenalty(seconds: number) {
  const t = ac().currentTime;
  const steps = seconds >= 15 ? 4 : seconds >= 10 ? 3 : 2;
  for (let i = 0; i < steps; i++) tone(520 - i * 90, t + i * 0.11, 0.16, { type: "sawtooth", vol: 0.1, endFreq: 440 - i * 90 });
  noiseBurst(t, 0.25, { vol: 0.2, type: "lowpass", freq: 900, endFreq: 200 });
}

/** Deflated "blip" when no time is added. */
export function playNothing() {
  const t = ac().currentTime;
  tone(330, t, 0.12, { type: "triangle", vol: 0.2 });
  tone(220, t + 0.12, 0.25, { type: "triangle", vol: 0.2, endFreq: 180 });
}
