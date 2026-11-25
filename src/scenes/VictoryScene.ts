import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { COLORS, GAME_W } from '../constants';
import { initCamera } from '../core/camera';
import { resetRun, run } from '../core/GameState';
import { save } from '../systems/SaveSystem';
import { t } from '../text/t';
import { makeButton } from '../ui/Button';
import { makeText } from '../ui/text';

/** Qua hết các màn. */
export class VictoryScene extends Phaser.Scene {
  constructor() {
    super('VictoryScene');
  }

  create(): void {
    initCamera(this.cameras.main);
    audio.music('title');
    audio.sfx('clear');
    this.add.image(0, 0, 'sky').setOrigin(0, 0);
    this.add.tileSprite(0, 0, GAME_W, 270, 'bg-near').setOrigin(0, 0);
    const record = save.submitScore(run.score);

    makeText(this, GAME_W / 2, 56, t('victory.title'), {
      size: 44,
      origin: 0.5,
      color: COLORS.textGold,
    });
    makeText(this, GAME_W / 2, 100, t('victory.sub'), { size: 16, origin: 0.5 });
    makeText(this, GAME_W / 2, 136, `${t('gameover.score')}: ${run.score}`, {
      size: 24,
      origin: 0.5,
    });
    if (record)
      makeText(this, GAME_W / 2, 162, t('gameover.newRecord'), {
        size: 18,
        origin: 0.5,
        color: COLORS.textGold,
      });

    makeButton(
      this,
      GAME_W / 2,
      220,
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
