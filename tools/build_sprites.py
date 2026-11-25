"""
Cắt ảnh nhân vật vẽ tay (art/ninjas/*.jpg, nền trắng) thành spritesheet dùng trong game.

    python tools/build_sprites.py        (cần: pip install pillow numpy scipy)

Ra:
  public/sprites/ninja-<id>.png   lưới khung đều nhau, gốc chân ở giữa đáy mỗi ô
  src/data/ninjaSprites.ts        kích thước ô + chỉ số khung của từng động tác

Khung vẽ ở độ phân giải gấp đôi (RENDER_SCALE) rồi hiển thị scale 0.5 → nét như ảnh gốc trên canvas.
Chọn khung (hàng, cột) ở bảng SHEETS bên dưới; bỏ các khung vẽ lệch màu/lệch nhân vật.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
from sprite_detect import figures, load  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
#: chiều cao tư thế đứng, đơn vị pixel texture (= 2× pixel logic)
TARGET_H = 72
COLS = 8


def r(row, *cols):
    return [(row, c) for c in cols]


# Mỗi nhân vật: ảnh nguồn + khung cho từng động tác (hàng, cột) theo thứ tự phát.
SHEETS = {
    'kage': {
        'src': 'kiem.jpg',
        'anims': {
            'idle': r(0, 0, 1, 2, 3, 4, 5, 6, 7),
            'run': r(1, 0, 1, 2, 3, 4, 5, 6, 7),
            'jump': r(2, 1, 2),
            'fall': r(2, 3),
            'crouch': r(2, 4),
            'attack': r(3, 3, 4, 5),
        },
    },
    'fuuka': {
        'src': 'quat.jpg',
        'anims': {
            'idle': r(0, 0, 1, 2, 3, 4, 5, 6, 7),
            'run': r(1, 0, 3, 7),  # các khung còn lại vẽ lệch màu áo
            'jump': r(1, 7),
            'fall': r(1, 0),
            'crouch': r(2, 0),
            'attack': r(3, 4, 5, 6),
        },
    },
    'hayate': {
        'src': 'cung.jpg',
        'erase': [(0, 578, 150, 614)],  # chữ "Shoot Bow"
        'anims': {
            'idle': r(0, 1, 2, 3, 4, 5, 6, 7),
            'run': r(1, 0, 1, 2, 3, 4, 5, 6, 7),
            'jump': r(2, 2),
            'fall': r(2, 3),
            'crouch': r(2, 0),
            'aim': r(3, 0, 1, 2),
            'attack': r(3, 5, 6),
        },
    },
    'ren': {
        'src': 'kunai.jpg',
        'anims': {
            'idle': r(0, 0, 1, 2, 3, 4),
            'run': r(0, 5, 6, 7) + r(1, 0, 1),
            'dash': r(1, 2, 3, 4),
            'jump': r(2, 1),
            'fall': r(2, 2),
            'crouch': r(2, 0),
            'attack': r(3, 3, 1),
        },
    },
}


def anchor_x(mask):
    """Tâm ngang của đầu + thân (bỏ tay/chân/vũ khí vung ra) → khung không bị lắc khi đổi tư thế."""
    h = mask.shape[0]
    band = mask[int(h * 0.05): int(h * 0.5)]
    cols = band.sum(axis=0).astype(float)
    # chỉ lấy phần "đặc" nhất của dải (thân), không tính tay vươn ra
    thick = cols >= max(1.0, cols.max() * 0.45)
    xs = np.nonzero(thick)[0]
    return float((xs * cols[xs]).sum() / cols[xs].sum())


def cut(rgb, f):
    """Trả về (ảnh RGBA đã thu nhỏ, toạ độ neo x trong ảnh) của một tư thế."""
    m = f['mask']
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    m = m[y0:y1, x0:x1]
    crop = rgb[f['y0'] + y0: f['y0'] + y1, f['x0'] + x0: f['x0'] + x1].astype(np.uint8)
    return crop, m, anchor_x(m)


def shrink(crop, m, s):
    h, w = m.shape
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    a = m.astype(np.float32)
    pre = crop.astype(np.float32) * a[..., None]
    pre_img = [Image.fromarray(pre[..., i]).resize((nw, nh), Image.BOX) for i in range(3)]
    a_img = np.asarray(Image.fromarray(a).resize((nw, nh), Image.BOX))
    out = np.zeros((nh, nw, 4), np.uint8)
    keep = a_img >= 0.5
    for i in range(3):
        ch = np.asarray(pre_img[i]) / np.maximum(a_img, 1e-6)
        out[..., i] = np.clip(ch, 0, 255).astype(np.uint8)
    out[..., 3] = np.where(keep, 255, 0)
    return out


def build(cid, cfg):
    rgb = load(os.path.join(ROOT, 'art', 'ninjas', cfg['src']))
    rows = figures(rgb, cfg.get('erase', ()))
    idle = [rows[rr][cc] for rr, cc in cfg['anims']['idle']]
    idle_h = float(np.median([f['mask'].any(axis=1).sum() for f in idle]))
    s = TARGET_H / idle_h

    order, index, frames = {}, {}, []
    for name, cells in cfg['anims'].items():
        idx = []
        for cell in cells:
            if cell not in order:
                crop, m, ax = cut(rgb, rows[cell[0]][cell[1]])
                img = shrink(crop, m, s)
                order[cell] = len(frames)
                frames.append((img, ax * s))
            idx.append(order[cell])
        index[name] = idx

    left = max(ax for _, ax in frames)
    right = max(img.shape[1] - ax for img, ax in frames)
    half = int(np.ceil(max(left, right))) + 1
    fw = half * 2
    fh = max(img.shape[0] for img, _ in frames) + 1
    n = len(frames)
    cols = min(COLS, n)
    sheet = np.zeros((fh * ((n + cols - 1) // cols), fw * cols, 4), np.uint8)
    for i, (img, ax) in enumerate(frames):
        cx, cy = (i % cols) * fw, (i // cols) * fh
        ox = cx + int(round(half - ax))
        oy = cy + fh - img.shape[0]
        sheet[oy: oy + img.shape[0], ox: ox + img.shape[1]] = img
    out = os.path.join(ROOT, 'public', 'sprites', f'ninja-{cid}.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    Image.fromarray(sheet, 'RGBA').save(out, optimize=True)
    print(f'{cid}: {n} frames {fw}x{fh} -> {os.path.relpath(out, ROOT)}')
    return {'frameWidth': fw, 'frameHeight': fh, 'anims': index}


def main():
    meta = {cid: build(cid, cfg) for cid, cfg in SHEETS.items()}
    lines = [
        '// TỰ SINH bởi tools/build_sprites.py – đừng sửa tay, chạy lại script.',
        "import type { CharacterId } from './types';",
        '',
        "export type NinjaAnim = 'idle' | 'run' | 'jump' | 'fall' | 'crouch' | 'attack' | 'aim' | 'dash';",
        '',
        'export interface NinjaSprite {',
        '  /** Kích thước một ô (pixel texture = 2× pixel logic). Gốc chân ở giữa đáy ô. */',
        '  frameWidth: number;',
        '  frameHeight: number;',
        '  /** Chỉ số khung theo thứ tự phát; thiếu động tác nào thì dùng động tác thay thế. */',
        '  anims: Partial<Record<NinjaAnim, number[]>>;',
        '}',
        '',
        'export const NINJA_SPRITES: Record<CharacterId, NinjaSprite> = {',
    ]
    for cid, m in meta.items():
        lines.append(f'  {cid}: {{')
        lines.append(f"    frameWidth: {m['frameWidth']},")
        lines.append(f"    frameHeight: {m['frameHeight']},")
        lines.append('    anims: {')
        for name, idx in m['anims'].items():
            lines.append(f"      {name}: [{', '.join(map(str, idx))}],")
        lines.append('    },')
        lines.append('  },')
    lines.append('};')
    with open(os.path.join(ROOT, 'src', 'data', 'ninjaSprites.ts'), 'w', encoding='utf-8', newline='\n') as fp:
        fp.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
