import { describe, expect, it } from 'vitest';
import { bosses } from '../src/data/bosses';
import { CHARACTER_ORDER, characters } from '../src/data/characters';
import { enemies } from '../src/data/enemies';
import { weapons } from '../src/data/weapons';
import { vi } from '../src/text/vi';

describe('luật thiết kế (PLAN)', () => {
  it('mọi đòn bắn của địch có cảnh báo ≥ 0.3s và đạn 100–140 px/s', () => {
    for (const e of Object.values(enemies)) {
      if (!e.fire) continue;
      expect(e.fire.telegraph).toBeGreaterThanOrEqual(300);
      expect(e.fire.speed).toBeGreaterThanOrEqual(100);
      expect(e.fire.speed).toBeLessThanOrEqual(140);
    }
  });

  it('mỗi boss có ≥ 1 pattern ở mọi phase, phase giảm dần theo máu', () => {
    for (const b of Object.values(bosses)) {
      expect(b.phases[0].hpBelow).toBe(1);
      for (let i = 0; i < b.phases.length; i++) {
        expect(b.phases[i].patterns.length).toBeGreaterThan(0);
        if (i > 0) expect(b.phases[i].hpBelow).toBeLessThan(b.phases[i - 1].hpBelow);
      }
    }
  });

  it('4 nhân vật, mỗi người một vũ khí khác nhau', () => {
    expect(CHARACTER_ORDER).toHaveLength(4);
    const used = new Set(CHARACTER_ORDER.map((id) => characters[id].weapon));
    expect(used.size).toBe(4);
    for (const w of used) expect(weapons[w]).toBeDefined();
  });

  it('chỉ Ren có kỹ năng lướt', () => {
    expect(CHARACTER_ORDER.filter((id) => characters[id].skill === 'dash')).toEqual(['ren']);
  });

  it('chữ tiếng Việt có dấu và tên nhân vật/vũ khí/boss đều có trong bảng chữ', () => {
    for (const id of CHARACTER_ORDER) {
      expect(vi[characters[id].nameKey]).toBeTruthy();
      expect(vi[characters[id].descKey]).toBeTruthy();
      expect(vi[weapons[characters[id].weapon].nameKey]).toBeTruthy();
    }
    for (const b of Object.values(bosses)) expect(vi[b.nameKey]).toBeTruthy();
    expect(vi['game.title']).toBe('NINJA PHONG ẢNH');
  });
});
