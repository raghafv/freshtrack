/**
 * Tactile + audible confirmations. Synthesised with Web Audio (no files),
 * degrades silently where unsupported. Respects the "ft-sound-off" flag.
 */

export function haptic(pattern: number | number[] = 18) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

let ctx: AudioContext | null = null;

function soundOn() {
  try {
    return typeof localStorage === "undefined" || localStorage.getItem("ft-sound-off") !== "1";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem("ft-sound-off", on ? "0" : "1");
  } catch {
    /* ignore */
  }
}
export const isSoundEnabled = soundOn;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined" || !soundOn()) return null;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Play a sequence of notes: [frequency, delaySeconds][]. */
function tones(
  notes: [number, number][],
  opts: { type?: OscillatorType; vol?: number; len?: number; slideTo?: number } = {},
) {
  const audio = audioContext();
  if (!audio) return;
  try {
    const now = audio.currentTime;
    const len = opts.len ?? 0.16;
    for (const [freq, delay] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = opts.type ?? "sine";
      const start = now + delay;
      osc.frequency.setValueAtTime(freq, start);
      if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, start + len);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(opts.vol ?? 0.08, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + len);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + len + 0.02);
    }
  } catch {
    /* ignore */
  }
}

export function scanChime() {
  tones([[880, 0], [1320, 0.09]]);
}
export function scanSuccessFeedback() {
  haptic([12, 40, 18]);
  scanChime();
}
/** Item added to pantry / list. */
export function addedFeedback() {
  haptic(15);
  tones([[523, 0], [659, 0.07], [784, 0.14]], { len: 0.18 });
}
/** Shopping item ticked off. */
export function completeFeedback() {
  haptic([10, 30, 10]);
  tones([[800, 0]], { slideTo: 1300, len: 0.12, vol: 0.07 });
}
/** Recipe saved. */
export function bookmarkFeedback() {
  haptic(20);
  tones([[784, 0], [988, 0.06], [1175, 0.12]], { type: "triangle", len: 0.2 });
}
/** Moved / edited. */
export function tapFeedback() {
  haptic(8);
  tones([[420, 0]], { slideTo: 300, len: 0.08, vol: 0.06, type: "triangle" });
}
/** Removed. */
export function deleteFeedback() {
  haptic(22);
  tones([[440, 0]], { slideTo: 180, len: 0.2, vol: 0.06 });
}
/** Failure / rejected. */
export function errorFeedback() {
  haptic([30, 50, 30]);
  tones([[200, 0], [170, 0.14]], { type: "square", vol: 0.035, len: 0.12 });
}
