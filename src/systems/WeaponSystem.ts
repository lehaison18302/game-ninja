import Phaser from 'phaser';
import { chargeRatio, fanAngle } from '../core/rules';
import { audio } from '../audio/AudioSystem';
import { DEPTH, POOL } from '../constants';
import { run } from '../core/GameState';
import { characters } from '../data/characters';
import { weapons } from '../data/weapons';
import type { Vec, WeaponDef, WeaponLevel } from '../data/types';
import { Projectile, type LaunchCfg, type ProjectileSpawner } from '../entities/Projectile';
import type { Player } from '../entities/Player';
import type { InputState } from './InputController';

const BAR_W = 22;
/** Chạm nút đánh lúc vũ khí còn đang hồi thì vẫn ra đòn ngay khi hồi xong (nếu trong khoảng này). */
const ATTACK_BUFFER_MS = 250;

/** Ra đòn theo dữ liệu `weapons.ts`: cooldown, quạt đạn, gồng cung, chém/ném của Ren. Đạn lấy từ pool. */
export class WeaponSystem implements ProjectileSpawner {
  readonly bullets: Phaser.Physics.Arcade.Group;
  /** Có địch trong tầm chém không? (CombatSystem/SpawnSystem gán ở Giai đoạn 4). */
  enemyInRange: (x: number, y: number, range: number) => boolean = () => false;
  private nextFire = 0;
  private chargeStart = -1;
  private queuedAt = -1e9;
  private bar: Phaser.GameObjects.Graphics;
  private barShown = false;
  private muzzle: Vec = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
    private player: Player,
    private input: InputState,
  ) {
    this.bullets = scene.physics.add.group({
      classType: Projectile,
      maxSize: POOL.playerBullets,
      allowGravity: false,
      runChildUpdate: false,
    });
    // khởi tạo sẵn toàn bộ pool để không tạo object mới khi đang chơi
    const warm: Projectile[] = [];
    for (let i = 0; i < POOL.playerBullets; i++)
      warm.push(this.bullets.get(0, 0, 'px') as Projectile);
    for (const p of warm) p.kill();

    this.bar = scene.add.graphics().setDepth(DEPTH.fx);
  }

  get def(): WeaponDef {
    return weapons[characters[run.character].weapon];
  }

  get level(): WeaponLevel {
    return this.def.levels[run.weaponLevel - 1];
  }

  spawn(cfg: LaunchCfg): Projectile | null {
    const p = this.bullets.get(cfg.x, cfg.y, cfg.texture) as Projectile | null;
    if (!p) return null;
    p.owner = this;
    p.launch(cfg);
    return p;
  }

  /** Dừng gồng/ngắm (khi chết, tạm dừng…). */
  cancel(): void {
    this.chargeStart = -1;
    this.player.speedMul = 1;
    this.player.chargeRatio = 0;
    this.drawBar(0);
  }

  update(time: number): void {
    const pl = this.player;
    if (this.input.attackPressed) this.queuedAt = time;
    if (pl.dead || pl.sm.is('dash')) {
      this.cancel();
      return;
    }
    const def = this.def;
    pl.speedMul = 1;
    pl.chargeRatio = 0;
    if (def.mode === 'auto') this.updateAuto(time, def);
    else if (def.mode === 'charge') this.updateCharge(time, def);
    else this.updateMelee(time, def);
  }

  // ------------------------------------------------------------ các kiểu ra đòn

  /** Đang giữ nút đánh, hoặc vừa chạm nút trong khoảng đệm. */
  private wantsAttack(time: number): boolean {
    return this.input.attack || time - this.queuedAt <= ATTACK_BUFFER_MS;
  }

  private updateAuto(time: number, def: WeaponDef): void {
    if (time < this.nextFire || !this.wantsAttack(time)) return;
    this.queuedAt = -1e9;
    const lv = this.level;
    this.nextFire = time + lv.cooldown * 1000;
    audio.sfx(def.id === 'tessen' ? 'wind' : 'shuriken');
    const base = Math.atan2(this.player.aim.y, this.player.aim.x);
    this.player.muzzle(this.muzzle);
    for (let i = 0; i < lv.count; i++) {
      this.spawn({
        x: this.muzzle.x,
        y: this.muzzle.y,
        angle: fanAngle(base, i, lv.count, lv.spread),
        speed: lv.speed,
        damage: lv.damage,
        lifetime: def.range / lv.speed,
        texture: def.sprite,
        behavior: def.behavior,
        pierce: def.pierce,
        knockback: def.knockback,
        blocksBullets: def.blocksBullets,
        grow: lv.grow,
        weave: lv.weave,
        phase: i * Math.PI,
        scale: def.behavior === 'wind' ? 0.8 : 1,
      });
    }
  }

  private updateCharge(time: number, def: WeaponDef): void {
    const ch = def.charge;
    if (!ch) return;
    const fullMs = ch.ms[run.weaponLevel - 1];
    // bắt đầu gồng khi hết hồi mà vẫn đang giữ nút (bấm giữ từ lúc còn hồi cũng được), hoặc vừa chạm nhanh
    if (this.chargeStart < 0 && time >= this.nextFire && this.wantsAttack(time)) {
      this.chargeStart = time;
      this.queuedAt = -1e9;
      audio.sfx('charge');
    }
    if (this.chargeStart < 0) return;

    const ratio = chargeRatio(time - this.chargeStart, fullMs);
    this.player.speedMul = ch.moveMul;
    this.player.chargeRatio = ratio;
    this.drawBar(ratio);

    if (!this.input.attack) {
      const charged = ratio >= 1;
      const lv = this.level;
      audio.sfx(charged ? 'arrowCharged' : 'arrow');
      this.player.muzzle(this.muzzle);
      this.spawn({
        x: this.muzzle.x,
        y: this.muzzle.y,
        angle: Math.atan2(this.player.aim.y, this.player.aim.x),
        speed: lv.speed * (charged ? ch.speedMul : 1),
        damage: lv.damage * (charged ? ch.damageMul : 1),
        lifetime: def.range / (lv.speed * (charged ? ch.speedMul : 1)),
        texture: def.sprite,
        behavior: def.behavior,
        pierce: charged,
        charged,
        split: charged && run.weaponLevel >= ch.splitAtLevel,
        scale: charged ? 1.3 : 1,
      });
      this.nextFire = time + lv.cooldown * 1000;
      this.cancel();
    }
  }

  private updateMelee(time: number, def: WeaponDef): void {
    const m = def.melee;
    if (!m || time < this.nextFire || !this.wantsAttack(time)) return;
    this.queuedAt = -1e9;
    const pl = this.player;
    pl.muzzle(this.muzzle);
    const angle = Math.atan2(pl.aim.y, pl.aim.x);
    const near = this.enemyInRange(pl.x, pl.y - 16, m.range);
    if (near) {
      this.nextFire = time + m.cooldown * 1000;
      audio.sfx('slash');
      const cx = pl.x + pl.aim.x * 24;
      const cy = pl.y - (pl.sm.is('prone') ? 6 : 16) + pl.aim.y * 24;
      this.spawn({
        x: cx,
        y: cy,
        angle,
        speed: 0,
        damage: m.damage[run.weaponLevel - 1],
        lifetime: 0.12,
        texture: 'p-slash',
        behavior: 'slash',
        pierce: true,
        reflect: true,
      });
      if (run.weaponLevel >= m.waveAtLevel) {
        this.spawn({
          x: cx,
          y: cy,
          angle,
          speed: 220,
          damage: 3,
          lifetime: 0.25,
          texture: 'p-slash',
          behavior: 'straight',
          pierce: true,
          scale: 0.7,
          tint: 0xff9a8a,
        });
      }
    } else {
      const lv = this.level;
      this.nextFire = time + lv.cooldown * 1000;
      audio.sfx('kunai');
      this.spawn({
        x: this.muzzle.x,
        y: this.muzzle.y,
        angle,
        speed: lv.speed,
        damage: lv.damage,
        lifetime: def.range / lv.speed,
        texture: def.sprite,
        behavior: def.behavior,
        pierce: false,
        explode: run.weaponLevel >= m.explodeAtLevel,
      });
    }
  }

  private drawBar(ratio: number): void {
    if (ratio <= 0) {
      if (this.barShown) {
        this.bar.clear();
        this.barShown = false;
      }
      return;
    }
    this.barShown = true;
    const x = this.player.x - BAR_W / 2;
    const y = this.player.y - 42;
    this.bar.clear();
    this.bar.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, BAR_W + 2, 5);
    this.bar.fillStyle(ratio >= 1 ? 0xffffff : 0x6fd0ff, 1).fillRect(x, y, BAR_W * ratio, 3);
  }
}
