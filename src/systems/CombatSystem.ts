import Phaser from 'phaser';
import { effectiveDamage } from '../core/rules';
import { audio } from '../audio/AudioSystem';
import { EVT, POOL } from '../constants';
import { run } from '../core/GameState';
import type { Boss } from '../entities/Boss';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { Projectile, type LaunchCfg } from '../entities/Projectile';
import type { Effects } from './Effects';
import type { HealthSystem } from './HealthSystem';
import type { SpawnSystem } from './SpawnSystem';
import type { StageTerrain } from './TerrainBuilder';
import type { WeaponSystem } from './WeaponSystem';

const REFLECT_SPEED_MUL = 1.5;
const REFLECT_DAMAGE = 2;
const MELEE_HITSTOP_MS = 35;
const SMOKE_DAMAGE = 3;
const SMOKE_BOSS_DAMAGE = 5;

interface Deps {
  player: Player;
  weapons: WeaponSystem;
  spawns: SpawnSystem;
  health: HealthSystem;
  fx: Effects;
  terrain: StageTerrain;
}

/** Đăng ký mọi overlap/collider chiến đấu, tính sát thương, chặn và phản đạn. */
export class CombatSystem {
  readonly enemyBullets: Phaser.Physics.Arcade.Group;
  private boss: Boss | null = null;

  constructor(
    private scene: Phaser.Scene,
    private d: Deps,
  ) {
    this.enemyBullets = scene.physics.add.group({
      classType: Projectile,
      maxSize: POOL.enemyBullets,
      allowGravity: false,
      runChildUpdate: false,
    });
    const warm: Projectile[] = [];
    for (let i = 0; i < POOL.enemyBullets; i++)
      warm.push(this.enemyBullets.get(0, 0, 'px') as Projectile);
    for (const p of warm) p.kill();
    this.register();
  }

  /** Địch bắn đạn (gọi từ hành vi AI). */
  fireEnemy(cfg: LaunchCfg): void {
    const p = this.enemyBullets.get(cfg.x, cfg.y, cfg.texture) as Projectile | null;
    if (!p) return;
    p.owner = null;
    cfg.hostile = true;
    p.launch(cfg);
  }

  /** Boss xuất hiện sau khi màn bắt đầu: đăng ký va chạm cho riêng nó. */
  registerBoss(boss: Boss): void {
    const { player, weapons, health, fx } = this.d;
    const physics = this.scene.physics;
    this.boss = boss;
    physics.add.overlap(
      weapons.bullets,
      boss,
      (b) => {
        const p = b as Projectile;
        boss.hitBy(p.damage, this.scene.time.now);
        fx.burst(p.x, p.y, 0xffe27a, 3);
        audio.sfx('hit');
        if (p.behavior === 'slash') fx.hitStop(MELEE_HITSTOP_MS);
        p.onHit(boss);
      },
      (b) =>
        (b as Projectile).active && boss.active && !boss.dead && (b as Projectile).canHit(boss),
    );
    physics.add.overlap(
      player,
      boss,
      () => health.hit(boss.x),
      () => boss.active && !boss.dead && player.canBeHit(this.scene.time.now),
    );
  }

  /** Bom khói: xoá đạn địch, gây sát thương nhẹ cho mọi địch trong màn hình. */
  smokeBomb(view: Phaser.Geom.Rectangle): void {
    this.clearBullets();
    const { fx } = this.d;
    audio.sfx('smoke');
    fx.flash(120, 220, 230, 255);
    fx.shake(160, 0.005);
    fx.vibrate(40);
    const now = this.scene.time.now;
    for (const e of this.d.spawns.group.getChildren() as Enemy[]) {
      if (!e.active || !Phaser.Geom.Rectangle.Contains(view, e.x, e.y - e.def.h / 2)) continue;
      fx.burst(e.x, e.y - e.def.h / 2, 0xcfd6e6, 6);
      if (e.hitBy(SMOKE_DAMAGE, now)) this.onKilled(e);
    }
    const b = this.boss;
    if (b && b.active && !b.dead) b.hitBy(SMOKE_BOSS_DAMAGE, now);
  }

