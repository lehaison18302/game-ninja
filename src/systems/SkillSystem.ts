import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { EVT, PLAYER } from '../constants';
import { characters } from '../data/characters';
import { skills } from '../data/skills';
import type { SkillDef, SkillId } from '../data/types';
import { DASH_SPEED, type Player } from '../entities/Player';
import type { CombatSystem } from './CombatSystem';
import type { Effects } from './Effects';
import type { InputState } from './InputController';
import type { WeaponSystem } from './WeaponSystem';

/** Bấm chiêu sớm hơn lúc hồi xong tối đa ngần này ms thì vẫn ra chiêu ngay khi hồi xong. */
const PRESS_BUFFER_MS = 200;
/** Độ dốc của mưa tên (lệch ngang / rơi dọc). */
const RAIN_SLANT = 0.2;

/** Chiêu riêng của từng ninja (nút C / phím L): hồi chiêu, ra chiêu, báo tỉ lệ hồi chiêu cho HUD. */
export class SkillSystem {
  readonly id: SkillId;
  private readyAt = 0;
  private pressedAt = -1e9;
  private lastEmit = -1;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private input: InputState,
    private weapons: WeaponSystem,
    private combat: CombatSystem,
    private fx: Effects,
  ) {
    this.id = characters[player.characterId].skill;
  }

  get def(): SkillDef {
    return skills[this.id];
  }

  update(time: number): void {
    if (this.input.skillPressed) this.pressedAt = time;
    if (
      time - this.pressedAt <= PRESS_BUFFER_MS &&
      time >= this.readyAt &&
      !this.player.dead &&
      this.cast(time)
    ) {
      this.readyAt = time + this.def.cooldownMs;
      this.pressedAt = -1e9;
    }

    // 0 = sẵn sàng … 1 = vừa dùng; làm tròn lên để chỉ về 0 khi đã hồi xong thật
    const ratio = Phaser.Math.Clamp((this.readyAt - time) / this.def.cooldownMs, 0, 1);
    const q = Math.ceil(ratio * 50);
    if (q !== this.lastEmit) {
      this.lastEmit = q;
      this.scene.events.emit(EVT.skillCooldown, q / 50);
    }
  }

  /** Ra chiêu; trả về false nếu lúc này không ra được (vd. đang bị đánh bật không lướt được). */
  private cast(time: number): boolean {
    if (this.id === 'shadowDash') return this.shadowDash(time);
    const p = this.player;
    audio.sfx('skill');
    this.fx.burst(p.x, p.y - 16, characters[p.characterId].color, 12);
    this.fx.vibrate(20);
    if (this.id === 'shurikenStorm') this.shurikenStorm();
    else if (this.id === 'whirlwind') this.whirlwind();
    else this.arrowRain();
    return true;
  }

  private centerY(): number {
    const p = this.player;
    return p.sm.is('prone') ? p.y - 6 : p.y - 16;
  }

  /** Kage: hai vòng phi tiêu toả ra mọi hướng, vòng sau xoay lệch nửa nhịp để lấp kẽ hở. */
  private shurikenStorm(): void {
    const s = skills.shurikenStorm;
    const p = this.player;
    audio.sfx('shuriken');
    for (let w = 0; w < s.waves; w++) {
      this.scene.time.delayedCall(w * s.waveGapMs, () => {
        if (p.dead) return;
        const step = (Math.PI * 2) / s.count;
        const off = (w % 2) * step * 0.5;
        const y = this.centerY();
        for (let i = 0; i < s.count; i++) {
          this.weapons.spawn({
            x: p.x,
            y,
            angle: off + i * step,
            speed: s.speed,
            damage: s.damage,
            lifetime: s.range / s.speed,
            texture: 'p-shuriken',
            behavior: 'straight',
            blocksBullets: true,
            scale: 1.2,
            tint: 0xffe27a,
          });
        }
      });
    }
  }

  /** Fuuka: thổi tan đạn quanh mình, rồi thả lốc xoáy trôi chậm về phía trước, cuốn và đánh nhiều lần. */
  private whirlwind(): void {
    const s = skills.whirlwind;
    const p = this.player;
    const dir = p.facing;
    audio.sfx('wind');
    this.combat.clearBulletsNear(p.x, p.y - 16, s.clearRadius);
    const t = this.weapons.spawn({
      x: p.x + dir * 18,
      y: p.y - 22,
      angle: dir > 0 ? 0 : Math.PI,
      speed: s.speed,
      damage: s.damage,
      lifetime: s.durationMs / 1000,
      texture: 'p-tornado',
      behavior: 'tornado',
      pierce: true,
      knockback: s.knockback,
      blocksBullets: true,
      passWalls: true,
      rehitMs: s.tickMs,
      scale: 1.6,
    });
    t?.setRotation(0); // lốc luôn đứng thẳng, kể cả khi trôi sang trái
  }

  /** Hayate: mưa tên xuyên giáp rơi chéo xuống vùng trước mặt, rải đều theo thứ tự xáo trộn. */
  private arrowRain(): void {
    const s = skills.arrowRain;
    const p = this.player;
    const dir = p.facing;
    const baseX = p.x;
    const groundY = p.y;
    const view = this.scene.cameras.main.worldView;
    audio.sfx('arrowCharged');
    for (let i = 0; i < s.count; i++) {
      this.scene.time.delayedCall((i * s.durationMs) / s.count, () => {
        // 5 nguyên tố cùng nhau với số mũi tên → rải khắp vùng thay vì rơi lần lượt từ gần ra xa
        const frac = (((i * 5) % s.count) + 0.5) / s.count;
        const tx = baseX + dir * (s.near + frac * (s.far - s.near));
        const y0 = view.y - 8;
        const drop = Math.max(40, groundY - y0);
        if (i % 3 === 0) audio.sfx('arrow');
        this.weapons.spawn({
          x: tx - dir * drop * RAIN_SLANT,
          y: y0,
          angle: Math.atan2(1, dir * RAIN_SLANT),
          speed: s.speed,
          damage: s.damage,
          lifetime: (drop + 80) / s.speed,
          texture: 'p-arrow',
          behavior: 'arrow',
          pierce: true,
          charged: true,
          scale: 1.1,
        });
      });
    }
  }

  /** Ren: lướt có bất tử, kèm đường chém chạy theo người (xuyên địch, xuyên giáp, phản đạn). */
  private shadowDash(time: number): boolean {
    const p = this.player;
    if (!p.startDash(time)) return false;
    audio.sfx('dash');
    const dir = p.facing;
    this.weapons.spawn({
      x: p.x + dir * 10,
      y: this.centerY(),
      angle: dir > 0 ? 0 : Math.PI,
      speed: DASH_SPEED,
      damage: skills.shadowDash.damage,
      lifetime: PLAYER.dashMs / 1000,
      texture: 'p-slash',
      behavior: 'straight',
      pierce: true,
      reflect: true,
      charged: true,
      scale: 0.9,
      tint: 0xff9a8a,
    });
    return true;
  }
}
