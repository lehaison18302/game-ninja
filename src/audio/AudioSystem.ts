import Phaser from 'phaser';
import { renderSfx, renderTrack, SAMPLE_RATE, type SfxDef, type TrackDef } from './synth';

export type SfxKey =
  | 'jump'
  | 'shuriken'
  | 'wind'
  | 'arrow'
  | 'arrowCharged'
  | 'kunai'
  | 'slash'
  | 'dash'
  | 'hit'
  | 'explode'
  | 'hurt'
  | 'die'
  | 'pickup'
  | 'shield'
  | 'smoke'
  | 'warning'
  | 'bossDie'
  | 'select'
  | 'clear'
  | 'gameover'
  | 'charge';

export type MusicKey = 'title' | 'stage1' | 'stage2' | 'stage3' | 'boss';

const SFX: Record<SfxKey, SfxDef> = {
  jump: { wave: 'square', f0: 280, f1: 620, dur: 0.14, vol: 0.18, duty: 0.25 },
  shuriken: { wave: 'square', f0: 900, f1: 420, dur: 0.07, vol: 0.14, duty: 0.125 },
  wind: { wave: 'noise', f0: 500, f1: 180, dur: 0.22, vol: 0.2 },
  arrow: { wave: 'saw', f0: 700, f1: 260, dur: 0.12, vol: 0.16 },
  arrowCharged: { wave: 'saw', f0: 1400, f1: 180, dur: 0.3, vol: 0.24 },
  kunai: { wave: 'square', f0: 760, f1: 360, dur: 0.08, vol: 0.14, duty: 0.25 },
  slash: { wave: 'noise', f0: 2400, f1: 500, dur: 0.14, vol: 0.28 },
  dash: { wave: 'noise', f0: 900, f1: 200, dur: 0.16, vol: 0.2 },
  hit: { wave: 'square', f0: 340, f1: 150, dur: 0.07, vol: 0.14, duty: 0.5 },
  explode: { wave: 'noise', f0: 260, f1: 40, dur: 0.32, vol: 0.34 },
  hurt: { wave: 'saw', f0: 420, f1: 80, dur: 0.3, vol: 0.28 },
  die: { wave: 'square', f0: 520, f1: 50, dur: 0.7, vol: 0.28, duty: 0.5, vib: [18, 0.05] },
  pickup: { wave: 'square', f0: 620, f1: 1500, dur: 0.18, vol: 0.18, duty: 0.25 },
  shield: { wave: 'sine', f0: 400, f1: 1200, dur: 0.26, vol: 0.28 },
  smoke: { wave: 'noise', f0: 700, f1: 90, dur: 0.5, vol: 0.34 },
  warning: { wave: 'square', f0: 330, f1: 330, dur: 0.5, vol: 0.2, duty: 0.5, vib: [8, 0.5] },
  bossDie: { wave: 'noise', f0: 220, f1: 25, dur: 1.1, vol: 0.42 },
  select: { wave: 'square', f0: 520, f1: 780, dur: 0.07, vol: 0.14, duty: 0.5 },
  clear: { wave: 'square', f0: 440, f1: 1320, dur: 0.7, vol: 0.2, duty: 0.25, vib: [10, 0.03] },
  gameover: { wave: 'tri', f0: 330, f1: 55, dur: 1.2, vol: 0.34 },
  charge: { wave: 'sine', f0: 200, f1: 900, dur: 0.5, vol: 0.14 },
};

const A_MINOR_PENT = [0, 3, 5, 7, 10, 12, 15];
const MUSIC: Record<MusicKey, TrackDef> = {
  title: {
    bpm: 84,
    root: 110,
    scale: A_MINOR_PENT,
    bars: 8,
    seed: 11,
    rest: 0.55,
    duty: 0.5,
    drums: false,
  },
  stage1: {
    bpm: 128,
    root: 110,
    scale: A_MINOR_PENT,
    bars: 8,
    seed: 21,
    rest: 0.4,
    duty: 0.25,
    drums: true,
  },
  stage2: {
    bpm: 116,
    root: 123.5,
    scale: [0, 2, 3, 7, 8, 12, 14],
    bars: 8,
    seed: 33,
    rest: 0.45,
    duty: 0.125,
    drums: true,
  },
  stage3: {
    bpm: 140,
    root: 98,
    scale: [0, 1, 4, 5, 7, 8, 12],
    bars: 8,
    seed: 47,
    rest: 0.35,
    duty: 0.25,
    drums: true,
  },
  boss: {
    bpm: 156,
    root: 82.4,
    scale: [0, 3, 5, 6, 7, 10, 12],
    bars: 8,
    seed: 59,
    rest: 0.25,
    duty: 0.125,
    drums: true,
  },
};

const MIN_GAP_MS = 45;
const MUSIC_VOL = 0.4;
const SFX_VOL = 0.7;

/** Phát SFX/nhạc. Âm thanh được tổng hợp sẵn lúc khởi động (xem synth.ts); bật/tắt qua game.sound.mute. */
class AudioSystem {
  private game: Phaser.Game | null = null;
  private ready = false;
  private last = new Map<string, number>();
  private current: Phaser.Sound.BaseSound | null = null;
  private currentKey: MusicKey | null = null;

  /** Gọi một lần ở BootScene, trước khi cần phát âm. */
  init(game: Phaser.Game): void {
    if (this.ready) return;
    this.game = game;
    const mgr = game.sound;
    if (!(mgr instanceof Phaser.Sound.WebAudioSoundManager)) return; // HTML5 Audio: bỏ qua
    const ctx = mgr.context;
    const add = (key: string, data: Float32Array): void => {
      const buf = ctx.createBuffer(1, data.length, SAMPLE_RATE);
      buf.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      game.cache.audio.add(key, buf);
    };
    for (const [k, def] of Object.entries(SFX)) add(`sfx-${k}`, renderSfx(def));
    for (const [k, def] of Object.entries(MUSIC)) add(`music-${k}`, renderTrack(def));
    this.ready = true;
  }

  sfx(key: SfxKey): void {
    if (!this.ready || !this.game) return;
    const now = performance.now();
    if (now - (this.last.get(key) ?? 0) < MIN_GAP_MS) return;
    this.last.set(key, now);
    this.game.sound.play(`sfx-${key}`, { volume: SFX_VOL });
  }

  music(key: MusicKey | null): void {
    if (!this.ready || !this.game || key === this.currentKey) return;
    this.current?.stop();
    this.current?.destroy();
    this.current = null;
    this.currentKey = key;
    if (key === null) return;
    this.current = this.game.sound.add(`music-${key}`, { loop: true, volume: MUSIC_VOL });
    this.current.play();
  }
}

export const audio = new AudioSystem();
