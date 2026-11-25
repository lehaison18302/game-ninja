import Phaser from 'phaser';
import type { PatternId } from '../data/types';
import type { Boss, BossContext } from '../entities/Boss';

type PatternFn = (b: Boss, c: BossContext) => Phaser.Time.Timeline;
type Step = { at: number; run: () => void };

const FLIGHT_S = 1.6;
const LOB_GRAVITY = 420;
const DEG = Math.PI / 180;
const noop = (): void => undefined;

/** Mỗi pattern là một Timeline: mốc thời gian (ms) của cảnh báo → ra đòn → nghỉ. Bước cuối là mốc kết thúc. */
function timeline(c: BossContext, steps: Step[], end: number): Phaser.Time.Timeline {
  return c.scene.add.timeline([...steps, { at: end, run: noop }]);
}

/** Miệng/tay của boss (nơi đòn bắt đầu), tính theo kích thước hitbox. */
function mouth(b: Boss): { x: number; y: number } {
  return { x: b.x - b.def.w / 2, y: b.y - b.def.h * 0.78 };
}

/** Ném vật theo đường cong (parabol) để rơi đúng chỗ người chơi đang đứng. */
function lob(b: Boss, c: BossContext, texture: string, offsetX: number): void {
  const m = mouth(b);
  const tx = c.player.x + offsetX;
  const ty = c.player.y - 12;
  const vx = (tx - m.x) / FLIGHT_S;
  const vy = (ty - m.y - 0.5 * LOB_GRAVITY * FLIGHT_S ** 2) / FLIGHT_S;
  c.fire({
    x: m.x,
    y: m.y,
    angle: Math.atan2(vy, vx),
    speed: Math.hypot(vx, vy),
    damage: 1,
    lifetime: 4,
    texture,
    behavior: 'straight',
    gravity: LOB_GRAVITY,
    hostile: true,
  });
}

/** Bắn `n` tia (cách nhau `spreadDeg`) về phía người chơi. */
function aimedFan(
  b: Boss,
  c: BossContext,
  texture: string,
  n: number,
  spreadDeg: number,
  speed: number,
): void {
  const m = mouth(b);
  const a = Math.atan2(c.player.y - 14 - m.y, c.player.x - m.x);
  for (let i = 0; i < n; i++) {
    c.fire({
      x: m.x,
      y: m.y,
      angle: a + (i - (n - 1) / 2) * spreadDeg * DEG,
      speed,
      damage: 1,
      lifetime: 4,
      texture,
      behavior: 'straight',
      hostile: true,
    });
  }
}

