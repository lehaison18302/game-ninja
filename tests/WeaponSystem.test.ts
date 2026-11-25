import { describe, expect, it } from 'vitest';
import {
  chargeRatio,
  downgradeLevel,
  effectiveDamage,
  fanAngle,
  MAX_WEAPON_LEVEL,
  upgradeLevel,
} from '../src/core/rules';
import { weapons } from '../src/data/weapons';

describe('quạt đạn', () => {
  it('1 tia bắn thẳng theo hướng ngắm', () => {
    expect(fanAngle(1, 0, 1, 15)).toBeCloseTo(1);
  });

  it('3 tia đối xứng quanh hướng ngắm, cách nhau đúng góc tỏa', () => {
    const d = (15 * Math.PI) / 180;
    expect(fanAngle(0, 0, 3, 15)).toBeCloseTo(-d);
    expect(fanAngle(0, 1, 3, 15)).toBeCloseTo(0);
    expect(fanAngle(0, 2, 3, 15)).toBeCloseTo(d);
  });

  it('5 tia: tia đầu và cuối đối xứng', () => {
    expect(fanAngle(0, 0, 5, 12) + fanAngle(0, 4, 5, 12)).toBeCloseTo(0);
  });
});

describe('sát thương', () => {
  it('mục tiêu có giáp chỉ nhận một nửa từ đòn thường', () => {
    expect(effectiveDamage(2, true, false, 'straight')).toBe(1);
  });

  it('tên gồng, chém và nổ xuyên giáp', () => {
    expect(effectiveDamage(6, true, true, 'arrow')).toBe(6);
    expect(effectiveDamage(6, true, false, 'slash')).toBe(6);
    expect(effectiveDamage(2, true, false, 'blast')).toBe(2);
  });

  it('không giáp thì nhận đủ', () => {
    expect(effectiveDamage(2, false, false, 'straight')).toBe(2);
  });
});

describe('cấp vũ khí', () => {
  it('tăng tối đa tới cấp 3, giảm tối thiểu cấp 1', () => {
    expect(upgradeLevel(1)).toBe(2);
    expect(upgradeLevel(MAX_WEAPON_LEVEL)).toBe(MAX_WEAPON_LEVEL);
    expect(downgradeLevel(2)).toBe(1);
    expect(downgradeLevel(1)).toBe(1);
  });
});

describe('gồng cung', () => {
  it('tỉ lệ gồng nằm trong 0..1', () => {
    expect(chargeRatio(-10, 800)).toBe(0);
    expect(chargeRatio(400, 800)).toBe(0.5);
    expect(chargeRatio(5000, 800)).toBe(1);
  });

  it('Lv3 gồng nhanh gấp đôi', () => {
    const ms = weapons.yumi.charge?.ms;
    expect(ms?.[2]).toBe((ms?.[0] ?? 0) / 2);
  });
});

describe('dữ liệu vũ khí', () => {
  it('số tia tăng theo cấp với Phi tiêu: 1 → 3 → 5', () => {
    expect(weapons.shuriken.levels.map((l) => l.count)).toEqual([1, 3, 5]);
  });

  it('Quạt chiến xuyên mục tiêu và chặn đạn; Lv3 có 2 luồng', () => {
    expect(weapons.tessen.pierce).toBe(true);
    expect(weapons.tessen.blocksBullets).toBe(true);
    expect(weapons.tessen.levels[2].count).toBe(2);
  });

  it('mọi vũ khí có cooldown và sát thương dương', () => {
    for (const w of Object.values(weapons)) {
      for (const l of w.levels) {
        expect(l.cooldown).toBeGreaterThan(0);
        expect(l.damage).toBeGreaterThan(0);
      }
    }
  });
});
