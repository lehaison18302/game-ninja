import type { WeaponDef, WeaponId } from './types';

/** Toàn bộ chỉ số vũ khí – cân bằng tại đây, không sửa code lõi. Tốc độ: px/s. */
export const weapons: Record<WeaponId, WeaponDef> = {
  shuriken: {
    id: 'shuriken',
    nameKey: 'weapon.shuriken',
    mode: 'auto',
    behavior: 'straight',
    pierce: false,
    range: 320, // 2/3 tầm cung
    sprite: 'p-shuriken',
    levels: [
      { damage: 1, speed: 360, cooldown: 0.12, count: 1, spread: 0 },
      { damage: 1, speed: 360, cooldown: 0.12, count: 3, spread: 15 },
      { damage: 1, speed: 380, cooldown: 0.1, count: 5, spread: 12 },
    ],
  },
  tessen: {
    id: 'tessen',
    nameKey: 'weapon.tessen',
    mode: 'auto',
    behavior: 'wind',
    pierce: true,
    range: 240, // 1/2 tầm cung
    sprite: 'p-wind',
    knockback: 60,
    blocksBullets: true,
    levels: [
      { damage: 2, speed: 200, cooldown: 0.5, count: 1, spread: 0, grow: 2 },
      { damage: 2, speed: 200, cooldown: 0.5, count: 1, spread: 0, grow: 2.8 },
      { damage: 2, speed: 200, cooldown: 0.5, count: 2, spread: 0, grow: 2.8, weave: 10 },
    ],
  },
  yumi: {
    id: 'yumi',
    nameKey: 'weapon.yumi',
    mode: 'charge',
    behavior: 'arrow',
    pierce: false,
    range: 480, // hết chiều dài màn hình
    sprite: 'p-arrow',
    charge: {
      ms: [800, 800, 400],
      damageMul: 3,
      speedMul: 1.15,
      moveMul: 0.5,
      splitAtLevel: 2,
    },
    levels: [
      { damage: 2, speed: 420, cooldown: 0.4, count: 1, spread: 0 },
      { damage: 2, speed: 420, cooldown: 0.4, count: 1, spread: 0 },
      { damage: 2, speed: 440, cooldown: 0.35, count: 1, spread: 0 },
    ],
  },
  tanto: {
    id: 'tanto',
    nameKey: 'weapon.tanto',
    mode: 'melee',
    behavior: 'kunai',
    pierce: false,
    range: 240, // 1/2 tầm cung
    sprite: 'p-kunai',
    melee: {
      range: 40,
      damage: [6, 7, 8],
      cooldown: 0.25,
      explodeAtLevel: 2,
      waveAtLevel: 3,
    },
    levels: [
      { damage: 1, speed: 240, cooldown: 0.2, count: 1, spread: 0 },
      { damage: 1, speed: 240, cooldown: 0.2, count: 1, spread: 0 },
      { damage: 1, speed: 260, cooldown: 0.18, count: 1, spread: 0 },
    ],
  },
};
