import type Phaser from 'phaser';
import { COLORS, DEPTH, FONT_FAMILY, RENDER_SCALE } from '../constants';
import { t } from '../text/t';
import type { TextKey } from '../text/vi';

export interface TextOpts {
  size?: number;
  color?: string;
  origin?: number | [number, number];
  align?: 'left' | 'center' | 'right';
  stroke?: boolean;
  wrap?: number;
  depth?: number;
}

/** Tạo chữ pixel nét cao (resolution = RENDER_SCALE). Cỡ chữ logic tối thiểu 12. */
export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  o: TextOpts = {},
): Phaser.GameObjects.Text {
  const size = Math.max(12, o.size ?? 16);
  const obj = scene.add.text(x, y, text, {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    color: o.color ?? COLORS.text,
    align: o.align ?? 'left',
    stroke: '#000000',
    strokeThickness: o.stroke === false ? 0 : 2,
    wordWrap: o.wrap ? { width: o.wrap } : undefined,
    resolution: RENDER_SCALE,
  });
  const org = o.origin ?? 0;
  if (Array.isArray(org)) obj.setOrigin(org[0], org[1]);
  else obj.setOrigin(org);
  obj.setDepth(o.depth ?? DEPTH.ui);
  return obj;
}

export function makeTextKey(
  scene: Phaser.Scene,
  x: number,
  y: number,
  key: TextKey,
  o: TextOpts = {},
): Phaser.GameObjects.Text {
  return makeText(scene, x, y, t(key), o);
}
