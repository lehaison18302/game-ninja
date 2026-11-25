import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { DEPTH, EVT, PLAYER } from '../constants';
import { run } from '../core/GameState';
import { applyHeal, applyHit, downgradeLevel, type HitOutcome, type Vitals } from '../core/rules';
import type { Vec } from '../data/types';
import type { Player } from '../entities/Player';
import type { Effects } from './Effects';

const SHIELD_HIT_IFRAMES = 700;
const DEATH_DELAY_MS = 1200;

/** Tim, mạng, khiên, hồi sinh. Mọi nguồn sát thương đi qua `hit()` / `fell()`; luật tính nằm ở core/rules.ts. */
export class HealthSystem {
  shield = false;
  /** Đã mất tim trong màn này (cho thưởng "không mất tim"). */
  tookHit = false;
  private ring: Phaser.GameObjects.Arc;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private fx: Effects,
    /** Điểm hồi sinh (đã kẹp vào vùng nhìn của camera). */
    private respawnPoint: () => Vec,
  ) {
    this.ring = scene.add
      .circle(0, 0, 17, 0x6fd0ff, 0.18)
      .setStrokeStyle(2, 0xbfeaff, 0.9)
      .setDepth(DEPTH.player + 1)
      .setVisible(false);
  }

  /** Gọi mỗi frame: vòng khiên bám theo người chơi. */
  update(): void {
    if (!this.shield) return;
    this.ring.setPosition(this.player.x, this.player.y - 16);
    this.ring.setVisible(!this.player.dead);
  }

  /** Nhận một đòn từ nguồn ở toạ độ x. Trả về true nếu đòn có hiệu lực (kể cả bị khiên chặn). */
  hit(fromX: number): boolean {
    const time = this.scene.time.now;
    const p = this.player;
    if (!p.canBeHit(time)) return false;

    const outcome = this.apply(false);
    if (outcome === 'absorbed') {
      p.invulnUntil = time + SHIELD_HIT_IFRAMES;
      this.fx.burst(p.x, p.y - 16, 0x6fd0ff, 10);
      this.fx.flash(60, 120, 200, 255);
      audio.sfx('shield');
      return true;
    }
    this.heartLostFx();
    this.scene.events.emit(EVT.playerHit);
    if (outcome === 'hurt') p.hurt(fromX, time);
    else this.onLifeLost(outcome === 'gameOver');
    return true;
  }

  /** Rơi xuống vực / chạm bẫy chết người: mất 1 tim (khiên không cứu) rồi về điểm an toàn. */
  fell(): void {
    const p = this.player;
    if (p.dead) return;
    const outcome = this.apply(true);
    this.heartLostFx();
    if (outcome === 'hurt') {
      const at = this.respawnPoint();
      p.respawn(at.x, at.y, this.scene.time.now, PLAYER.hurtIframes);
    } else {
      this.onLifeLost(outcome === 'gameOver');
    }
  }

  heal(): boolean {
    const v = this.vitals();
    if (!applyHeal(v, PLAYER.hearts)) return false;
    run.hearts = v.hearts;
    this.scene.events.emit(EVT.heartsChanged, run.hearts);
    return true;
  }

  setShield(on: boolean): void {
    this.shield = on;
    this.ring.setVisible(on);
    this.scene.events.emit(EVT.shieldChanged, on);
  }

  private vitals(): Vitals {
    return { hearts: run.hearts, lives: run.lives, shield: this.shield };
  }

  private apply(ignoreShield: boolean): HitOutcome {
    const v = this.vitals();
    const outcome = applyHit(v, ignoreShield);
    run.hearts = v.hearts;
    run.lives = v.lives;
    if (v.shield !== this.shield) this.setShield(v.shield);
    if (outcome !== 'absorbed') {
      this.tookHit = true;
      this.scene.events.emit(EVT.heartsChanged, run.hearts);
    }
    return outcome;
  }

  private heartLostFx(): void {
    this.fx.hitStop(PLAYER.hitStopMs);
    this.fx.shake();
    this.fx.flash(60, 255, 70, 70);
    this.fx.vibrate(80);
    audio.sfx('hurt');
  }

  private onLifeLost(gameOver: boolean): void {
    const p = this.player;
    p.die();
    audio.sfx('die');
    this.setShield(false);
    run.weaponLevel = downgradeLevel(run.weaponLevel);
    this.scene.events.emit(EVT.livesChanged, run.lives);
    this.scene.events.emit(EVT.weaponChanged);
    this.scene.events.emit(EVT.playerDied);
    this.fx.burst(p.x, p.y - 16, 0xe0382a, 16);

    this.scene.time.delayedCall(DEATH_DELAY_MS, () => {
      if (gameOver) {
        this.scene.events.emit(EVT.gameOver);
        return;
      }
      run.hearts = PLAYER.hearts;
      this.scene.events.emit(EVT.heartsChanged, run.hearts);
      const at = this.respawnPoint();
      p.respawn(at.x, at.y, this.scene.time.now, PLAYER.respawnIframes);
      this.scene.events.emit(EVT.playerRespawn);
    });
  }
}
