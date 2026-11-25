import type { CharacterDef, CharacterId } from './types';

export const CHARACTER_ORDER: CharacterId[] = ['kage', 'fuuka', 'hayate', 'ren'];

export const characters: Record<CharacterId, CharacterDef> = {
  kage: {
    id: 'kage',
    nameKey: 'char.kage',
    descKey: 'char.kage.desc',
    weapon: 'shuriken',
    color: 0x3a8dff,
    skill: 'shurikenStorm',
    stats: { range: 4, damage: 2, speed: 5, pierce: false },
  },
  fuuka: {
    id: 'fuuka',
    nameKey: 'char.fuuka',
    descKey: 'char.fuuka.desc',
    weapon: 'tessen',
    color: 0xff7fa8,
    skill: 'whirlwind',
    stats: { range: 3, damage: 3, speed: 2, pierce: true },
  },
  hayate: {
    id: 'hayate',
    nameKey: 'char.hayate',
    descKey: 'char.hayate.desc',
    weapon: 'yumi',
    color: 0x4ccf5a,
    skill: 'arrowRain',
    stats: { range: 5, damage: 4, speed: 2, pierce: true },
  },
  ren: {
    id: 'ren',
    nameKey: 'char.ren',
    descKey: 'char.ren.desc',
    weapon: 'tanto',
    color: 0xe0382a,
    skill: 'shadowDash',
    stats: { range: 1, damage: 5, speed: 4, pierce: false },
  },
};
