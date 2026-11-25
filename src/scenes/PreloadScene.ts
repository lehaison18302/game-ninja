import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W, STAGE_COUNT } from '../constants';
import { initCamera } from '../core/camera';
import { t } from '../text/t';
import { makeText } from '../ui/text';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    initCamera(this.cameras.main);
    const label = makeText(this, GAME_W / 2, GAME_H / 2 - 24, t('boot.loading'), { origin: 0.5 });
    const frame = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, 200, 10)
      .setStrokeStyle(1, COLORS.moon);
    const bar = this.add
      .rectangle(GAME_W / 2 - 99, GAME_H / 2, 0, 6, COLORS.moon)
      .setOrigin(0, 0.5);
    this.load.on('progress', (v: number) => bar.setSize(198 * v, 6));
    this.load.on('complete', () => {
      label.destroy();
      frame.destroy();
      bar.destroy();
    });

    this.load.setPath('maps');
    this.load.image('tiles', 'tiles.png');
    for (let i = 1; i <= STAGE_COUNT; i++)
      this.load.tilemapTiledJSON(`stage${i}`, `stage${i}.json`);
  }

  create(): void {
    this.scene.start('TitleScene');
  }
}
