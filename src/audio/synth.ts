/** Tổng hợp âm thanh retro (kiểu sfxr/BeepBox) thành AudioBuffer ngay khi khởi động – không cần file âm thanh. */

export type Wave = 'square' | 'saw' | 'sine' | 'tri' | 'noise';

export interface SfxDef {
  wave: Wave;
  /** Tần số đầu/cuối (Hz); trượt theo hàm mũ. */
  f0: number;
  f1: number;
  /** Giây. */
  dur: number;
  vol: number;
  /** Độ rộng xung vuông (0–1). */
  duty?: number;
  /** Rung tần (Hz, độ sâu). */
  vib?: [number, number];
}

export const SAMPLE_RATE = 22050;

function osc(wave: Wave, phase: number, duty: number, noise: number): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'square':
      return p < duty ? 1 : -1;
    case 'saw':
      return 2 * p - 1;
    case 'tri':
      return 4 * Math.abs(p - 0.5) - 1;
    case 'sine':
      return Math.sin(p * Math.PI * 2);
    default:
      return noise;
  }
}

/** Sinh mẫu cho một hiệu ứng âm thanh. */
export function renderSfx(d: SfxDef): Float32Array {
  const n = Math.max(1, Math.floor(d.dur * SAMPLE_RATE));
  const out = new Float32Array(n);
  let phase = 0;
  let noise = 0;
  let seed = 12345;
  for (let i = 0; i < n; i++) {
    const k = i / n;
    let f = d.f0 * Math.pow(d.f1 / d.f0, k);
    if (d.vib) f *= 1 + d.vib[1] * Math.sin((i / SAMPLE_RATE) * d.vib[0] * Math.PI * 2);
    phase += f / SAMPLE_RATE;
    // nhiễu trắng giữ mẫu theo tần số để có âm sắc
    if (d.wave === 'noise' && Math.floor(phase) !== Math.floor(phase - f / SAMPLE_RATE)) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      noise = seed / 0x3fffffff - 1;
    }
    const env = Math.min(1, i / 60) * Math.pow(1 - k, 1.6);
    out[i] = osc(d.wave, phase, d.duty ?? 0.5, noise) * env * d.vol;
  }
  return out;
}

// ---------------------------------------------------------------- nhạc

export interface TrackDef {
  bpm: number;
  /** Nốt gốc (Hz). */
  root: number;
  /** Thang âm: số bán cung so với nốt gốc. */
  scale: number[];
  bars: number;
  seed: number;
  /** Tỉ lệ nốt lead vắng mặt (0–1) – càng cao càng thưa. */
  rest: number;
  /** Kèn lead dùng xung vuông hẹp (nghe gắt hơn). */
  duty: number;
  drums: boolean;
}

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const semitone = (root: number, st: number): number => root * Math.pow(2, st / 12);

/** Sinh một đoạn nhạc lặp (lead + bass + trống) từ luật đơn giản, có điệp khúc A A B A. */
export function renderTrack(d: TrackDef): Float32Array {
  const stepSec = 60 / d.bpm / 4; // móc kép
  const stepN = Math.floor(stepSec * SAMPLE_RATE);
  const totalSteps = d.bars * 16;
  const out = new Float32Array(totalSteps * stepN);
  const rand = rng(d.seed);

  // 2 ô nhịp motif A và 2 ô nhịp motif B (mỗi ô 16 bước): chỉ số vào thang âm, -1 = nghỉ
  const motif = (): number[] =>
    Array.from({ length: 32 }, (_, i) =>
      i % 4 === 0 || rand() > d.rest ? Math.floor(rand() * d.scale.length) : -1,
    );
  const A = motif();
  const B = motif();
  const bassRoots = [0, 0, d.scale[2] ?? 3, d.scale[4] ?? 7];

  const lead = (step: number): number => {
    const phraseBar = Math.floor(step / 32) % 4; // A A B A
    const m = phraseBar === 2 ? B : A;
    return m[step % 32];
  };

  let leadPhase = 0;
  let bassPhase = 0;
  let nseed = 777;
  for (let step = 0; step < totalSteps; step++) {
    const li = lead(step);
    const leadF = li >= 0 ? semitone(d.root * 2, d.scale[li]) : 0;
    const bar = Math.floor(step / 16);
    const bassF = semitone(d.root / 2, bassRoots[bar % 4]);
    const beat = step % 4;
    for (let i = 0; i < stepN; i++) {
      const k = i / stepN;
      const o = step * stepN + i;
      let v = 0;
      if (leadF > 0) {
        leadPhase += leadF / SAMPLE_RATE;
        v += osc('square', leadPhase, d.duty, 0) * 0.16 * Math.pow(1 - k, 0.7);
      }
      if (beat !== 3 || step % 8 === 3) {
        bassPhase += bassF / SAMPLE_RATE;
        v += osc('tri', bassPhase, 0.5, 0) * 0.3;
      }
      if (d.drums) {
        nseed = (nseed * 1103515245 + 12345) & 0x7fffffff;
        const n = nseed / 0x3fffffff - 1;
        if (beat === 0 && step % 8 === 0)
          v += n * 0.18 * Math.pow(1 - k, 3) + Math.sin(2 * Math.PI * 60 * (1 - k) * k) * 0.25;
        else if (step % 8 === 4) v += n * 0.16 * Math.pow(1 - k, 4);
        else if (beat % 2 === 1) v += n * 0.05 * Math.pow(1 - k, 6);
      }
      out[o] = v;
    }
  }
  return out;
}
