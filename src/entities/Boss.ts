import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { DEPTH, EVT } from '../constants';
import { run } from '../core/GameState';
import { bossPatterns } from '../behaviors/bossPatterns';
import type { BossDef, BossPhaseDef, EnemyId, PatternId } from '../data/types';
import type { LaunchCfg } from './Projectile';
import type { Player } from './Player';
import type { Effects } from '../systems/Effects';
import { t } from '../text/t';

export interface BossContext {
  scene: Phaser.Scene;
  player: Player;
  fx: Effects;
  fire(cfg: LaunchCfg): void;
  /** Toạ độ y mặt đất của khu đấu boss. */
  groundY: number;
  /** Biên trái/phải của khu đấu boss. */
  arena: { left: number; right: number };
  spawnEnemy(id: EnemyId, x: number, y: number): void;
  activeEnemies(): number;
}

type Pose = 'idle' | 'up' | 'mouth';

/**
 * Boss: máu, phase theo % máu, chọn pattern có trọng số + cooldown.
 * Pattern là Phaser Timeline (cảnh báo → ra đòn → nghỉ) trong bossPatterns.ts.
 */
export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp: number;
  /** Vị trí đứng ban đầu (pattern lao/húc quay về đây). */
  readonly homeX: number;
  hp: number;
  phaseIndex = 0;
  engaged = false;
  dead = false;
  deathDone = false;
  private waitMs = 0;
  private timeline: Phaser.Time.Timeline | null = null;
  private lastPattern: PatternId | null = null;
  private telegraphUntil = 0;
  private flashUntil = 0;
  private flashing = false;
  private pose: Pose = 'idle';

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly def: BossDef,
    readonly ctx: BossContext,
  ) {
    super(scene, x, y, def.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(DEPTH.boss);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(def.w, def.h, false);
    body.setOffset((this.width - def.w) / 2, this.height - def.h);
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.maxHp = def.hp;
    this.homeX = x;
    this.hp = def.hp;
  }

  get phase(): BossPhaseDef {
    return this.def.phases[this.phaseIndex];
  }

  /** Bắt đầu trận: hiện thanh máu, chờ một nhịp rồi ra đòn. */
  engage(): void {
    this.engaged = true;
    this.waitMs = 900;
    this.scene.events.emit(EVT.bossShow, t(this.def.nameKey), this.maxHp);
  }

  /** Thời điểm sau `ms` ms, boss đổi tư thế/nháy cảnh báo (telegraph). */
  telegraphFor(ms: number, pose: Pose): void {
    this.telegraphUntil = this.scene.time.now + ms;
    this.setPose(pose);
    this.scene.time.delayedCall(ms, () => this.setPose('idle'));
  }

  private setPose(p: Pose): void {
    if (this.dead || p === this.pose) return;
    this.pose = p;
    this.setTexture(
      p === 'up'
        ? `${this.def.texture}-up`
        : p === 'mouth'
          ? `${this.def.texture}-mouth`
          : this.def.texture,
    );
  }

  update(time: number, delta: number): void {
    if (!this.engaged || this.dead) return;

    const flash =
      time < this.telegraphUntil ? Math.floor(time / 70) % 2 === 0 : time < this.flashUntil;
    if (flash !== this.flashing) {
      this.flashing = flash;
      if (flash) this.setTintFill(0xffffff);
      else this.clearTint();
    }

    if (this.timeline || this.ctx.player.dead) return;
    this.waitMs -= delta;
    if (this.waitMs <= 0) this.startPattern();
  }

  hitBy(damage: number, time: number): void {
    if (!this.engaged || this.dead) return;
    this.hp = Math.max(0, this.hp - damage);
    this.flashUntil = time + 60;
    this.scene.events.emit(EVT.bossHp, this.hp);

    if (this.hp <= 0) {
      this.die();
      return;
    }
    const ratio = this.hp / this.maxHp;
    let idx = this.phaseIndex;
    while (idx + 1 < this.def.phases.length && ratio <= this.def.phases[idx + 1].hpBelow) idx++;
    if (idx !== this.phaseIndex) {
      this.phaseIndex = idx;
      this.ctx.fx.shake(250, 0.008);
      this.ctx.fx.flash(120, 255, 200, 120);
    }
  }

  private startPattern(): void {
    const list = this.phase.patterns;
    const pool = list.length > 1 ? list.filter((p) => p.id !== this.lastPattern) : list;
    let roll = Math.random() * pool.reduce((s, p) => s + p.weight, 0);
    let pick = pool[0].id;
    for (const p of pool) {
      roll -= p.weight;
      if (roll <= 0) {
        pick = p.id;
        break;
      }
    }
    this.lastPattern = pick;
    const tl = bossPatterns[pick](this, this.ctx);
    this.timeline = tl;
    tl.once(Phaser.Time.Events.COMPLETE, () => {
      tl.destroy();
      if (this.timeline === tl) this.timeline = null;
      this.waitMs = this.def.cooldownMs * this.phase.cooldownMul;
    });
    tl.play();
  }

  private die(): void {
    this.dead = true;
    this.scene.tweens.killTweensOf(this);
    this.timeline?.destroy();
    this.timeline = null;
    this.setPose('idle');
    this.clearTint();
    run.score += this.def.score;
    this.scene.events.emit(EVT.scoreChanged, run.score);
    this.ctx.fx.hitStop(120);
    audio.sfx('bossDie');
    audio.music(null);

    this.scene.time.addEvent({
      delay: 140,
      repeat: 12,
      callback: () => {
        const x = this.x + Phaser.Math.Between(-24, 24);
        const y = this.y - Phaser.Math.Between(8, this.def.h);
        this.ctx.fx.burst(x, y, Phaser.Math.RND.pick([0xffb02e, 0xe8641e, 0xfff2a0]), 14);
        this.ctx.fx.shake(120, 0.006);
        this.ctx.fx.vibrate(30);
        this.setAlpha(Math.max(0.2, this.alpha - 0.06));
      },
    });
    this.scene.time.delayedCall(2000, () => {
      this.disableBody(true, true);
      this.deathDone = true;
      this.scene.events.emit(EVT.bossDefeated);
    });
  }
}
