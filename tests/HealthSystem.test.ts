import { describe, expect, it } from 'vitest';
import { PLAYER } from '../src/constants';
import { applyHeal, applyHit, type Vitals } from '../src/core/rules';

const fresh = (): Vitals => ({ hearts: PLAYER.hearts, lives: PLAYER.lives, shield: false });

describe('tim và mạng', () => {
  it('trúng đòn mất 1 tim', () => {
    const v = fresh();
    expect(applyHit(v)).toBe('hurt');
    expect(v.hearts).toBe(PLAYER.hearts - 1);
    expect(v.lives).toBe(PLAYER.lives);
  });

  it('hết 3 tim thì mất 1 mạng', () => {
    const v = fresh();
    applyHit(v);
    applyHit(v);
    expect(applyHit(v)).toBe('lifeLost');
    expect(v.hearts).toBe(0);
    expect(v.lives).toBe(PLAYER.lives - 1);
  });

  it('hết mạng cuối thì thua cuộc', () => {
    const v: Vitals = { hearts: 1, lives: 1, shield: false };
    expect(applyHit(v)).toBe('gameOver');
    expect(v.lives).toBe(0);
  });

  it('khiên chặn đúng 1 đòn, không mất tim', () => {
    const v = { ...fresh(), shield: true };
    expect(applyHit(v)).toBe('absorbed');
    expect(v.hearts).toBe(PLAYER.hearts);
    expect(v.shield).toBe(false);
    expect(applyHit(v)).toBe('hurt');
  });

  it('rơi vực bỏ qua khiên', () => {
    const v = { ...fresh(), shield: true };
    expect(applyHit(v, true)).toBe('hurt');
    expect(v.hearts).toBe(PLAYER.hearts - 1);
    expect(v.shield).toBe(true);
  });

  it('cơm nắm không hồi quá 3 tim', () => {
    const v = fresh();
    expect(applyHeal(v, PLAYER.hearts)).toBe(false);
    v.hearts = 1;
    expect(applyHeal(v, PLAYER.hearts)).toBe(true);
    expect(applyHeal(v, PLAYER.hearts)).toBe(true);
    expect(applyHeal(v, PLAYER.hearts)).toBe(false);
    expect(v.hearts).toBe(PLAYER.hearts);
  });

  it('thông số khởi điểm: 3 tim, 3 mạng', () => {
    expect(PLAYER.hearts).toBe(3);
    expect(PLAYER.lives).toBe(3);
  });
});
