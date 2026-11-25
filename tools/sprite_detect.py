"""Tìm các tư thế (figure) trong một sprite sheet nền trắng: trả về danh sách mặt nạ + khung bao."""
import numpy as np
from PIL import Image
from scipy import ndimage

MIN_FIG_H = 60  # nhỏ hơn thế là chữ nhãn / đạn bay → bỏ


def load(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(np.int16)


def foreground(im, erase=()):
    lo = im.min(axis=2)
    hi = im.max(axis=2)
    fg = (lo < 215) | ((hi - lo) > 45)
    # xoá đường kẻ lưới (sheet chia ô): hàng/cột gần như toàn điểm tối
    dark = hi < 110
    h, w = fg.shape
    rows = np.where(dark.mean(axis=1) > 0.85)[0]
    for d in range(-2, 3):
        fg[np.clip(rows + d, 0, h - 1)] = False
    edges = [0, *[int(r) for r in rows], h]
    for a, b in zip(edges, edges[1:]):
        if b - a < 20:
            continue
        cols = np.where(dark[a:b].mean(axis=0) > 0.8)[0]
        for d in range(-2, 3):
            fg[a:b, np.clip(cols + d, 0, w - 1)] = False
    for x0, y0, x1, y1 in erase:  # chữ nhãn nằm sát tư thế
        fg[y0:y1, x0:x1] = False
    # viền trắng ngà do nén JPG quanh nét đen: gọt các điểm sáng nằm ở mép
    light = (lo > 165) & ((hi - lo) < 40)
    for _ in range(2):
        pad = np.pad(fg, 1)
        inner = pad[:-2, 1:-1] & pad[2:, 1:-1] & pad[1:-1, :-2] & pad[1:-1, 2:]
        fg &= ~(light & ~inner)
    return fg


def figures(im, erase=()):
    fg = foreground(im, erase)
    closed = ndimage.binary_closing(fg, structure=np.ones((3, 3)), iterations=1)
    lab, n = ndimage.label(closed, structure=np.ones((3, 3)))
    sl = ndimage.find_objects(lab)
    figs, small = [], []
    for i, s in enumerate(sl, start=1):
        ys, xs = s
        hgt = ys.stop - ys.start
        item = dict(id=i, y0=ys.start, y1=ys.stop, x0=xs.start, x1=xs.stop)
        if xs.stop - xs.start <= 8:
            continue  # vệt đường kẻ còn sót
        (figs if hgt >= MIN_FIG_H else small).append(item)
    # mảnh nhỏ nằm sát/trong khung của một tư thế (dây cung, mép áo) → gộp vào tư thế đó
    for f in figs:
        f['ids'] = [f['id']]
    for s in small:
        for f in figs:
            if s['x0'] >= f['x0'] - 3 and s['x1'] <= f['x1'] + 3 and s['y0'] >= f['y0'] - 3 and s['y1'] <= f['y1'] + 3:
                f['ids'].append(s['id'])
                break
    # mảnh lớn chồng lên nhau theo chiều ngang (tư thế bị đứt đôi do màu nhạt) → gộp
    figs.sort(key=lambda f: f['x0'])
    merged = []
    for f in figs:
        for g in merged:
            ov_x = min(g['x1'], f['x1']) - max(g['x0'], f['x0'])
            ov_y = min(g['y1'], f['y1']) - max(g['y0'], f['y0'])
            thin = min(f['x1'] - f['x0'], g['x1'] - g['x0']) < 60
            if thin and ov_x > -12 and ov_y > 0.5 * min(g['y1'] - g['y0'], f['y1'] - f['y0']):
                if True:
                    for k in ('y0', 'x0'):
                        g[k] = min(g[k], f[k])
                    for k in ('y1', 'x1'):
                        g[k] = max(g[k], f[k])
                    g['ids'] += f['ids']
                    break
        else:
            merged.append(f)
    figs = merged
    for f in figs:
        f['mask'] = np.isin(lab[f['y0']:f['y1'], f['x0']:f['x1']], f['ids']) & fg[f['y0']:f['y1'], f['x0']:f['x1']]
    # chia hàng theo tâm dọc, mỗi hàng sắp trái → phải
    figs.sort(key=lambda f: (f['y0'] + f['y1']) / 2)
    rows = []
    for f in figs:
        cy = (f['y0'] + f['y1']) / 2
        if rows and abs(cy - rows[-1][0]) < 70:
            rows[-1][1].append(f)
        else:
            rows.append((cy, [f]))
    return [sorted(r, key=lambda f: f['x0']) for _, r in rows]
