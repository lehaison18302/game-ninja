import type Phaser from 'phaser';
import { RENDER_SCALE } from '../constants';
import { CHARACTER_ORDER } from '../data/characters';
import { NINJA_SPRITES, type NinjaAnim } from '../data/ninjaSprites';
import type { CharacterId } from '../data/types';

/** Khung vẽ ở độ phân giải gấp RENDER_SCALE → hiển thị thu lại để 1 pixel ảnh = 1 pixel canvas. */
export const NINJA_SCALE = 1 / RENDER_SCALE;

/** Tốc độ (khung/giây) và lặp (-1 = lặp mãi, 0 = phát một lần rồi giữ khung cuối). */
const ANIM_CFG: Record<NinjaAnim, { fps: number; repeat: number }> = {
  idle: { fps: 8, repeat: -1 },
  run: { fps: 0, repeat: -1 }, // tính theo số khung: một vòng chạy ~0,55 s
  jump: { fps: 8, repeat: 0 },
  fall: { fps: 6, repeat: 0 },
  crouch: { fps: 1, repeat: 0 },
  attack: { fps: 16, repeat: 0 },
  aim: { fps: 10, repeat: 0 },
  dash: { fps: 20, repeat: 0 },
};
const RUN_CYCLE_S = 0.55;

/** Động tác không có khung riêng thì mượn động tác này. */
const FALLBACK: Record<NinjaAnim, NinjaAnim> = {
  idle: 'idle',
  run: 'idle',
  jump: 'fall',
  fall: 'idle',
  crouch: 'idle',
  attack: 'idle',
  aim: 'attack',
  dash: 'run',
};

export const ninjaTexture = (id: CharacterId): string => `ninja-${id}`;

/** Khoá animation thật sự phát cho động tác `anim` của ninja `id` (đã xét động tác thay thế). */
export function ninjaAnimKey(id: CharacterId, anim: NinjaAnim): string {
  const anims = NINJA_SPRITES[id].anims;
  let a = anim;
  for (let i = 0; i < 4 && !anims[a]; i++) a = FALLBACK[a];
  return `${id}-${a}`;
}

/** Thời gian phát hết động tác tấn công (ms) – để giữ tư thế ra đòn đủ lâu. */
export function attackAnimMs(id: CharacterId): number {
  const n = NINJA_SPRITES[id].anims.attack?.length ?? 1;
  return (n / ANIM_CFG.attack.fps) * 1000 + 60;
}

export function preloadNinjas(load: Phaser.Loader.LoaderPlugin): void {
  for (const id of CHARACTER_ORDER) {
    const s = NINJA_SPRITES[id];
    load.spritesheet(ninjaTexture(id), `sprites/ninja-${id}.png`, {
      frameWidth: s.frameWidth,
      frameHeight: s.frameHeight,
    });
  }
}

export function createNinjaAnims(anims: Phaser.Animations.AnimationManager): void {
  for (const id of CHARACTER_ORDER) {
    const tex = ninjaTexture(id);
    for (const [name, frames] of Object.entries(NINJA_SPRITES[id].anims)) {
      const key = `${id}-${name}`;
      if (!frames || anims.exists(key)) continue;
      const cfg = ANIM_CFG[name as NinjaAnim];
      anims.create({
        key,
        frames: frames.map((frame) => ({ key: tex, frame })),
        frameRate: name === 'run' ? frames.length / RUN_CYCLE_S : cfg.fps,
        repeat: cfg.repeat,
      });
    }
  }
}
