import Phaser from 'phaser';
import type { EnemyAI } from '../data/types';
import type { Enemy } from '../entities/Enemy';
import type { LaunchCfg } from '../entities/Projectile';
import type { Player } from '../entities/Player';

/** Dữ liệu dùng chung mỗi frame (một object duy nhất, cập nhật tại chỗ → không cấp phát). */
export interface EnemyContext {
  player: Player;
  time: number;
  delta: number;
  view: Phaser.Geom.Rectangle;
  fire(cfg: LaunchCfg): void;
}

interface EnemyBehavior {
  init?(e: Enemy): void;
  update(e: Enemy, c: EnemyContext): void;
}

const DEG = Math.PI / 180;
const RECOVER_MS = 300;

const body = (e: Enemy): Phaser.Physics.Arcade.Body => e.body as Phaser.Physics.Arcade.Body;
const inView = (e: Enemy, c: EnemyContext): boolean => e.x > c.view.x + 8 && e.x < c.view.right - 8;

function facePlayer(e: Enemy, c: EnemyContext): void {
  e.dir = c.player.x < e.x ? -1 : 1;
  e.setFlipX(e.dir < 0);
}

/** Bắn `count` tia về phía người chơi (hoặc 8 hướng nếu snap8). */
function shoot(e: Enemy, c: EnemyContext, originY: number): void {
  const f = e.def.fire;
  if (!f) return;
  const ox = e.x;
  const oy = e.y - originY;
  let angle = Math.atan2(c.player.y - 16 - oy, c.player.x - ox);
  if (f.snap8) angle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  for (let i = 0; i < f.count; i++) {
    c.fire({
      x: ox + Math.cos(angle) * 12,
      y: oy + Math.sin(angle) * 12,
      angle: angle + (i - (f.count - 1) / 2) * f.spread * DEG,
      speed: f.speed,
      damage: 1,
      lifetime: 4,
      texture: f.texture,
      behavior: 'straight',
      hostile: true,
    });
  }
}

/**
 * Cung thủ / tháp nỏ: chờ → CẢNH BÁO (nháy trắng ≥ 0.3s) → bắn → nghỉ.
 * st: 0 chờ, 1 cảnh báo, 2 hồi.
 */
function shooterCycle(e: Enemy, c: EnemyContext, originY: number): void {
  const f = e.def.fire;
  if (!f) return;
  if (!inView(e, c) || c.player.dead) {
    e.st = 0;
    e.t = Math.max(e.t, 500);
    return;
  }
  e.t -= c.delta;
  if (e.st === 0) {
    if (e.t <= 0) {
      e.st = 1;
      e.t = f.telegraph;
    }
  } else if (e.st === 1) {
    e.telegraph = true;
    if (e.t <= 0) {
      shoot(e, c, originY);
      e.st = 2;
      e.t = RECOVER_MS;
    }
  } else if (e.t <= 0) {
    e.st = 0;
    e.t = f.cooldown;
  }
}

