import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../constants';

/** Hình tạm cho Màn 2–3: boss, bẫy, nền nhiều lớp theo chủ đề. */
export function makeStageTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const tex = (key: string, w: number, h: number, draw: () => void): void => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };
  const rect = (x: number, y: number, w: number, h: number, c: number): void => {
    g.fillStyle(c, 1).fillRect(x, y, w, h);
  };
  const tri = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    c: number,
  ): void => {
    g.fillStyle(c, 1).fillTriangle(x1, y1, x2, y2, x3, y3);
  };

  // ---- bẫy & vật chuyển động
  tex('crumble', 16, 8, () => {
    rect(0, 0, 16, 8, 0x8a5a30);
    rect(0, 0, 16, 2, 0xb88a52);
    rect(0, 6, 16, 2, 0x5a3a20);
    rect(7, 2, 1, 4, 0x5a3a20);
  });
  tex('boat', 48, 16, () => {
    g.fillStyle(0x6a4424, 1).fillRoundedRect(0, 4, 48, 12, 4);
    rect(0, 2, 48, 3, 0xb88a52);
    rect(2, 5, 44, 1, 0x3a2a1a);
    rect(6, 9, 36, 1, 0x3a2a1a);
  });
  tex('conveyor', 16, 6, () => {
    rect(0, 0, 16, 6, 0x3d4463);
    tri(2, 1, 2, 5, 8, 3, 0xffb02e);
    tri(10, 1, 10, 5, 16, 3, 0xffb02e);
  });
  tex('firepillar', 16, 64, () => {
    for (let y = 0; y < 64; y += 2) {
      const w = 6 + Math.round(5 * Math.abs(Math.sin(y * 0.35)));
      rect(8 - w / 2, y, w, 2, y > 20 ? 0xe8641e : 0xff8a2e);
      rect(8 - w / 4, y, w / 2, 2, y > 30 ? 0xffb02e : 0xfff2a0);
    }
  });
  tex('fire-warn', 16, 8, () => {
    g.fillStyle(0xe8641e, 1).fillTriangle(8, 0, 2, 8, 14, 8);
    g.fillStyle(0xffb02e, 1).fillTriangle(8, 3, 5, 8, 11, 8);
  });
  tex('e-ball', 16, 16, () => {
    g.fillStyle(0x23273a, 1).fillCircle(8, 8, 7);
    g.fillStyle(0x4a5070, 1).fillCircle(6, 6, 3);
  });
  tex('e-mark', 16, 16, () => {
    g.lineStyle(2, 0xff3a2a, 1).strokeCircle(8, 8, 6);
    rect(7, 2, 2, 12, 0xff3a2a);
    rect(2, 7, 12, 2, 0xff3a2a);
  });

  // ---- boss màn 2: thuyền chiến đầu rồng (quay mặt sang trái, tựa đầu vào người chơi)
  const ship = (key: string, cannon: boolean, mouth: boolean): void =>
    tex(key, 112, 80, () => {
      g.fillStyle(0x3a2418, 1).fillRoundedRect(8, 44, 100, 30, 8);
      rect(8, 42, 100, 5, 0x6a4424);
      for (let x = 14; x < 104; x += 14) rect(x, 52, 3, 14, 0x5a3a20);
      rect(54, 4, 4, 42, 0x2a1a10);
      tri(58, 6, 58, 38, 100, 34, 0xd9c9a0);
      tri(58, 6, 58, 38, 40, 34, 0xc8b88a);
      rect(0, 30, 24, 20, 0x2d6a3a);
      tri(0, 30, 14, 20, 24, 30, 0x2d6a3a);
      rect(2, 34, 4, 4, 0xff3a2a);
      if (mouth) rect(0, 40, 18, 6, 0xffb02e);
      else rect(0, 41, 18, 3, 0x1a2a1a);
      rect(28, 36, 16, 8, 0x1a1a24);
      if (cannon) rect(24, 34, 10, 8, 0xffb02e);
      rect(86, 36, 16, 8, 0x1a1a24);
    });
  ship('boss-longthuyen', false, false);
  ship('boss-longthuyen-up', true, false);
  ship('boss-longthuyen-mouth', false, true);

  // ---- boss màn 3: Tướng Quân Bóng Tối
  const general = (key: string, up: boolean, glow: boolean): void =>
    tex(key, 48, 80, () => {
      rect(14, 56, 8, 24, 0x15151f);
      rect(26, 56, 8, 24, 0x15151f);
      rect(10, 24, 28, 34, 0x1d1d2b);
      rect(10, 46, 28, 3, 0x6a1010);
      tri(10, 28, 0, 70, 14, 62, 0x2a0a18);
      tri(38, 28, 48, 70, 34, 62, 0x2a0a18);
      const ay = up ? 8 : 30;
      rect(2, ay, 8, 26, 0x1d1d2b);
      rect(38, ay, 8, 26, 0x1d1d2b);
      if (up) {
        rect(0, 4, 4, 6, 0xdfe6f5);
        rect(44, 4, 4, 6, 0xdfe6f5);
      }
      rect(14, 4, 20, 22, 0x15151f);
      tri(14, 8, 8, -2, 20, 4, 0x6a1010);
      tri(34, 8, 40, -2, 28, 4, 0x6a1010);
      rect(18, 12, 5, 3, glow ? 0xffffff : 0xff3a2a);
      rect(26, 12, 5, 3, glow ? 0xffffff : 0xff3a2a);
      rect(18, 4, 12, 3, 0x6a1010);
    });
  general('boss-tuongquan', false, false);
  general('boss-tuongquan-up', true, false);
  general('boss-tuongquan-mouth', false, true);

  // ---- nền theo chủ đề: bầu trời + 3 lớp lặp 160px
  const sky = (key: string, top: number, bottom: number, glow: number): void =>
    tex(key, GAME_W, GAME_H, () => {
      const steps = 18;
      for (let i = 0; i < steps; i++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(top),
          Phaser.Display.Color.ValueToColor(bottom),
          steps,
          i,
        );
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
        g.fillRect(0, (i * GAME_H) / steps, GAME_W, GAME_H / steps + 1);
      }
      for (let i = 0; i < 34; i++) {
        g.fillStyle(0xffffff, 0.3 + (i % 3) * 0.2).fillRect(
          (i * 89) % GAME_W,
          (i * 47) % 130,
          1,
          1,
        );
      }
      g.fillStyle(glow, 0.14).fillCircle(380, 60, 36);
      g.fillStyle(glow, 1).fillCircle(380, 60, 20);
    });
  sky('sky-2', 0x0a1830, 0x2a4a6a, 0xdfe6f5);
  sky('sky-3', 0x2a0a14, 0x7a2a14, 0xff8a2e);

  const layer = (key: string, draw: () => void): void => tex(key, 160, GAME_H, draw);
  // Màn 2: làng chài
  layer('bg2-far', () => {
    tri(0, GAME_H, 40, 130, 90, GAME_H, 0x1a3050);
    tri(70, GAME_H, 120, 150, 160, GAME_H, 0x1a3050);
    rect(0, GAME_H - 40, 160, 40, 0x16283f);
  });
  layer('bg2-mid', () => {
    for (const x of [8, 62, 112]) {
      rect(x, GAME_H - 90, 36, 90, 0x142238);
      tri(x - 6, GAME_H - 90, x + 18, GAME_H - 118, x + 42, GAME_H - 90, 0x0f1a2c);
      rect(x + 12, GAME_H - 70, 6, 8, 0xffd36a);
    }
  });
  layer('bg2-near', () => {
    rect(40, 40, 4, GAME_H - 40, 0x0a1220);
    rect(24, 70, 36, 3, 0x0a1220);
    tri(44, 50, 44, 110, 80, 108, 0x0e1a2c);
    rect(120, 90, 3, GAME_H - 90, 0x0a1220);
  });
  // Màn 3: núi lửa & pháo đài
  layer('bg3-far', () => {
    tri(0, GAME_H, 80, 90, 160, GAME_H, 0x3a1410);
    tri(60, 100, 80, 82, 100, 100, 0xff6a2a);
    rect(0, GAME_H - 40, 160, 40, 0x2a0e0c);
  });
  layer('bg3-mid', () => {
    for (const x of [10, 70, 120]) {
      tri(x, GAME_H, x + 20, GAME_H - 110, x + 40, GAME_H, 0x24100e);
    }
  });
  layer('bg3-near', () => {
    for (const x of [20, 100]) {
      rect(x, GAME_H - 150, 30, 150, 0x140808);
      for (let i = 0; i < 4; i++) rect(x + i * 8, GAME_H - 158, 6, 8, 0x140808);
      rect(x + 12, GAME_H - 120, 6, 10, 0xff8a2e);
    }
  });

  g.destroy();
}
