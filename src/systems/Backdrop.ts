import Phaser from 'phaser';
import { DEPTH, GAME_H, GAME_W } from '../constants';

interface Layer {
  img: Phaser.GameObjects.TileSprite;
  factor: number;
}

/** Chủ đề nền theo màn: [bầu trời, [texture lớp, hệ số parallax][]]. */
const THEMES: Record<number, { sky: string; layers: [string, number][] }> = {
  1: {
    sky: 'sky',
    layers: [
      ['bg-far', 0.2],
      ['bg-mid', 0.45],
      ['bg-near', 0.7],
    ],
  },
  2: {
    sky: 'sky-2',
    layers: [
      ['bg2-far', 0.2],
      ['bg2-mid', 0.45],
      ['bg2-near', 0.7],
    ],
  },
  3: {
    sky: 'sky-3',
    layers: [
      ['bg3-far', 0.2],
      ['bg3-mid', 0.45],
      ['bg3-near', 0.7],
    ],
  },
};

/**
 * Nền nhiều lớp (parallax). Không dùng scrollFactor vì canvas được zoom quanh tâm;
 * thay vào đó mỗi frame đặt lớp nền theo vùng nhìn của camera.
 */
export class Backdrop {
  private sky: Phaser.GameObjects.Image;
  private layers: Layer[] = [];

  constructor(scene: Phaser.Scene, theme: number) {
    const def = THEMES[theme] ?? THEMES[1];
    this.sky = scene.add.image(0, 0, def.sky).setOrigin(0, 0).setDepth(DEPTH.bg);
    def.layers.forEach(([key, factor], i) => {
      const img = scene.add
        .tileSprite(0, 0, GAME_W, GAME_H, key)
        .setOrigin(0, 0)
        .setDepth(DEPTH.bg + 1 + i);
      this.layers.push({ img, factor });
    });
  }

  update(view: Phaser.Geom.Rectangle): void {
    this.sky.setPosition(view.x, view.y);
    for (const l of this.layers) {
      l.img.setPosition(view.x, view.y);
      l.img.tilePositionX = view.x * l.factor;
    }
  }
}
