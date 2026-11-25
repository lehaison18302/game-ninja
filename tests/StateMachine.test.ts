import { describe, expect, it } from 'vitest';
import { StateMachine } from '../src/core/StateMachine';

type S = 'a' | 'b';

describe('StateMachine', () => {
  it('gọi enter/exit đúng thứ tự và nhớ state trước', () => {
    const log: string[] = [];
    const now = 0;
    const sm = new StateMachine<object, S>({}, () => now);
    sm.add('a', {
      enter: (_c, prev) => log.push(`enter a from ${prev}`),
      exit: (_c, next) => log.push(`exit a to ${next}`),
    });
    sm.add('b', { enter: (_c, prev) => log.push(`enter b from ${prev}`) });
    sm.set('a');
    sm.set('b');
    expect(log).toEqual(['enter a from null', 'exit a to b', 'enter b from a']);
    expect(sm.current).toBe('b');
    expect(sm.is('b')).toBe(true);
  });

  it('đặt lại cùng state thì không làm gì', () => {
    let enters = 0;
    const sm = new StateMachine<object, S>({}, () => 0);
    sm.add('a', { enter: () => enters++ });
    sm.set('a');
    sm.set('a');
    expect(enters).toBe(1);
  });

  it('tính thời gian đã ở trong state', () => {
    let now = 100;
    const sm = new StateMachine<object, S>({}, () => now);
    sm.add('a', {});
    sm.set('a');
    now = 450;
    expect(sm.elapsed).toBe(350);
  });

  it('update chỉ chạy cho state hiện tại', () => {
    let a = 0;
    let b = 0;
    const sm = new StateMachine<object, S>({}, () => 0);
    sm.add('a', { update: () => a++ }).add('b', { update: () => b++ });
    sm.set('a');
    sm.update(0, 16);
    sm.set('b');
    sm.update(0, 16);
    sm.update(0, 16);
    expect([a, b]).toEqual([1, 2]);
  });

  it('báo lỗi khi chuyển sang state không tồn tại', () => {
    const sm = new StateMachine<object, S>({}, () => 0);
    expect(() => sm.set('a')).toThrow();
  });
});
