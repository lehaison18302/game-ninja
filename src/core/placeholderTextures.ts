import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../constants';
import { makeStageTextures } from './placeholderStages';

/**
 * Hình tạm sinh bằng code (Giai đoạn đầu). Khi có spritesheet thật chỉ cần nạp lại cùng tên texture.
 * Mọi nhân vật vẽ quay mặt sang phải, quay trái bằng flipX. Ninja người chơi đã dùng ảnh thật
 * (public/sprites, nạp ở PreloadScene).
 */
export function makePlaceholderTextures(scene: Phaser.Scene): void {
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

  tex('px', 2, 2, () => rect(0, 0, 2, 2, 0xffffff));

  // đạn người chơi
  tex('p-shuriken', 9, 9, () => {
    g.fillStyle(0xdfe6f5, 1).fillTriangle(4, 0, 6, 4, 2, 4);
    g.fillTriangle(8, 4, 4, 6, 4, 2);
    g.fillTriangle(4, 8, 2, 4, 6, 4);
    g.fillTriangle(0, 4, 4, 2, 4, 6);
    rect(3, 3, 3, 3, 0x7a85a8);
  });
  tex('p-wind', 16, 16, () => {
    g.lineStyle(3, 0xbfeaff, 1).beginPath().arc(2, 8, 11, -1.0, 1.0, false).strokePath();
    g.lineStyle(1, 0xffffff, 1).beginPath().arc(2, 8, 9, -0.9, 0.9, false).strokePath();
  });
  tex('p-arrow', 18, 5, () => {
    rect(0, 2, 14, 1, 0xc9a26a);
    g.fillStyle(0xdfe6f5, 1).fillTriangle(18, 2, 13, 0, 13, 5);
    rect(0, 0, 3, 1, 0xe8e8e8);
    rect(0, 4, 3, 1, 0xe8e8e8);
  });
  tex('p-kunai', 10, 5, () => {
    g.fillStyle(0xdfe6f5, 1).fillTriangle(10, 2, 3, 0, 3, 5);
    rect(0, 1, 3, 3, 0x6a4a2a);
  });
  tex('p-slash', 40, 32, () => {
    g.lineStyle(5, 0xffffff, 1).beginPath().arc(8, 16, 26, -0.9, 0.9, false).strokePath();
    g.lineStyle(2, 0xff9a8a, 1).beginPath().arc(8, 16, 22, -0.8, 0.8, false).strokePath();
  });
  tex('p-tornado', 20, 28, () => {
    for (let i = 0; i < 6; i++) {
      const w = 18 - i * 2.6;
      g.lineStyle(2, i % 2 ? 0xbfeaff : 0xffffff, 0.95).strokeEllipse(
        10 + (i % 2),
        3 + i * 4.4,
        w,
        4.5,
      );
    }
  });
  tex('p-blast', 32, 32, () => {
    g.fillStyle(0xffb02e, 0.9).fillCircle(16, 16, 15);
    g.fillStyle(0xfff2a0, 1).fillCircle(16, 16, 9);
  });

  // nền: bầu trời đêm + trăng
  tex('sky', GAME_W, GAME_H, () => {
    const steps = 18;
    for (let i = 0; i < steps; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(0x0b, 0x10, 0x26),
        new Phaser.Display.Color(0x2b, 0x2a, 0x5a),
        steps,
        i,
      );
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (i * GAME_H) / steps, GAME_W, GAME_H / steps + 1);
    }
    for (let i = 0; i < 40; i++) {
      g.fillStyle(0xffffff, 0.4 + (i % 3) * 0.2).fillRect((i * 97) % GAME_W, (i * 53) % 150, 1, 1);
    }
    g.fillStyle(0xffe27a, 0.15).fillCircle(380, 56, 34);
    g.fillStyle(0xffe27a, 1).fillCircle(380, 56, 20);
    g.fillStyle(0xf0cf5e, 1).fillCircle(374, 52, 4);
  });

  // ---- kẻ địch (vẽ quay mặt sang phải)
  tex('enemy-ashigaru', 24, 32, () => {
    rect(7, 22, 4, 10, 0x2a2a3a);
    rect(13, 22, 4, 10, 0x2a2a3a);
    rect(5, 11, 14, 12, 0x5b5f73);
    rect(5, 19, 14, 2, 0xc8321e);
    rect(17, 12, 6, 3, 0x2a2a3a);
    rect(7, 4, 10, 8, 0xe8c9a0);
    g.fillStyle(0x8a8fa8, 1).fillTriangle(12, -1, 4, 6, 20, 6);
    rect(5, 5, 14, 2, 0x8a8fa8);
    rect(14, 7, 2, 1, 0x000000);
  });
  tex('enemy-archer', 24, 32, () => {
    rect(7, 22, 4, 10, 0x1f2a22);
    rect(13, 22, 4, 10, 0x1f2a22);
    rect(6, 11, 12, 12, 0x3d6b3a);
    rect(7, 3, 10, 9, 0x2c4a2a);
    rect(11, 6, 6, 3, 0xe8c9a0);
    rect(14, 7, 2, 1, 0x000000);
    g.lineStyle(2, 0x9a6a3a, 1).beginPath().arc(20, 16, 10, -1.4, 1.4, false).strokePath();
    rect(20, 7, 1, 18, 0xe8e8e8);
  });
  tex('enemy-turret', 24, 24, () => {
    rect(2, 12, 20, 12, 0x5a6283);
    rect(2, 12, 20, 2, 0x76809f);
    g.fillStyle(0x3d4463, 1).fillCircle(12, 11, 9);
    g.fillStyle(0x76809f, 1).fillCircle(12, 11, 5);
    rect(11, 10, 2, 2, 0xc8321e);
  });
  tex('enemy-turret-barrel', 14, 6, () => {
    rect(0, 0, 14, 6, 0x2a2f4a);
    rect(0, 0, 14, 1, 0x76809f);
    rect(11, 1, 3, 4, 0x8a93b8);
  });
  tex('enemy-crow', 24, 16, () => {
    g.fillStyle(0x3a3f55, 1).fillEllipse(12, 9, 16, 9);
    g.fillStyle(0x23273a, 1).fillTriangle(6, 8, 12, 0, 14, 8);
    g.fillStyle(0x23273a, 1).fillTriangle(10, 8, 16, 15, 18, 8);
    g.fillStyle(0xc9a26a, 1).fillTriangle(19, 8, 24, 10, 19, 11);
    rect(17, 6, 2, 2, 0xff3a2a);
  });
  tex('enemy-redninja', 24, 32, () => {
    rect(7, 22, 4, 10, 0x15151f);
    rect(13, 22, 4, 10, 0x15151f);
    rect(6, 11, 12, 12, 0x1d1d2b);
    rect(6, 19, 12, 2, 0xe0382a);
    rect(7, 2, 10, 10, 0x15151f);
    rect(11, 5, 6, 3, 0xe8c9a0);
    rect(14, 6, 2, 1, 0xff3a2a);
    rect(7, 3, 10, 2, 0xe0382a);
    rect(3, 4, 4, 2, 0xe0382a);
    rect(16, 14, 6, 3, 0x15151f);
  });
  tex('enemy-barrel', 16, 16, () => {
    g.fillStyle(0x7a4a24, 1).fillCircle(8, 8, 8);
    g.lineStyle(2, 0x2a2018, 1).strokeCircle(8, 8, 6);
    rect(7, 0, 2, 16, 0x2a2018);
    rect(0, 7, 16, 2, 0x2a2018);
    rect(7, 7, 2, 2, 0xff8a2e);
  });
  tex('enemy-carrier', 24, 20, () => {
    g.fillStyle(0xe8341e, 1).fillEllipse(12, 11, 18, 14);
    rect(5, 9, 14, 2, 0xffd36a);
    rect(5, 13, 14, 2, 0xffd36a);
    rect(10, 1, 4, 3, 0x3a2a1a);
    rect(10, 18, 4, 2, 0x3a2a1a);
  });
  // vật phẩm
  tex('item-upgrade', 16, 16, () => {
    rect(2, 4, 12, 8, 0xf2e6c0);
    rect(2, 3, 12, 2, 0xc9a26a);
    rect(2, 11, 12, 2, 0xc9a26a);
    rect(7, 6, 2, 4, 0xc8321e);
    rect(6, 7, 4, 2, 0xc8321e);
  });
  tex('item-rice', 16, 16, () => {
    g.fillStyle(0xf4f1e1, 1).fillTriangle(8, 1, 1, 14, 15, 14);
    rect(5, 9, 6, 5, 0x1b1f33);
  });
  tex('item-shield', 16, 16, () => {
    g.fillStyle(0x3a8dff, 1).fillCircle(8, 8, 7);
    g.fillStyle(0xbfeaff, 1).fillCircle(8, 8, 4);
    rect(7, 3, 2, 10, 0x3a8dff);
  });
  tex('item-smoke', 16, 16, () => {
    g.fillStyle(0x8a93b8, 1).fillCircle(8, 9, 6);
    g.fillStyle(0xcfd6e6, 1).fillCircle(6, 7, 3);
    rect(7, 1, 2, 4, 0x3a2a1a);
    rect(8, 0, 3, 1, 0xff8a2e);
  });
  // đạn địch
  tex('e-arrow', 12, 3, () => {
    rect(0, 1, 9, 1, 0xc9a26a);
    g.fillStyle(0xe8e8e8, 1).fillTriangle(12, 1, 8, 0, 8, 3);
  });
  tex('e-shuriken', 8, 8, () => {
    g.fillStyle(0xff5a4a, 1).fillTriangle(4, 0, 6, 4, 2, 4);
    g.fillTriangle(8, 4, 4, 6, 4, 2);
    g.fillTriangle(4, 8, 2, 4, 6, 4);
    g.fillTriangle(0, 4, 4, 2, 4, 6);
  });
  tex('e-bolt', 10, 4, () => {
    rect(0, 1, 7, 2, 0xff9a2e);
    g.fillStyle(0xfff2a0, 1).fillTriangle(10, 2, 6, 0, 6, 4);
  });

  // ---- boss màn 1: tượng gỗ khổng lồ (đối xứng, hướng vào người chơi)
  const datou = (key: string, armsUp: boolean, mouth: boolean): void =>
    tex(key, 64, 96, () => {
      rect(12, 70, 16, 26, 0x5a3a20);
      rect(36, 70, 16, 26, 0x5a3a20);
      rect(8, 28, 48, 46, 0x7a4e2a);
      for (let y = 34; y < 72; y += 8) rect(10, y, 44, 1, 0x5a3a20);
      rect(8, 56, 48, 4, 0xc8321e);
      const ay = armsUp ? 4 : 34;
      rect(0, ay, 10, 36, 0x6a4424);
      rect(54, ay, 10, 36, 0x6a4424);
      rect(14, 0, 36, 32, 0x8a5a30);
      g.fillStyle(0x5a3a20, 1).fillTriangle(14, 6, 10, -2, 22, 2);
      g.fillTriangle(50, 6, 54, -2, 42, 2);
      rect(20, 12, 6, 5, 0xff3a2a);
      rect(38, 12, 6, 5, 0xff3a2a);
      if (mouth) {
        rect(22, 20, 20, 12, 0xffb02e);
        rect(26, 22, 12, 8, 0xfff2a0);
      } else rect(24, 22, 16, 5, 0x2a1208);
    });
  datou('boss-datou', false, false);
  datou('boss-datou-up', true, false);
  datou('boss-datou-mouth', false, true);
  tex('e-rock', 16, 16, () => {
    g.fillStyle(0x6a6f85, 1).fillCircle(8, 8, 8);
    g.fillStyle(0x8a90a8, 1).fillCircle(6, 6, 4);
    rect(9, 9, 4, 1, 0x3d4463);
    rect(4, 11, 3, 1, 0x3d4463);
  });
  tex('e-fire', 16, 16, () => {
    g.fillStyle(0xe8641e, 1).fillCircle(8, 8, 8);
    g.fillStyle(0xffb02e, 1).fillCircle(8, 8, 5);
    g.fillStyle(0xfff2a0, 1).fillCircle(8, 8, 2);
  });

  // tim HUD (mặt nạ 7×6, phóng 2×)
  const heartRows = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const heart = (key: string, fill: number): void =>
    tex(key, 16, 14, () => {
      heartRows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch === 'X') g.fillStyle(fill, 1).fillRect(1 + x * 2, 1 + y * 2, 2, 2);
        }),
      );
    });
  heart('heart-full', 0xe8341e);
  heart('heart-empty', 0x3a4064);

  // rừng tre 3 lớp (mỗi lớp lặp ngang 160px)
  const bamboo = (
    key: string,
    color: number,
    hi: number,
    w: number,
    tall: number,
    xs: number[],
  ): void =>
    tex(key, 160, GAME_H, () => {
      g.fillStyle(color, 1).fillRect(0, GAME_H - 60, 160, 60);
      for (const x of xs) {
        const top = GAME_H - tall - ((x * 7) % 40);
        g.fillStyle(color, 1).fillRect(x, top, w, GAME_H - top);
        g.fillStyle(hi, 1).fillRect(x, top, 1, GAME_H - top);
        for (let y = top + 12; y < GAME_H; y += 22) g.fillStyle(hi, 1).fillRect(x - 1, y, w + 2, 2);
        g.fillStyle(color, 1).fillTriangle(x + w, top + 30, x + w + 14, top + 22, x + w, top + 38);
      }
    });
  bamboo('bg-far', 0x1b2850, 0x26366a, 3, 170, [6, 40, 78, 118, 146]);
  bamboo('bg-mid', 0x142040, 0x1d2d5a, 4, 200, [22, 62, 104, 138]);
  bamboo('bg-near', 0x0d1630, 0x142244, 6, 240, [14, 94]);

  g.destroy();
  makeStageTextures(scene);
}
