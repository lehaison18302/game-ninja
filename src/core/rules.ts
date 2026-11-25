/** Luật chơi thuần (không phụ thuộc Phaser) → kiểm thử được bằng Vitest. */

export const MAX_WEAPON_LEVEL = 3;
export const ARMOR_FACTOR = 0.5;
const DEG = Math.PI / 180;

/** Góc (radian) của tia thứ `i` trong loạt `count` tia cách nhau `spreadDeg`, đối xứng quanh `base`. */
export function fanAngle(base: number, i: number, count: number, spreadDeg: number): number {
  return base + (i - (count - 1) / 2) * spreadDeg * DEG;
}

/** Tên đòn bỏ qua giáp. */
const IGNORES_ARMOR = new Set(['slash', 'blast']);

/** Sát thương thực tế lên mục tiêu: có giáp thì giảm một nửa, trừ tên gồng, chém và nổ. */
export function effectiveDamage(
  base: number,
  armored: boolean,
  charged: boolean,
  behavior: string,
): number {
  if (armored && !charged && !IGNORES_ARMOR.has(behavior)) return base * ARMOR_FACTOR;
  return base;
}

/** Tăng cấp vũ khí; trả về cấp mới (tối đa MAX_WEAPON_LEVEL). */
export function upgradeLevel(level: number): number {
  return Math.min(MAX_WEAPON_LEVEL, level + 1);
}

/** Mất mạng thì vũ khí giảm 1 cấp (tối thiểu 1). */
export function downgradeLevel(level: number): number {
  return Math.max(1, level - 1);
}

/** 0..1 mức gồng của cung. */
export function chargeRatio(heldMs: number, fullMs: number): number {
  return Math.min(1, Math.max(0, heldMs / fullMs));
}

export interface Vitals {
  hearts: number;
  lives: number;
  shield: boolean;
}

export type HitOutcome = 'absorbed' | 'hurt' | 'lifeLost' | 'gameOver';

/**
 * Áp một đòn lên người chơi (sửa trực tiếp `v`).
 * Khiên chặn đúng 1 đòn (không mất tim); hết 3 tim thì mất 1 mạng; hết mạng thì thua.
 */
export function applyHit(v: Vitals, ignoreShield = false): HitOutcome {
  if (v.shield && !ignoreShield) {
    v.shield = false;
    return 'absorbed';
  }
  v.hearts = Math.max(0, v.hearts - 1);
  if (v.hearts > 0) return 'hurt';
  v.lives = Math.max(0, v.lives - 1);
  return v.lives > 0 ? 'lifeLost' : 'gameOver';
}

/** Hồi 1 tim (tối đa `max`). Trả về false nếu đã đầy. */
export function applyHeal(v: Vitals, max: number): boolean {
  if (v.hearts >= max) return false;
  v.hearts++;
  return true;
}
