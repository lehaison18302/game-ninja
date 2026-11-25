import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { COLORS, GAME_H, GAME_W } from '../constants';
import { initCamera } from '../core/camera';
import { resetRun } from '../core/GameState';
import { save } from '../systems/SaveSystem';
import { t } from '../text/t';
import { makeText } from '../ui/text';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create(): void {
    initCamera(this.cameras.main);
    audio.music('title');
    this.add.image(0, 0, 'sky').setOrigin(0, 0);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'bg-mid').setOrigin(0, 0);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, 'bg-near').setOrigin(0, 0);

    const title = makeText(this, GAME_W / 2, 70, t('game.title'), {
      size: 48,
      origin: 0.5,
      color: COLORS.textGold,
    });
    makeText(this, GAME_W / 2, 108, t('game.subtitle'), { size: 20, origin: 0.5 });
    this.tweens.add({
      targets: title,
      y: 74,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (save.highScore > 0) {
      makeText(this, GAME_W / 2, 150, `${t('menu.highScore')}: ${save.highScore}`, {
        origin: 0.5,
        color: COLORS.textDim,
      });
    }

    const tap = makeText(this, GAME_W / 2, 210, t('menu.tapToStart'), { size: 20, origin: 0.5 });
    this.tweens.add({ targets: tap, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    const start = (): void => {
      audio.sfx('select');
      try {
        if (this.sys.game.device.input.touch && !this.scale.isFullscreen)
          this.scale.startFullscreen();
      } catch {
        /* trình duyệt không cho toàn màn hình */
      }
      resetRun();
      this.scene.start('SelectScene');
    };
    this.input.once('pointerdown', start);
    this.input.keyboard?.once('keydown', start);
  }
}
