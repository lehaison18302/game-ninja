import { describe, expect, it } from 'vitest';
import { attackAnimMs, ninjaAnimKey } from '../src/core/ninjaAnims';
import { CHARACTER_ORDER } from '../src/data/characters';
import { NINJA_SPRITES } from '../src/data/ninjaSprites';

describe('sprite ninja', () => {
  it('ninja nào cũng có đủ động tác cơ bản', () => {
    for (const id of CHARACTER_ORDER) {
      const a = NINJA_SPRITES[id].anims;
      for (const name of ['idle', 'run', 'jump', 'fall', 'crouch', 'attack'] as const) {
        expect(a[name]?.length, `${id}.${name}`).toBeGreaterThan(0);
      }
    }
  });

  it('thiếu động tác thì mượn động tác gần nhất', () => {
    expect(ninjaAnimKey('hayate', 'aim')).toBe('hayate-aim');
    expect(ninjaAnimKey('kage', 'aim')).toBe('kage-attack');
    expect(ninjaAnimKey('kage', 'dash')).toBe('kage-run');
    expect(ninjaAnimKey('ren', 'dash')).toBe('ren-dash');
  });

  it('tư thế ra đòn giữ đủ lâu để nhìn thấy nhưng không quá nửa giây', () => {
    for (const id of CHARACTER_ORDER) {
      expect(attackAnimMs(id)).toBeGreaterThan(100);
      expect(attackAnimMs(id)).toBeLessThan(500);
    }
  });
});
