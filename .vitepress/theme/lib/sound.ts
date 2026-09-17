// Âm báo đúng/sai cho chế độ làm từng câu. Tự tổng hợp bằng Web Audio API
// (không phải file audio) nên không cần tải asset và không dính bản quyền.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  start: number;
  dur: number;
  type?: OscillatorType;
  peak?: number;
  glide?: number | null;
  attack?: number;
}

function tone(c: AudioContext, {freq, start, dur, type = "sine", peak = 0.3, glide = null, attack = 0.005}: ToneOpts) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noiseBurst(c: AudioContext, {start, dur, peak = 0.2, lp = 1200}: {start: number; dur: number; peak?: number; lp?: number}) {
  const bufSize = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = lp;
  const gain = c.createGain();
  gain.gain.setValueAtTime(peak, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filt).connect(gain).connect(c.destination);
  src.start(start);
}

interface VibratoOpts extends ToneOpts {
  vibratoRate?: number;
  vibratoDepth?: number;
}

function vibratoTone(c: AudioContext, {freq, start, dur, type = "triangle", peak = 0.3, glide = null, attack = 0.02, vibratoRate = 6, vibratoDepth = 10}: VibratoOpts) {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, start + dur);
  const lfo = c.createOscillator();
  lfo.frequency.value = vibratoRate;
  const lfoGain = c.createGain();
  lfoGain.gain.value = vibratoDepth;
  lfo.connect(lfoGain).connect(osc.frequency);
  lfo.start(start);
  lfo.stop(start + dur + 0.05);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0001), start + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

// "Túi thần kỳ": tiếng bụp rồi lấp lánh bay lên, như lấy bảo bối ra khỏi túi.
function playCorrect(gain: number) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  tone(c, {freq: 300, start: t, dur: 0.07, type: "square", peak: gain * 0.25, glide: 700});
  tone(c, {freq: 700, start: t + 0.05, dur: 0.5, type: "sine", peak: gain * 0.22, glide: 2200});
  tone(c, {freq: 1400, start: t + 0.08, dur: 0.45, type: "sine", peak: gain * 0.14, glide: 3100});
  tone(c, {freq: 2100, start: t + 0.1, dur: 0.4, type: "sine", peak: gain * 0.08, glide: 4000});
}

// "Bảo bối lỗi": rung lắc rồi xì khói, kiểu bảo bối phản tác dụng.
function playWrong(gain: number) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  vibratoTone(c, {freq: 900, start: t, dur: 0.35, type: "sawtooth", peak: gain * 0.26, glide: 120, vibratoRate: 20, vibratoDepth: 60, attack: 0.01});
  noiseBurst(c, {start: t + 0.32, dur: 0.2, peak: gain * 0.3, lp: 400});
}

const CORRECT_LINES = [
  "Đúng là thiên tài!",
  "Chuẩn không cần chỉnh!",
  "Giỏi quá đi mất!",
  "Trúng phóc!",
  "Não to thật đấy!"
];
const WRONG_LINES = [
  "Ấy chết, sai rồi!",
  "Suýt nữa thì đúng... suýt thôi!",
  "Bảo bối lỗi mất rồi!",
  "Thử lại xem nào!",
  "Hụt một chút xíu!"
];

function pick(list: string[]) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Phát âm báo và trả về một câu thoại vui nhộn ngẫu nhiên tương ứng. */
export function playResult(correct: boolean, gain = 0.5): string {
  if (correct) {
    playCorrect(gain);
    return pick(CORRECT_LINES);
  }
  playWrong(gain);
  return pick(WRONG_LINES);
}
