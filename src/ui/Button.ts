import type Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { COLORS, DEPTH } from '../constants';
import { makeText } from './text';

export interface ButtonOpts {
  size?: number;
  fill?: number;
  textColor?: string;
}

/** Nút chữ nhật có nhãn, kích hoạt khi nhả ngón trong vùng nút. */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  o: ButtonOpts = {},
): Phaser.GameObjects.Container {
  const fill = o.fill ?? 0x1c2548;
  const bg = scene.add.rectangle(0, 0, w, h, fill, 0.95).setStrokeStyle(2, COLORS.moon, 0.9);
  const text = makeText(scene, 0, 0, label, {
    size: o.size ?? 16,
    origin: 0.5,
    color: o.textColor ?? COLORS.text,
    align: 'center',
  });
  const c = scene.add.container(x, y, [bg, text]).setDepth(DEPTH.ui);
  c.setSize(w, h);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => bg.setFillStyle(0x3a4a8a, 1));
  bg.on('pointerout', () => bg.setFillStyle(fill, 0.95));
  bg.on('pointerup', () => {
    bg.setFillStyle(fill, 0.95);
    audio.sfx('select');
    onClick();
  });
  return c;
}

export function setButtonLabel(c: Phaser.GameObjects.Container, label: string): void {
  (c.list[1] as Phaser.GameObjects.Text).setText(label);
}
