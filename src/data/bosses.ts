import type { BossDef, BossId } from './types';

/** Boss: nhiều pattern rời rạc, chuyển phase theo % máu (100% → 60% → 30%). */
export const bosses: Record<BossId, BossDef> = {
  // Màn 1: tượng gỗ khổng lồ – ném đá, phun lửa, đập đất
  datou: {
    id: 'datou',
    nameKey: 'boss.stage1',
    hp: 90,
    texture: 'boss-datou',
    w: 44,
    h: 84,
    score: 2000,
    cooldownMs: 1100,
    phases: [
      {
        hpBelow: 1,
        cooldownMul: 1,
        patterns: [
          { id: 'throwRocks', weight: 2 },
          { id: 'fireBreath', weight: 1 },
        ],
      },
      {
        hpBelow: 0.6,
        cooldownMul: 0.85,
        patterns: [
          { id: 'throwRocks', weight: 1 },
          { id: 'fireBreath', weight: 1 },
          { id: 'slam', weight: 1 },
        ],
      },
      {
        hpBelow: 0.3,
        cooldownMul: 0.6,
        patterns: [
          { id: 'throwRocks', weight: 1 },
          { id: 'fireBreath', weight: 1 },
          { id: 'slam', weight: 2 },
        ],
      },
    ],
  },

  // Màn 2: thuyền chiến đầu rồng – đại bác, rồng phun lửa, húc, sóng lớn
  longthuyen: {
    id: 'longthuyen',
    nameKey: 'boss.stage2',
    hp: 130,
    texture: 'boss-longthuyen',
    w: 96,
    h: 56,
    score: 3000,
    cooldownMs: 1100,
    phases: [
      {
        hpBelow: 1,
        cooldownMul: 1,
        patterns: [
          { id: 'cannonVolley', weight: 2 },
          { id: 'dragonSpit', weight: 1 },
        ],
      },
      {
        hpBelow: 0.6,
        cooldownMul: 0.85,
        patterns: [
          { id: 'cannonVolley', weight: 1 },
          { id: 'dragonSpit', weight: 1 },
          { id: 'ramCharge', weight: 1 },
        ],
      },
      {
        hpBelow: 0.3,
        cooldownMul: 0.65,
        patterns: [
          { id: 'cannonVolley', weight: 1 },
          { id: 'dragonSpit', weight: 1 },
          { id: 'ramCharge', weight: 1 },
          { id: 'slam', weight: 1 },
        ],
      },
    ],
  },

  // Màn 3: Tướng Quân Bóng Tối – 3 phase, phân thân
  tuongquan: {
    id: 'tuongquan',
    nameKey: 'boss.stage3',
    hp: 170,
    texture: 'boss-tuongquan',
    w: 28,
    h: 70,
    score: 5000,
    cooldownMs: 1000,
    phases: [
      {
        hpBelow: 1,
        cooldownMul: 1,
        patterns: [
          { id: 'shurikenFan', weight: 2 },
          { id: 'shadowDash', weight: 1 },
        ],
      },
      {
        hpBelow: 0.6,
        cooldownMul: 0.8,
        patterns: [
          { id: 'shurikenFan', weight: 1 },
          { id: 'shadowDash', weight: 1 },
          { id: 'summonClones', weight: 1 },
          { id: 'darkRain', weight: 1 },
        ],
      },
      {
        hpBelow: 0.3,
        cooldownMul: 0.55,
        patterns: [
          { id: 'shurikenFan', weight: 1 },
          { id: 'shadowDash', weight: 2 },
          { id: 'summonClones', weight: 1 },
          { id: 'darkRain', weight: 2 },
        ],
      },
    ],
  },
};
