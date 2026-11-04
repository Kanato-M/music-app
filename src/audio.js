// Web Audio によるシンプルなコード再生（ピアノ風の減衰音）
import { mod12 } from './theory.js';

let ctx = null;
let stopAt = 0;
let timers = [];

function audio() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

/** コードを鳴らす MIDI ノート（ベース 1 音 + 上声のクローズ・ボイシング） */
export function voicing(chord, shift = 0) {
  const rootPc = mod12(chord.root.pc + shift);
  const bassPc = mod12((chord.bass ?? chord.root).pc + shift);
  const bass = 36 + bassPc; // C2〜B2
  let base = 52 + mod12(rootPc - 4); // 上声は E3〜D♯4 あたりから
  const notes = chord.quality.intervals.map((i) => base + i);
  return [bass, ...notes];
}

function tone(midi, start, dur, gain) {
  const c = audio();
  const osc = c.createOscillator();
  const osc2 = c.createOscillator();
  const g = c.createGain();
  osc.type = 'triangle';
  osc2.type = 'sine';
  osc.frequency.value = freq(midi);
  osc2.frequency.value = freq(midi) * 2;
  const g2 = c.createGain();
  g2.gain.value = 0.15;
  osc.connect(g);
  osc2.connect(g2).connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(gain * 0.35, start + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.start(start);
  osc2.start(start);
  osc.stop(start + dur + 0.05);
  osc2.stop(start + dur + 0.05);
}

export function playChord(chord, { shift = 0, at = 0, dur = 1.6 } = {}) {
  const c = audio();
  const start = Math.max(c.currentTime, at || c.currentTime) + 0.02;
  const notes = voicing(chord, shift);
  notes.forEach((n, i) => tone(n, start + i * 0.012, dur, i === 0 ? 0.16 : 0.09));
  stopAt = Math.max(stopAt, start + dur);
}

/**
 * 小節の配列を順番に再生する。onStep(barIndex, chordIndex) でハイライト表示に使う。
 * 1 小節 = 4 拍、1 小節内のコードは等分。
 */
export function playBars(bars, { bpm = 80, shift = 0, onStep, onEnd } = {}) {
  stop();
  const c = audio();
  const beat = 60 / bpm;
  let t = c.currentTime + 0.1;
  bars.forEach((bar, bi) => {
    const len = (4 * beat) / bar.length;
    bar.forEach((chord, ci) => {
      playChord(chord, { shift, at: t, dur: Math.min(len * 1.1, 2.4) });
      const delay = (t - c.currentTime) * 1000;
      timers.push(setTimeout(() => onStep?.(bi, ci), delay));
      t += len;
    });
  });
  timers.push(setTimeout(() => onEnd?.(), (t - c.currentTime) * 1000));
}

export function stop() {
  timers.forEach(clearTimeout);
  timers = [];
  if (ctx && stopAt > ctx.currentTime) {
    // 鳴っている音を止めるため、コンテキストごと作り直す
    ctx.close();
    ctx = null;
    stopAt = 0;
  }
}