  /** Xoá toàn bộ đạn địch đang bay (khi vào/ra trận boss, bom khói). */
  clearBullets(): void {
    for (const b of this.enemyBullets.getChildren() as Projectile[]) if (b.active) b.kill();
  }

  private register(): void {
    const { player, weapons, spawns, terrain } = this.d;
    const physics = this.scene.physics;

    // đạn người chơi ↔ địch
    physics.add.overlap(
      weapons.bullets,
      spawns.group,
      (b, e) => this.onBulletHitsEnemy(b as Projectile, e as Enemy),
      (b, e) => (b as Projectile).active && (e as Enemy).active && (b as Projectile).canHit(e),
    );
    // đạn địch ↔ người chơi
    physics.add.overlap(
      player,
      this.enemyBullets,
      (_p, b) => {
        if (this.d.health.hit((b as Projectile).x)) (b as Projectile).kill();
      },
      (_p, b) => (b as Projectile).active && player.canBeHit(this.scene.time.now),
    );
    // địch chạm người chơi
    physics.add.overlap(
      player,
      spawns.group,
      (_p, e) => this.onEnemyTouchesPlayer(e as Enemy),
      (_p, e) =>
        (e as Enemy).active && (e as Enemy).def.contact && player.canBeHit(this.scene.time.now),
    );
    // gió quạt chặn đạn, đường chém phản đạn
    physics.add.overlap(
      weapons.bullets,
      this.enemyBullets,
      (pb, eb) => this.onBlock(pb as Projectile, eb as Projectile),
      (pb, eb) =>
        (pb as Projectile).active &&
        (eb as Projectile).active &&
        ((pb as Projectile).blocksBullets || (pb as Projectile).reflect),
    );
    // đạn địch chạm đất đặc
    physics.add.collider(this.enemyBullets, terrain.ground, (b) => (b as Projectile).kill());
    // địch đứng trên đất/sàn (quạ bay và tháp nỏ không va chạm)
    const grounded = (e: unknown): boolean => {
      const ai = (e as Enemy).def.ai;
      return ai !== 'flyer' && ai !== 'turret';
    };
    physics.add.collider(spawns.group, terrain.ground, undefined, (e) => grounded(e));
    physics.add.collider(spawns.group, terrain.platforms, undefined, (e) => grounded(e));
  }

  private onBulletHitsEnemy(b: Projectile, e: Enemy): void {
    const dmg = effectiveDamage(b.damage, !!e.def.armored, b.charged, b.behavior);
    const dead = e.hitBy(dmg, this.scene.time.now);
    if (b.knockback > 0 && !e.def.armored) {
      (e.body as Phaser.Physics.Arcade.Body).velocity.x += Math.sign(b.dirX || 1) * b.knockback;
    }
    this.d.fx.burst(e.x, e.y - e.def.h / 2, 0xffffff, 3);
    if (!dead) audio.sfx('hit');
    if (b.behavior === 'slash') this.d.fx.hitStop(MELEE_HITSTOP_MS);
    if (dead) this.onKilled(e);
    b.onHit(e);
  }

  private onEnemyTouchesPlayer(e: Enemy): void {
    if (!this.d.health.hit(e.x)) return;
    if (e.def.ai === 'roller') {
      this.d.fx.burst(e.x, e.y, e.def.color, 14);
      e.kill();
    }
  }

  private onBlock(pb: Projectile, eb: Projectile): void {
    this.d.fx.burst(eb.x, eb.y, 0xffffff, 4);
    if (pb.reflect) {
      this.d.weapons.spawn({
        x: eb.x,
        y: eb.y,
        angle: Math.atan2(-eb.dirY, -eb.dirX),
        speed: eb.speed * REFLECT_SPEED_MUL,
        damage: REFLECT_DAMAGE,
        lifetime: 1,
        texture: eb.texture.key,
        behavior: 'straight',
        tint: 0xffd27a,
      });
    }
    eb.kill();
  }

  private onKilled(e: Enemy): void {
    run.score += e.def.score;
    this.scene.events.emit(EVT.scoreChanged, run.score);
    this.scene.events.emit(EVT.enemyKilled, e);
    this.d.fx.burst(e.x, e.y - e.def.h / 2, e.def.color, 12);
    this.d.fx.vibrate(15);
    audio.sfx('explode');
    e.kill();
  }
}