export const bossPatterns: Record<PatternId, PatternFn> = {
  // ===== Màn 1 =====
  // giơ tay (báo hiệu 0.55s) → ném 2–4 tảng đá rơi quanh chỗ người chơi
  throwRocks(b, c) {
    const n = Math.min(4, 2 + b.phaseIndex);
    const steps: Step[] = [{ at: 0, run: () => b.telegraphFor(550, 'up') }];
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 34;
      steps.push({ at: 600 + i * 380, run: () => lob(b, c, 'e-rock', off) });
    }
    return timeline(c, steps, 600 + n * 380 + 500);
  },

  // há miệng phát sáng (báo hiệu 0.65s) → phun chuỗi cầu lửa nhắm vào người chơi
  fireBreath(b, c) {
    const n = 5 + b.phaseIndex;
    const steps: Step[] = [{ at: 0, run: () => b.telegraphFor(650, 'mouth') }];
    for (let i = 0; i < n; i++) {
      steps.push({ at: 700 + i * 200, run: () => aimedFan(b, c, 'e-fire', 1, 0, 125) });
    }
    return timeline(c, steps, 700 + n * 200 + 500);
  },

  // ===== dùng chung (Màn 1, 2) =====
  // nhấc tay cao (báo hiệu 0.6s) → đập đất: sóng chạy sát đất, phải nhảy qua
  slam(b, c) {
    const waves = 1 + Math.min(2, b.phaseIndex);
    const steps: Step[] = [{ at: 0, run: () => b.telegraphFor(600, 'up') }];
    for (let i = 0; i < waves; i++) {
      steps.push({
        at: 650 + i * 650,
        run: () => {
          c.fx.shake(200, 0.007);
          c.fire({
            x: b.x - b.def.w / 2 - 6,
            y: c.groundY - 8,
            angle: Math.PI,
            speed: 105 + b.phaseIndex * 15,
            damage: 1,
            lifetime: 6,
            texture: 'e-fire',
            behavior: 'straight',
            hostile: true,
          });
        },
      });
    }
    return timeline(c, steps, 650 + waves * 650 + 400);
  },

  // ===== Màn 2: Hải Long Thuyền =====
  // đại bác loé sáng (0.6s) → 3–4 viên đạn pháo rơi quanh người chơi
  cannonVolley(b, c) {
    const n = b.phaseIndex >= 2 ? 4 : 3;
    const steps: Step[] = [{ at: 0, run: () => b.telegraphFor(600, 'up') }];
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 40;
      steps.push({ at: 650 + i * 320, run: () => lob(b, c, 'e-ball', off) });
    }
    return timeline(c, steps, 650 + n * 320 + 500);
  },

  // rồng há miệng (0.65s) → phun các loạt 3 cầu lửa tỏa quạt
  dragonSpit(b, c) {
    const volleys = 2 + b.phaseIndex;
    const steps: Step[] = [{ at: 0, run: () => b.telegraphFor(650, 'mouth') }];
    for (let v = 0; v < volleys; v++) {
      steps.push({ at: 700 + v * 650, run: () => aimedFan(b, c, 'e-fire', 3, 16, 120) });
    }
    return timeline(c, steps, 700 + volleys * 650 + 400);
  },

  // rung và nháy (0.7s) → lao húc về bên trái rồi lùi lại; chạm thân tàu bị thương, nhảy qua mũi tàu
  ramCharge(b, c) {
    const dist = Math.min(120, b.x - b.def.w / 2 - c.arena.left - 40);
    const steps: Step[] = [
      { at: 0, run: () => b.telegraphFor(700, 'up') },
      {
        at: 750,
        run: () => {
          c.scene.tweens.add({
            targets: b,
            x: b.homeX - Math.max(40, dist),
            duration: 380,
            ease: 'Cubic.easeIn',
          });
        },
      },
      { at: 1150, run: () => c.fx.shake(220, 0.008) },
      {
        at: 1500,
        run: () => {
          c.scene.tweens.add({ targets: b, x: b.homeX, duration: 900, ease: 'Sine.easeInOut' });
        },
      },
    ];
    return timeline(c, steps, 2500);
  },

  // ===== Màn 3: Tướng Quân Bóng Tối =====
  // mắt loé trắng (0.65s) → lao ngang qua chỗ người chơi rồi quay về
  shadowDash(b, c) {
    const steps: Step[] = [
      { at: 0, run: () => b.telegraphFor(650, 'mouth') },
      {
        at: 700,
        run: () => {
          const tx = Phaser.Math.Clamp(c.player.x, c.arena.left + 30, c.arena.right - 30);
          c.scene.tweens.add({ targets: b, x: tx, duration: 380, ease: 'Cubic.easeIn' });
        },
      },
      {
        at: 1300,
        run: () => {
          c.scene.tweens.add({ targets: b, x: b.homeX, duration: 650, ease: 'Sine.easeInOut' });
        },
      },
    ];
    return timeline(c, steps, 2100);
  },

  // giơ ám khí (0.5s) → ném quạt 5–7 phi tiêu nhắm vào người chơi (phase 2+: hai loạt)
  shurikenFan(b, c) {
    const n = Math.min(7, 5 + b.phaseIndex);
    const steps: Step[] = [
      { at: 0, run: () => b.telegraphFor(500, 'up') },
      { at: 550, run: () => aimedFan(b, c, 'e-shuriken', n, 17, 130) },
    ];
    let end = 1100;
    if (b.phaseIndex >= 1) {
      steps.push({ at: 1000, run: () => b.telegraphFor(350, 'up') });
      steps.push({ at: 1400, run: () => aimedFan(b, c, 'e-shuriken', n, 17, 130) });
      end = 1900;
    }
    return timeline(c, steps, end);
  },

  // triệu hồi phân thân (0.7s) – tối đa 3 phân thân cùng lúc
  summonClones(b, c) {
    const n = b.phaseIndex >= 2 ? 3 : 2;
    const steps: Step[] = [
      { at: 0, run: () => b.telegraphFor(700, 'up') },
      {
        at: 750,
        run: () => {
          for (let i = 0; i < n && c.activeEnemies() < 3; i++) {
            const x = Phaser.Math.Clamp(
              c.player.x + (i % 2 === 0 ? -1 : 1) * (70 + i * 30),
              c.arena.left + 20,
              c.arena.right - 20,
            );
            c.fx.burst(x, c.groundY - 14, 0x6a1010, 12);
            c.spawnEnemy('redninja', x, c.groundY);
          }
        },
      },
    ];
    return timeline(c, steps, 1500);
  },

  // đánh dấu 5 điểm trên mặt đất (0.8s) → mưa cầu lửa rơi từ trên xuống đúng các điểm đó
  darkRain(b, c) {
    const xs: number[] = [];
    const steps: Step[] = [
      { at: 0, run: () => b.telegraphFor(500, 'up') },
      {
        at: 300,
        run: () => {
          xs.length = 0;
          for (let i = 0; i < 5; i++) {
            const x = Phaser.Math.Clamp(
              c.player.x + (i - 2) * 46,
              c.arena.left + 16,
              c.arena.right - 16,
            );
            xs.push(x);
            const mark = c.scene.add.image(x, c.groundY - 10, 'e-mark').setDepth(55);
            c.scene.tweens.add({
              targets: mark,
              alpha: 0.2,
              duration: 120,
              yoyo: true,
              repeat: 3,
              onComplete: () => mark.destroy(),
            });
          }
        },
      },
      {
        at: 1100,
        run: () => {
          for (const x of xs) {
            c.fire({
              x,
              y: c.groundY - 250,
              angle: Math.PI / 2,
              speed: 150,
              damage: 1,
              lifetime: 3,
              texture: 'e-fire',
              behavior: 'straight',
              hostile: true,
            });
          }
        },
      },
    ];
    return timeline(c, steps, 1900);
  },
};
