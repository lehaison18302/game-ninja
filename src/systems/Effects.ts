import type Phaser from 'phaser';
import { DEPTH, POOL } from '../constants';
import { save } from './SaveSystem';

/** Hiệu ứng "game feel" gọn nhẹ, có giới hạn số lượng: hạt nổ (pool), hit-stop, rung màn, nháy, rung điện thoại. */
export class Effects {
  private emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private stopUntil = 0;

  constructor(private scene: Phaser.Scene) {
    this.emitter = scene.add
      .particles(0, 0, 'px', {
        speed: { min: 30, max: 150 },
        lifespan: { min: 180, max: 420 },
        scale: { start: 1.6, end: 0 },
        gravityY: 350,
        emitting: false,
        maxAliveParticles: POOL.particles,
      })
      .setDepth(DEPTH.fx);
    scene.events.on('resume', this.reset, this);
    scene.events.once('shutdown', () => scene.events.off('resume', this.reset, this));
  }

  burst(x: number, y: number, color: number, count = 10): void {
    this.emitter.setParticleTint(color);
    this.emitter.explode(count, x, y);
  }

  /** Dừng vật lý rất ngắn khi trúng đòn (cảm giác "nặng tay"). */
  hitStop(ms: number): void {
    const world = this.scene.physics.world;
    const until = this.scene.time.now + ms;
    if (until <= this.stopUntil) return;
    this.stopUntil = until;
    world.pause();
    this.scene.time.delayedCall(ms, () => {
      if (this.scene.time.now >= this.stopUntil - 1) world.resume();
    });
  }

  shake(ms = 90, intensity = 0.004): void {
    this.scene.cameras.main.shake(ms, intensity);
  }

  flash(ms = 80, r = 255, g = 255, b = 255): void {
    this.scene.cameras.main.flash(ms, r, g, b);
  }

  vibrate(ms: number): void {
    if (save.settings.vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  }

  /** Phòng hờ khi tiếp tục sau tạm dừng: không để vật lý bị kẹt ở trạng thái dừng. */
  reset(): void {
    this.stopUntil = 0;
    this.scene.physics.world.resume();
  }
}
