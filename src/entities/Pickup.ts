import Phaser from 'phaser';
import { DEPTH } from '../constants';
import type { ItemId } from '../data/types';

const LIFETIME_MS = 12000;
const BLINK_MS = 3000;

/** Vật phẩm rơi từ đèn lồng: rơi xuống đất, nhấp nháy trước khi biến mất. Sống trong Group (pool). */
export class Pickup extends Phaser.Physics.Arcade.Sprite {
  item: ItemId = 'rice';
  private left = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(DEPTH.pickup);
  }

  spawnAt(item: ItemId, x: number, y: number): void {
    this.item = item;
    this.enableBody(true, x, y, true, true);
    this.setTexture(`item-${item}`);
    this.setOrigin(0.5, 1).setAlpha(1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 14, true);
    body.setAllowGravity(true);
    body.setVelocity(0, -120);
    this.left = LIFETIME_MS;
  }

  tick(delta: number): void {
    this.left -= delta;
    if (this.left <= 0) {
      this.kill();
      return;
    }
    this.setAlpha(this.left < BLINK_MS && Math.floor(this.left / 120) % 2 === 0 ? 0.3 : 1);
  }

  kill(): void {
    this.disableBody(true, true);
  }
}
