import Phaser from 'phaser';
import { COLORS, GAME_W } from '../constants';
import { initCamera } from '../core/camera';
import { restartStage } from '../core/GameState';
import { save } from '../systems/SaveSystem';
import { t } from '../text/t';
import { makeButton, setButtonLabel } from '../ui/Button';
import { makeText } from '../ui/text';

const SCALES = [0.8, 1, 1.2, 1.4];

/** Tạm dừng + cài đặt (âm thanh, rung, cỡ nút cảm ứng). Chạy chồng lên GameScene đang tạm dừng. */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('PauseScene');
  }

  create(): void {
    initCamera(this.cameras.main);
    this.add.rectangle(0, 0, GAME_W, 270, 0x000000, 0.7).setOrigin(0, 0).setInteractive();
    makeText(this, GAME_W / 2, 22, t('pause.title'), {
      size: 28,
      origin: 0.5,
      color: COLORS.textGold,
    });

    const onOff = (v: boolean): string => t(v ? 'pause.on' : 'pause.off');
    const col = GAME_W / 2;

    makeButton(this, col, 62, 200, 30, t('pause.resume'), () => this.resume(), { size: 18 });

    const sound = makeButton(
      this,
      col,
      100,
      200,
      28,
      `${t('pause.sound')}: ${onOff(save.settings.sound)}`,
      () => {
        save.update({ sound: !save.settings.sound });
        this.sound.mute = !save.settings.sound;
        setButtonLabel(sound, `${t('pause.sound')}: ${onOff(save.settings.sound)}`);
      },
    );
    const vib = makeButton(
      this,
      col,
      134,
      200,
      28,
      `${t('pause.vibrate')}: ${onOff(save.settings.vibrate)}`,
      () => {
        save.update({ vibrate: !save.settings.vibrate });
        setButtonLabel(vib, `${t('pause.vibrate')}: ${onOff(save.settings.vibrate)}`);
      },
    );
    const sizeLabel = (): string =>
      `${t('pause.touchSize')}: ${Math.round(save.settings.touchScale * 100)}%`;
    const size = makeButton(this, col, 168, 200, 28, sizeLabel(), () => {
      const i = SCALES.indexOf(save.settings.touchScale);
      save.update({ touchScale: SCALES[(i + 1) % SCALES.length] });
      setButtonLabel(size, sizeLabel());
    });

    makeButton(this, col - 52, 214, 100, 28, t('pause.restart'), () => this.restart(), {
      size: 14,
    });
    makeButton(this, col + 52, 214, 100, 28, t('menu.mainMenu'), () => this.toMenu(), { size: 14 });

    this.input.keyboard?.on('keydown-P', () => this.resume());
    this.input.keyboard?.on('keydown-ESC', () => this.resume());
  }

  private resume(): void {
    this.scene.resume('GameScene');
    this.scene.resume('UIScene');
    this.scene.stop();
  }

  private restart(): void {
    restartStage();
    this.stopGame();
    this.scene.start('GameScene');
  }

  private toMenu(): void {
    this.stopGame();
    this.scene.start('TitleScene');
  }

  private stopGame(): void {
    this.scene.stop('UIScene');
    this.scene.stop('GameScene');
  }
}
