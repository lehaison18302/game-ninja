import Phaser from 'phaser';
import { MAX_WEAPON_LEVEL, upgradeLevel } from '../core/rules';
import { audio } from '../audio/AudioSystem';
import { EVT } from '../constants';
import { run } from '../core/GameState';
import type { ItemId } from '../data/types';
import type { Enemy } from '../entities/Enemy';
import { Pickup } from '../entities/Pickup';
import type { Player } from '../entities/Player';
import type { Effects } from './Effects';
import type { HealthSystem } from './HealthSystem';
import type { StageTerrain } from './TerrainBuilder';

const POOL_SIZE = 8;
const FULL_BONUS = 300;

/** Rơi/nhặt vật phẩm: cuộn nâng cấp, cơm nắm, khiên Ki, bom khói. */
export class PickupSystem {
  readonly group: Phaser.Physics.Arcade.Group;

  constructor(
    private scene: Phaser.Scene,
    player: Player,
    private health: HealthSystem,
    private fx: Effects,
    /** Bom khói nổ ngay khi nhặt (nút C dành cho chiêu riêng của ninja). */
    private useSmoke: () => void,
    terrain: StageTerrain,
  ) {
    this.group = scene.physics.add.group({
      classType: Pickup,
      maxSize: POOL_SIZE,
      runChildUpdate: false,
    });
    const warm: Pickup[] = [];
    for (let i = 0; i < POOL_SIZE; i++) warm.push(this.group.get(0, 0, 'px') as Pickup);
    for (const p of warm) p.kill();

    scene.physics.add.collider(this.group, terrain.ground);
    scene.physics.add.collider(this.group, terrain.platforms);
    scene.physics.add.overlap(
      player,
      this.group,
      (_p, it) => this.collect(it as Pickup),
      (_p, it) => (it as Pickup).active && !player.dead,
    );
    scene.events.on(EVT.enemyKilled, this.onEnemyKilled, this);
    scene.events.once('shutdown', () =>
      scene.events.off(EVT.enemyKilled, this.onEnemyKilled, this),
    );
  }

  update(delta: number): void {
    for (const p of this.group.getChildren() as Pickup[]) if (p.active) p.tick(delta);
  }

  private onEnemyKilled(e: Enemy): void {
    if (!e.drop) return;
    const p = this.group.get(e.x, e.y, 'px') as Pickup | null;
    p?.spawnAt(e.drop as ItemId, e.x, e.y);
  }

  private collect(p: Pickup): void {
    const item = p.item;
    p.kill();
    this.fx.burst(p.x, p.y - 8, 0xffe27a, 8);
    audio.sfx('pickup');
    this.scene.events.emit(EVT.pickupTaken, item);
    switch (item) {
      case 'upgrade':
        if (run.weaponLevel < MAX_WEAPON_LEVEL) {
          run.weaponLevel = upgradeLevel(run.weaponLevel);
          this.scene.events.emit(EVT.weaponChanged);
        } else this.addScore(FULL_BONUS);
        break;
      case 'rice':
        if (!this.health.heal()) this.addScore(FULL_BONUS);
        break;
      case 'shield':
        this.health.setShield(true);
        break;
      case 'smoke':
        this.useSmoke();
        break;
    }
  }

  private addScore(n: number): void {
    run.score += n;
    this.scene.events.emit(EVT.scoreChanged, run.score);
  }
}
