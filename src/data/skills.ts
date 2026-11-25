import type { SkillDef, SkillId } from './types';

/** Mỗi chiêu: phần chung (SkillDef, `id` trùng khoá) + thông số riêng của chiêu đó. */
type SkillTable = { [K in SkillId]: SkillDef & { id: K } & Record<string, unknown> };

/**
 * Chiêu riêng của từng ninja (nút C / phím L) – cân bằng tại đây, không sửa code lõi.
 * Thời gian: ms, tốc độ: px/s, khoảng cách: px.
 */
export const skills = {
  /** Kage: tung hai vòng phi tiêu ra mọi hướng, phi tiêu phá được đạn địch. */
  shurikenStorm: {
    id: 'shurikenStorm',
    nameKey: 'skill.shurikenStorm',
    descKey: 'skill.shurikenStorm.desc',
    cooldownMs: 6000,
    count: 16,
    waves: 2,
    waveGapMs: 110,
    damage: 2,
    speed: 300,
    range: 200,
  },
  /** Fuuka: thổi tan đạn quanh mình rồi tạo lốc xoáy trôi chậm về phía trước, đánh nhiều lần. */
  whirlwind: {
    id: 'whirlwind',
    nameKey: 'skill.whirlwind',
    descKey: 'skill.whirlwind.desc',
    cooldownMs: 7000,
    clearRadius: 90,
    damage: 2,
    /** Lốc gây sát thương lại lên cùng mục tiêu sau mỗi khoảng này. */
    tickMs: 250,
    speed: 60,
    durationMs: 2400,
    knockback: 90,
  },
  /** Hayate: trút mưa tên xuyên giáp xuống vùng phía trước mặt. */
  arrowRain: {
    id: 'arrowRain',
    nameKey: 'skill.arrowRain',
    descKey: 'skill.arrowRain.desc',
    cooldownMs: 6500,
    count: 14,
    durationMs: 650,
    damage: 3,
    speed: 480,
    /** Vùng mưa: từ `near` tới `far` px phía trước mặt. */
    near: 30,
    far: 250,
  },
  /** Ren: lướt chém xuyên qua địch, bất tử khi lướt, đường chém phản đạn. */
  shadowDash: {
    id: 'shadowDash',
    nameKey: 'skill.shadowDash',
    descKey: 'skill.shadowDash.desc',
    cooldownMs: 800,
    damage: 4,
  },
} as const satisfies SkillTable;
