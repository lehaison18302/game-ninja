import type Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { EVT } from '../constants';
import { run } from '../core/GameState';
import { StateMachine } from '../core/StateMachine';
import type { Boss } from '../entities/Boss';
import type { Player } from '../entities/Player';

export type FlowState =
  'intro' | 'advancing' | 'bossWarning' | 'bossFight' | 'stageClear' | 'gameOver';

const INTRO_MS = 1800;
const WARNING_MS = 2400;
const CLEAR_MS = 3800;
const NO_HIT_BONUS = 1000;
/** Người chơi vào sâu bao nhiêu px trong khu đấu boss thì bắt đầu cảnh báo. */
const ZONE_ENTRY_PX = 90;

export interface StageHost {
  scene: Phaser.Scene;
  player: Player;
  /** x đầu khu đấu boss (undefined nếu màn không có boss). */
  zoneX: number | undefined;
  /** Màn không mất tim nào? */
  noHit(): boolean;
  /** Dọn địch thường, chặn spawn. */
  clearEnemies(): void;
  /** Khoá camera ở khu đấu boss. */
  lockCamera(): void;
  /** Tạo boss của màn. */
  createBoss(): Boss;
  /** Chuyển sang màn kế/chiến thắng. */
  finish(): void;
}

/** State machine của màn: Intro → Advancing → BossWarning → BossFight → StageClear (hoặc GameOver). */
export class StageFlow {
  readonly sm: StateMachine<StageFlow, FlowState>;
  boss: Boss | null = null;
  private bossDown = false;

  constructor(private host: StageHost) {
    const scene = host.scene;
    this.sm = new StateMachine<StageFlow, FlowState>(this, () => scene.time.now);
    this.sm
      .add('intro', {
        update: (f) => {
          if (f.sm.elapsed >= INTRO_MS) f.sm.set('advancing');
        },
      })
      .add('advancing', {
        update: (f) => {
          const z = f.host.zoneX;
          if (z !== undefined && f.host.player.x >= z + ZONE_ENTRY_PX) f.sm.set('bossWarning');
        },
      })
      .add('bossWarning', {
        enter: (f) => {
          f.host.clearEnemies();
          f.host.lockCamera();
          audio.sfx('warning');
          scene.events.emit(EVT.bossWarning);
        },
        update: (f) => {
          if (f.sm.elapsed >= WARNING_MS) f.sm.set('bossFight');
        },
      })
      .add('bossFight', {
        enter: (f) => {
          audio.music('boss');
          f.bossDown = false;
          f.boss = f.host.createBoss();
          f.boss.engage();
        },
        update: (f, time, delta) => {
          f.boss?.update(time, delta);
          if (f.bossDown) f.sm.set('stageClear');
        },
      })
      .add('stageClear', {
        enter: (f) => {
          let bonus = 0;
          if (f.host.noHit()) {
            bonus = NO_HIT_BONUS;
            run.score += bonus;
            scene.events.emit(EVT.scoreChanged, run.score);
          }
          audio.sfx('clear');
          scene.events.emit(EVT.stageClear, bonus);
        },
        update: (f) => {
          if (f.sm.elapsed >= CLEAR_MS) f.host.finish();
        },
      })
      .add('gameOver', {});

    scene.events.on(EVT.bossDefeated, this.onBossDefeated, this);
    scene.events.once('shutdown', () =>
      scene.events.off(EVT.bossDefeated, this.onBossDefeated, this),
    );
    this.sm.set('intro');
  }

  update(time: number, delta: number): void {
    this.sm.update(time, delta);
  }

  /** Người chơi thua: dừng mọi diễn biến của màn. */
  gameOver(): void {
    this.sm.set('gameOver');
  }

  get state(): FlowState | null {
    return this.sm.current;
  }

  private onBossDefeated(): void {
    this.bossDown = true;
  }
}