export const enemyBehaviors: Record<EnemyAI, EnemyBehavior> = {
  // Lính bộ: chạy thẳng về phía người chơi, nhảy qua vật cản thấp, rơi khỏi sàn
  walker: {
    update(e, c) {
      const b = body(e);
      const dx = c.player.x - e.x;
      facePlayer(e, c);
      if (!b.blocked.down) return;
      b.setVelocityX(Math.abs(dx) < 6 ? 0 : e.dir * e.def.speed);
      if (b.blocked.left || b.blocked.right) b.setVelocityY(-230);
    },
  },

  // Cung thủ: đứng yên, nhắm và bắn
  shooter: {
    init(e) {
      e.st = 0;
      e.t = Phaser.Math.Between(400, 1200);
    },
    update(e, c) {
      facePlayer(e, c);
      shooterCycle(e, c, 18);
    },
  },

  // Tháp nỏ: xoay 8 hướng, bắn loạt 3 mũi
  turret: {
    init(e) {
      e.st = 0;
      e.t = Phaser.Math.Between(600, 1400);
    },
    update(e, c) {
      shooterCycle(e, c, 11);
      const bar = e.gun;
      if (bar && !c.player.dead) {
        const a = Math.atan2(c.player.y - 16 - (e.y - 11), c.player.x - e.x);
        bar.setRotation(Math.round(a / (Math.PI / 4)) * (Math.PI / 4));
        bar.setPosition(e.x, e.y - 11);
      }
    },
  },

  // Quạ máy: bay hình sin → dừng báo hiệu → lao xuống → bay đi
  flyer: {
    init(e) {
      e.st = 0;
      e.setFlipX(true);
    },
    update(e, c) {
      const b = body(e);
      if (e.st === 0) {
        b.setVelocity(-e.def.speed, Math.cos(e.age * 0.004) * 72);
        const dx = e.x - c.player.x;
        if (dx < 120 && dx > 24 && inView(e, c) && !c.player.dead) {
          e.st = 1;
          e.t = 380;
          b.setVelocity(0, 0);
        }
      } else if (e.st === 1) {
        e.telegraph = true;
        e.t -= c.delta;
        if (e.t <= 0) {
          const a = Math.atan2(c.player.y - 14 - e.y, c.player.x - e.x);
          b.setVelocity(Math.cos(a) * 170, Math.sin(a) * 170);
          e.setFlipX(b.velocity.x < 0);
          e.st = 2;
          e.t = 1100;
        }
      } else if (e.st === 2) {
        e.t -= c.delta;
        if (e.t <= 0) {
          e.st = 3;
          b.setVelocity(-90, -70);
          e.setFlipX(true);
        }
      }
    },
  },

  // Ninja đỏ: nhảy qua lại, đáp xuống thì cảnh báo rồi ném phi tiêu
  jumper: {
    init(e) {
      e.st = 0;
      e.t = 700;
      e.hop = Math.random() < 0.5 ? -1 : 1;
    },
    update(e, c) {
      const b = body(e);
      const onGround = b.blocked.down;
      if (e.st === 0) {
        facePlayer(e, c);
        e.t -= c.delta;
        if (e.t <= 0 && onGround) {
          e.hop = -e.hop;
          if (e.x < c.view.x + 36) e.hop = 1;
          else if (e.x > c.view.right - 36) e.hop = -1;
          b.setVelocity(e.hop * e.def.speed, -250);
          e.st = 1;
          e.t = 0;
        }
      } else if (e.st === 1) {
        e.t += c.delta;
        if (onGround && e.t > 120) {
          b.setVelocityX(0);
          e.st = 2;
          e.t = e.def.fire?.telegraph ?? 400;
        }
      } else if (e.st === 2) {
        facePlayer(e, c);
        e.telegraph = true;
        e.t -= c.delta;
        if (e.t <= 0) {
          if (!c.player.dead) shoot(e, c, 16);
          e.st = 3;
          e.t = RECOVER_MS;
        }
      } else {
        e.t -= c.delta;
        if (e.t <= 0) {
          e.st = 0;
          e.t = (e.def.fire?.cooldown ?? 1000) * (0.6 + Math.random() * 0.4);
        }
      }
    },
  },

  // Đèn lồng mang vật phẩm: bay ngang màn hình, bắn rơi để nhặt đồ
  carrier: {
    update(e) {
      body(e).setVelocity(-e.def.speed, Math.cos(e.age * 0.003) * 42);
    },
  },

  // Thùng thuốc nổ: lăn về phía người chơi, nổ khi chạm (xử lý ở CombatSystem)
  roller: {
    init(e) {
      e.dir = -1;
    },
    update(e, c) {
      const b = body(e);
      if (e.age < 60) e.dir = c.player.x < e.x ? -1 : 1;
      if (b.blocked.left || b.blocked.right) e.dir = -e.dir;
      if (b.blocked.down) b.setVelocityX(e.dir * e.def.speed);
      e.angle += e.dir * c.delta * 0.45;
    },
  },
};
