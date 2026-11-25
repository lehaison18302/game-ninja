/** Toán thuần cho điều khiển cảm ứng (không phụ thuộc Phaser) → kiểm thử được bằng Vitest. */

/** 8 hướng của joystick ảo theo chỉ số sector; y dương = xuống. */
export const STICK_DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * Góc bắt đầu (độ, y hướng xuống) của từng sector; sector i kết thúc ở góc bắt đầu của sector i+1.
 * Hai hướng ngang được nới thêm về phía dưới (tới 30° thay vì 22.5°): ngón cái hơi trĩu xuống khi chạy
 * không làm nhân vật ngắm chéo xuống đất.
 */
const SECTOR_START = [-22.5, 30, 67.5, 112.5, 150, 202.5, 247.5, 292.5];
/** Vùng chết: phải đẩy quá 30% bán kính mới nhận hướng, kéo về dưới 22% mới nhả. */
const DEAD_ENTER = 0.3;
const DEAD_EXIT = 0.22;
/** Đang giữ một hướng thì phải lệch quá biên thêm ngần này độ mới đổi (chống rung qua lại ở ranh giới). */
const HYSTERESIS_DEG = 8;

function inSector(a: number, i: number, pad: number): boolean {
  const lo = SECTOR_START[i] - pad;
  const hi = (i === SECTOR_START.length - 1 ? SECTOR_START[0] + 360 : SECTOR_START[i + 1]) + pad;
  return (a >= lo && a < hi) || (a + 360 >= lo && a + 360 < hi) || (a - 360 >= lo && a - 360 < hi);
}

/**
 * Sector (0..7, xem STICK_DIRS) của joystick khi ngón lệch (dx, dy) khỏi tâm; -1 = đứng yên.
 * `prev` là sector khung trước để có độ trễ (hysteresis).
 */
export function stickSector(dx: number, dy: number, radius: number, prev: number): number {
  const m = Math.hypot(dx, dy) / radius;
  if (m < (prev < 0 ? DEAD_ENTER : DEAD_EXIT)) return -1;
  let a = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (a < SECTOR_START[0]) a += 360;
  if (prev >= 0 && inSector(a, prev, HYSTERESIS_DEG)) return prev;
  for (let i = 0; i < SECTOR_START.length; i++) if (inSector(a, i, 0)) return i;
  return 0;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Nút mà một ngón tay đang bấm (chỉ số trong `btns`, -1 = không nút nào).
 * - Ngón mới: nút gần nhất (tính từ mép nút) nếu cách mép không quá `grab` → chạm lệch vẫn ăn.
 * - Ngón đang giữ nút `current`: chỉ đổi khi trượt hẳn vào trong vòng nút khác (trượt ngón từ Đánh sang Nhảy);
 *   trượt ra ngoài khoảng trống thì vẫn giữ nút cũ, không bị nhả ngang.
 */
export function pickButton(
  btns: readonly Circle[],
  x: number,
  y: number,
  current: number,
  grab: number,
): number {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < btns.length; i++) {
    const b = btns[i];
    const d = Math.hypot(x - b.x, y - b.y) - b.r;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (current >= 0) return best !== current && bestD <= 0 ? best : current;
  return bestD <= grab ? best : -1;
}
