import type Phaser from 'phaser';
import type { ProjectileBehavior } from '../data/types';
import type { Projectile } from '../entities/Projectile';

interface Behavior {
  update?(p: Projectile, delta: number): void;
  onHit?(p: Projectile, target: Phaser.GameObjects.GameObject): void;
}

const SPLIT_ANGLES = [-0.5, 0, 0.5];

/** Hành vi đạn: mỗi cái là một object nhỏ, thêm loại mới chỉ cần thêm một mục. */
export const behaviors: Record<ProjectileBehavior, Behavior> = {
  // bay thẳng với vận tốc ban đầu
  straight: {},

  // luồng gió: to dần, mờ dần, tuỳ chọn đan nhau
  wind: {
    update(p) {
      const t = p.age / p.life;
      p.setScale(p.baseScale * (1 + (p.grow - 1) * t));
      p.setAlpha(t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
      if (p.weave > 0) {
        // vận tốc ngang theo hướng bay + dao động vuông góc (cos = đạo hàm của sin)
        const w = p.weave * 12 * Math.cos(p.age * 0.012 + p.phase);
        const body = p.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(p.dirX * p.speed - p.dirY * w, p.dirY * p.speed + p.dirX * w);
      }
    },
  },

  // tên: gồng thì phát sáng, trúng thì tách 3 mũi (Lv2+)
  arrow: {
    update(p) {
      if (p.charged) p.setTint(Math.floor(p.age / 50) % 2 === 0 ? 0xffffff : 0x9fe8ff);
    },
    onHit(p, target) {
      if (!p.charged || !p.split || !p.owner) return;
      const t = target as Phaser.GameObjects.Sprite;
      const base = Math.atan2(p.dirY, p.dirX);
      for (const a of SPLIT_ANGLES) {
        p.owner.spawn({
          x: t.x,
          y: t.y,
          angle: base + a,
          speed: p.speed * 0.8,
          damage: Math.max(1, Math.round(p.damage / 3)),
          lifetime: 0.4,
          texture: 'p-arrow',
          behavior: 'straight',
          pierce: false,
          scale: 0.8,
          tint: 0x9fe8ff,
        });
      }
    },
  },

  // kunai: Lv2+ nổ nhỏ khi cắm vào địch
  kunai: {
    onHit(p) {
      if (!p.explode || !p.owner) return;
      p.owner.spawn({
        x: p.x,
        y: p.y,
        angle: 0,
        speed: 0,
        damage: Math.max(1, Math.round(p.damage)),
        lifetime: 0.12,
        texture: 'p-blast',
        behavior: 'blast',
        pierce: true,
        scale: 0.6,
      });
    },
  },

  // đường chém đoản đao: đứng yên, mờ nhanh
  slash: {
    update(p) {
      p.setAlpha(1 - p.age / p.life);
    },
  },

  // lốc xoáy (chiêu Fuuka): lật qua lại cho cảm giác xoáy, tan dần ở cuối
  tornado: {
    update(p) {
      const t = p.age / p.life;
      p.setFlipX(Math.floor(p.age / 90) % 2 === 1);
      p.setAlpha(t > 0.8 ? (1 - t) / 0.2 : 0.95);
    },
  },

  // vụ nổ nhỏ
  blast: {
    update(p) {
      const t = p.age / p.life;
      p.setScale(p.baseScale * (0.7 + 0.5 * t));
      p.setAlpha(1 - t);
    },
  },
};
