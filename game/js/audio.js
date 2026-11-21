// NIGHTSHIFT — sound made from nothing but oscillators.
// No audio files: every blip is a WebAudio oscillator, so the game stays
// offline and silent until the player first presses a key or clicks.

let ctx = null;
let muted = false;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return;
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// A soft padded footstep; pitch drops when sneaking.
export function playStep(sneaking) {
  tone(sneaking ? 140 : 190, 0.07, 'sine', sneaking ? 0.02 : 0.045);
}

// The sapphire chimes like struck glass.
export function playPickup() {
  tone(880, 0.25, 'sine', 0.12);
  tone(1318, 0.35, 'sine', 0.10, 0.08);
  tone(1760, 0.45, 'sine', 0.07, 0.16);
}

// Alarm sting when the meter fills and a guard gives chase.
export function playAlert() {
  tone(220, 0.22, 'sawtooth', 0.10, 0, 440);
  tone(440, 0.22, 'sawtooth', 0.08, 0.18, 220);
}

// A low thud when a guard catches Shade.
export function playCaught() {
  tone(160, 0.4, 'triangle', 0.16, 0, 55);
}

// A short rising fanfare for clearing a level.
export function playWin() {
  tone(523, 0.16, 'triangle', 0.11);
  tone(659, 0.16, 'triangle', 0.11, 0.14);
  tone(784, 0.16, 'triangle', 0.11, 0.28);
  tone(1046, 0.4, 'triangle', 0.12, 0.42);
}
