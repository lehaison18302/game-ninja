import Phaser from 'phaser';
import { DEPTH } from '../constants';
import { enemies } from '../data/enemies';
import type { EnemyDef } from '../data/types';
import { enemyBehaviors, type EnemyContext } from '../behaviors/enemyBehaviors';

const HIT_FLASH_MS = 70;

/** Một lớp địch chung; hành vi tra theo `def.ai` trong enemyBehaviors. Sống trong Group (pool). */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  def: EnemyDef = enemies.ashigaru;
  hp = 0;
  /** Trạng thái con + bộ đếm (ms) dùng chung cho các hành vi. */
  st = 0;
  t = 0;
  dir = -1;
  hop = 1;
  baseY = 0;
  age = 0;
  /** Hành vi đặt true trong lúc cảnh báo (nháy trắng). */
  telegraph = false;
  drop: string | null = null;
  gun: Phaser.GameObjects.Image | null = null;
  private flashUntil = 0;
  private flashing = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.enemy);
  }

  spawnAt(def: EnemyDef, x: number, y: number, drop: string | null): void {
    this.def = def;
    const roller = def.ai === 'roller';
    this.enableBody(true, x, roller ? y - def.h / 2 : y, true, true);
    this.setTexture(def.texture);
    this.setOrigin(0.5, roller ? 0.5 : 1);
    this.clearTint();
    this.setAlpha(1).setScale(1).setAngle(0).setFlipX(false);
    this.setDepth(DEPTH.enemy);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(def.w, def.h, false);
    body.setOffset((this.width - def.w) / 2, this.height - def.h);
    body.setAllowGravity(def.gravity);
    body.setImmovable(def.ai === 'turret');
    body.setVelocity(0, 0);
    body.setMaxVelocity(300, 520);

    this.hp = def.hp;
    this.st = 0;
    this.t = 0;
    this.dir = -1;
    this.hop = 1;
    this.baseY = y;
    this.age = 0;
    this.telegraph = false;
    this.flashUntil = 0;
    this.flashing = false;
    this.drop = drop;

    if (def.ai === 'turret') {
      if (!this.gun) this.gun = this.scene.add.image(x, y, 'enemy-turret-barrel').setOrigin(0, 0.5);
      this.gun
        .setVisible(true)
        .setDepth(DEPTH.enemy + 1)
        .setRotation(Math.PI)
        .clearTint();
      this.gun.setPosition(x, y - 11);
    } else {
      this.gun?.setVisible(false);
    }
    enemyBehaviors[def.ai].init?.(this);
  }

  /** Nhận sát thương; trả về true nếu chết. */
  hitBy(damage: number, time: number): boolean {
    this.hp -= damage;
    this.flashUntil = time + HIT_FLASH_MS;
    return this.hp <= 0;
  }

  tick(c: EnemyContext): void {
    this.age += c.delta;
    this.telegraph = false;
    enemyBehaviors[this.def.ai].update(this, c);

    const flash = this.telegraph ? Math.floor(c.time / 60) % 2 === 0 : c.time < this.flashUntil;
    if (flash !== this.flashing) {
      this.flashing = flash;
      if (flash) this.setTintFill(0xffffff);
      else this.clearTint();
      if (this.gun) {
        if (flash) this.gun.setTintFill(0xffffff);
        else this.gun.clearTint();
      }
    }
  }

  kill(): void {
    this.disableBody(true, true);
    this.gun?.setVisible(false);
  }
}
