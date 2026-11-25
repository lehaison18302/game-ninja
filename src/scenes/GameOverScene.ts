import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { COLORS, GAME_W } from '../constants';
import { initCamera } from '../core/camera';
import { continueStage, resetRun, run } from '../core/GameState';
import { save } from '../systems/SaveSystem';
import { t } from '../text/t';
import { makeButton } from '../ui/Button';
import { makeText } from '../ui/text';

/** Hết mạng: Chơi tiếp từ đầu màn hiện tại (điểm về 0) hoặc về màn hình chính. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  create(): void {
    initCamera(this.cameras.main);
    audio.music(null);
    audio.sfx('gameover');
    this.add.image(0, 0, 'sky').setOrigin(0, 0);
    this.add.rectangle(0, 0, GAME_W, 270, 0x000000, 0.55).setOrigin(0, 0);

    const record = save.submitScore(run.score);
    makeText(this, GAME_W / 2, 56, t('gameover.title'), {
      size: 44,
      origin: 0.5,
      color: COLORS.textRed,
    });
    makeText(this, GAME_W / 2, 108, `${t('gameover.score')}: ${run.score}`, {
      size: 22,
      origin: 0.5,
    });
    if (record) {
      makeText(this, GAME_W / 2, 134, t('gameover.newRecord'), {
        size: 18,
        origin: 0.5,
        color: COLORS.textGold,
      });
    } else {
      makeText(this, GAME_W / 2, 134, `${t('menu.highScore')}: ${save.highScore}`, {
        size: 14,
        origin: 0.5,
        color: COLORS.textDim,
      });
    }

    makeButton(
      this,
      GAME_W / 2,
      182,
      220,
      34,
      t('gameover.retry'),
      () => {
        continueStage();
        this.scene.start('SelectScene');
      },
      { size: 20 },
    );
    makeButton(
      this,
      GAME_W / 2,
      226,
      220,
      34,
      t('gameover.menu'),
      () => {
        resetRun();
        this.scene.start('TitleScene');
      },
      { size: 20 },
    );
  }
}
