import { describe, expect, it } from 'vitest';
import { pickButton, STICK_DIRS, stickSector } from '../src/core/touchMath';

const R = 30;
const at = (deg: number, mag = 1): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a) * R * mag, Math.sin(a) * R * mag];
};
const dir = (sector: number): readonly [number, number] | null =>
  sector < 0 ? null : STICK_DIRS[sector];

describe('joystick ảo', () => {
  it('trong vùng chết thì đứng yên', () => {
    expect(stickSector(...at(0, 0.2), R, -1)).toBe(-1);
  });

  it('đẩy rõ thì nhận đủ 8 hướng', () => {
    expect(dir(stickSector(...at(0), R, -1))).toEqual([1, 0]);
    expect(dir(stickSector(...at(45), R, -1))).toEqual([1, 1]);
    expect(dir(stickSector(...at(90), R, -1))).toEqual([0, 1]);
    expect(dir(stickSector(...at(135), R, -1))).toEqual([-1, 1]);
    expect(dir(stickSector(...at(180), R, -1))).toEqual([-1, 0]);
    expect(dir(stickSector(...at(-135), R, -1))).toEqual([-1, -1]);
    expect(dir(stickSector(...at(-90), R, -1))).toEqual([0, -1]);
    expect(dir(stickSector(...at(-45), R, -1))).toEqual([1, -1]);
  });

  it('ngón hơi trĩu xuống (25°) khi chạy vẫn là chạy ngang, không ngắm xuống', () => {
    expect(dir(stickSector(...at(25), R, -1))).toEqual([1, 0]);
    expect(dir(stickSector(...at(155), R, -1))).toEqual([-1, 0]);
  });

  it('chếch lên 25° thì ngắm chéo lên', () => {
    expect(dir(stickSector(...at(-25), R, -1))).toEqual([1, -1]);
  });

  it('có độ trễ ở ranh giới: không nhảy qua lại giữa hai hướng', () => {
    const right = stickSector(...at(0), R, -1);
    expect(stickSector(...at(-27), R, right)).toBe(right);
    expect(dir(stickSector(...at(-35), R, right))).toEqual([1, -1]);
  });

  it('đang giữ hướng thì kéo về gần tâm mới nhả', () => {
    const s = stickSector(...at(0), R, -1);
    expect(stickSector(...at(0, 0.25), R, s)).toBe(s);
    expect(stickSector(...at(0, 0.15), R, s)).toBe(-1);
  });
});

describe('chọn nút cảm ứng', () => {
  const btns = [
    { x: 360, y: 224, r: 28 },
    { x: 420, y: 172, r: 28 },
    { x: 434, y: 234, r: 23 },
  ];

  it('chạm lệch ngoài mép nút vẫn ăn nút gần nhất', () => {
    expect(pickButton(btns, 360 + 28 + 10, 224, -1, 26)).toBe(0);
  });

  it('chạm quá xa mọi nút thì không bấm gì', () => {
    expect(pickButton(btns, 300, 60, -1, 26)).toBe(-1);
  });

  it('trượt ngón từ Đánh vào hẳn nút Nhảy thì đổi nút', () => {
    expect(pickButton(btns, 420, 172, 0, 26)).toBe(1);
  });

  it('trượt ra khoảng trống giữa các nút thì vẫn giữ nút cũ', () => {
    expect(pickButton(btns, 392, 200, 0, 26)).toBe(0);
    expect(pickButton(btns, 470, 120, 1, 26)).toBe(1);
  });
});
