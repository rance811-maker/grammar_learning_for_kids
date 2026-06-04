// Lightweight sound effects synthesized with the Web Audio API — no audio
// asset files needed. Every effect respects the user's sound setting.

import { store } from './store.js';

let ctx = null;

function enabled() {
  return store.state?.settings?.soundEnabled !== false;
}

function getCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  // Browsers suspend the context until a user gesture; resume on demand.
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Play a single tone. `when` is an offset in seconds from now.
function tone(freq, { start = 0, duration = 0.15, type = 'sine', gain = 0.15 } = {}) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // Quick attack, smooth exponential release so notes don't click.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sound = {
  correct() {
    if (!enabled()) return;
    tone(587.33, { start: 0, duration: 0.12, type: 'triangle' });    // D5
    tone(880.0, { start: 0.09, duration: 0.16, type: 'triangle' });  // A5
  },

  wrong() {
    if (!enabled()) return;
    tone(196.0, { start: 0, duration: 0.22, type: 'sawtooth', gain: 0.12 }); // G3
    tone(155.56, { start: 0.08, duration: 0.26, type: 'sawtooth', gain: 0.12 });
  },

  // Pitch climbs with the combo count for a satisfying streak feel.
  combo(n) {
    if (!enabled()) return;
    const base = 660;
    const freq = base + Math.min(n, 10) * 45;
    tone(freq, { start: 0, duration: 0.1, type: 'square', gain: 0.1 });
  },

  // Little ascending fanfare; longer for more stars.
  finish(stars = 1) {
    if (!enabled()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
    const count = Math.max(2, Math.min(stars + 1, notes.length));
    for (let i = 0; i < count; i++) {
      tone(notes[i], { start: i * 0.12, duration: 0.22, type: 'triangle', gain: 0.16 });
    }
  },

  // Triumphant chord for clearing the PET mock.
  victory() {
    if (!enabled()) return;
    const chord = [523.25, 659.25, 783.99];
    chord.forEach((f) => tone(f, { start: 0, duration: 0.6, type: 'triangle', gain: 0.12 }));
    tone(1046.5, { start: 0.25, duration: 0.5, type: 'triangle', gain: 0.14 });
  },
};
