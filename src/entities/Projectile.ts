import Phaser from 'phaser';
import { DEPTH } from '../constants';
import type { ProjectileBehavior } from '../data/types';
import { behaviors } from '../behaviors/projectileBehaviors';

export interface LaunchCfg {
  x: number;
  y: number;
  /** Radian. */
  angle: number;
  speed: number;
  damage: number;
  /** Giây. */
  lifetime: number;
  texture: string;
  behavior: ProjectileBehavior;
  pierce?: boolean;
  knockback?: number;
  blocksBullets?: boolean;
  reflect?: boolean;
  /** Tessen: hệ số to lên khi bay. */
  grow?: number;
  weave?: number;
  phase?: number;
  /** Cung: tên gồng (xuyên giáp). */
  charged?: boolean;
  split?: boolean;
  explode?: boolean;
  scale?: number;
  tint?: number;
  /** Trọng lực riêng (đạn ném). */
  gravity?: number;
  hostile?: boolean;
}

export interface ProjectileSpawner {
  spawn(cfg: LaunchCfg): Projectile | null;
}

/** Kích thước hitbox theo texture (AABB không xoay nên dùng hộp vuông nhỏ cho đạn mảnh). */
const HIT_SIZE: Record<string, [number, number]> = {
  'p-shuriken': [9, 9],
  'p-wind': [10, 16],
  'p-arrow': [10, 8],
  'p-kunai': [8, 8],
  'p-slash': [36, 30],
  'p-blast': [30, 30],
  'e-arrow': [8, 4],
  'e-shuriken': [6, 6],
  'e-bolt': [7, 4],
  'e-rock': [12, 12],
  'e-fire': [12, 12],
};

const CULL_MARGIN = 40;

/** Một lớp đạn chung cho cả người chơi và địch; hành vi tra theo `behavior`. Sống trong Phaser Group (pool). */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  damage = 1;
  pierce = false;
  knockback = 0;
  blocksBullets = false;
  reflect = false;
  charged = false;
  split = false;
  explode = false;
  hostile = false;
  behavior: ProjectileBehavior = 'straight';
  owner: ProjectileSpawner | null = null;
  readonly hit = new Set<object>();
  /** Đã sống bao lâu / còn bao lâu (ms). */
  age = 0;
  life = 0;
  speed = 0;
  dirX = 1;
  dirY = 0;
  grow = 1;
  weave = 0;
  phase = 0;
  baseScale = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.projectile);
  }

  launch(c: LaunchCfg): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.enableBody(true, c.x, c.y, true, true);
    this.setTexture(c.texture);
    this.clearTint();
    if (c.tint !== undefined) this.setTint(c.tint);
    this.setAlpha(1);
    this.baseScale = c.scale ?? 1;
    this.setScale(this.baseScale);
    this.setRotation(c.angle);
    this.setDepth(DEPTH.projectile);

    this.damage = c.damage;
    this.pierce = c.pierce ?? false;
    this.knockback = c.knockback ?? 0;
    this.blocksBullets = c.blocksBullets ?? false;
    this.reflect = c.reflect ?? false;
    this.charged = c.charged ?? false;
    this.split = c.split ?? false;
    this.explode = c.explode ?? false;
    this.hostile = c.hostile ?? false;
    this.behavior = c.behavior;
    this.grow = c.grow ?? 1;
    this.weave = c.weave ?? 0;
    this.phase = c.phase ?? 0;
    this.speed = c.speed;
    this.dirX = Math.cos(c.angle);
    this.dirY = Math.sin(c.angle);
    this.age = 0;
    this.life = c.lifetime * 1000;
    this.hit.clear();

    const size = HIT_SIZE[c.texture];
    // texture không có trong bảng thì lấy theo khung hình (tránh giữ hitbox của texture cũ trong pool)
    if (size) body.setSize(size[0], size[1], true);
    else body.setSize(this.width, this.height, true);
    // trọng lực riêng (đạn ném) = trọng lực mong muốn trừ trọng lực thế giới đã cộng sẵn
    const g = c.gravity ?? 0;
    body.setAllowGravity(g !== 0);
    body.setGravityY(g !== 0 ? g - this.scene.physics.world.gravity.y : 0);
    body.setVelocity(this.dirX * c.speed, this.dirY * c.speed);
  }

  /** Trả về pool. */
  kill(): void {
    this.disableBody(true, true);
  }

  canHit(target: object): boolean {
    return !this.hit.has(target);
  }

  /** Gọi sau khi đã gây sát thương lên `target`. */
  onHit(target: Phaser.GameObjects.GameObject): void {
    this.hit.add(target);
    behaviors[this.behavior].onHit?.(this, target);
    if (!this.pierce) this.kill();
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.active) return;
    this.age += delta;
    if (this.age >= this.life) {
      this.kill();
      return;
    }
    behaviors[this.behavior].update?.(this, delta);
    const view = this.scene.cameras.main.worldView;
    if (
      this.x < view.x - CULL_MARGIN ||
      this.x > view.right + CULL_MARGIN ||
      this.y < view.y - CULL_MARGIN ||
      this.y > view.bottom + CULL_MARGIN
    ) {
      this.kill();
    }
  }
}
