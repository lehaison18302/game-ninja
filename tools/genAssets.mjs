// Sinh asset tạm: icon PWA, tileset và các map (định dạng Tiled JSON, mở sửa được bằng Tiled).
// Chạy: node tools/genAssets.mjs
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// ---------- PNG encoder ----------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
class Canvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 4);
  }
  set(x, y, hex, a = 255) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px[i] = (hex >> 16) & 255;
    this.px[i + 1] = (hex >> 8) & 255;
    this.px[i + 2] = hex & 255;
    this.px[i + 3] = a;
  }
  rect(x, y, w, h, hex, a = 255) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex, a);
  }
}
const save = (rel, buf) => {
  const p = join(ROOT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, buf);
  console.log('ghi', rel);
};

// ---------- Icon PWA ----------
function icon(size) {
  const c = new Canvas(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const k = Math.round(0x10 + v * 0x28);
      let col = (k << 16) | ((k + 6) << 8) | (k + 40);
      const dm = Math.hypot(u - 0.5, v - 0.5);
      if (dm < 0.4) col = 0xffe27a; // trăng
      const dh = Math.hypot(u - 0.5, v - 0.54);
      if (dh < 0.27) col = 0x15192e; // đầu ninja
      if (dh < 0.27 && v > 0.47 && v < 0.6) col = 0xe8c9a0; // mắt/da lộ ra
      if (dh < 0.27 && v > 0.4 && v <= 0.47) col = 0xc8321e; // khăn đỏ
      if (
        dh < 0.27 &&
        v > 0.485 &&
        v < 0.575 &&
        (Math.abs(u - 0.43) < 0.03 || Math.abs(u - 0.57) < 0.03)
      )
        col = 0x0b1026;
      c.set(x, y, col);
    }
  }
  return encodePng(size, size, c.px);
}
save('icons/icon-192.png', icon(192));
save('icons/icon-512.png', icon(512));

// ---------- Tileset 8 ô 16×16 ----------
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const tiles = new Canvas(128, 16);
const T = (i) => i * 16;
// 1: đất có rêu
for (let y = 0; y < 16; y++)
  for (let x = 0; x < 16; x++) {
    let col = 0x3b2f4a;
    if (rnd() < 0.12) col = 0x2e2540;
    else if (rnd() < 0.06) col = 0x50405e;
    if (y < 3) col = rnd() < 0.3 ? 0x4a9a6a : 0x2f6b4f;
    if (y === 3 && rnd() < 0.5) col = 0x2f6b4f;
    tiles.set(T(0) + x, y, col);
  }
// 2: đất
for (let y = 0; y < 16; y++)
  for (let x = 0; x < 16; x++) {
    let col = 0x3b2f4a;
    if (rnd() < 0.14) col = 0x2e2540;
    else if (rnd() < 0.06) col = 0x50405e;
    tiles.set(T(1) + x, y, col);
  }
// 3: sàn tre mỏng
tiles.rect(T(2), 0, 16, 5, 0x6fae5a);
tiles.rect(T(2), 0, 16, 1, 0x9fd88a);
tiles.rect(T(2), 4, 16, 1, 0x3f7a3a);
for (const x of [3, 8, 13]) tiles.rect(T(2) + x, 0, 1, 5, 0x3f7a3a);
// 4: gai
for (let i = 0; i < 4; i++) {
  const bx = T(3) + i * 4;
  for (let y = 0; y < 12; y++) {
    const half = Math.floor((y / 12) * 2);
    tiles.rect(bx + 2 - half, 4 + y, half * 2 || 1, 1, 0xcfd6e6);
    tiles.set(bx + 2 + half, 4 + y, 0x7a85a8);
  }
}
tiles.rect(T(3), 14, 16, 2, 0x3b2f4a);
// 5: đá
tiles.rect(T(4), 0, 16, 16, 0x5a6283);
for (const y of [0, 5, 10, 15]) tiles.rect(T(4), y, 16, 1, 0x3d4463);
for (const [x, y0] of [
  [8, 0],
  [3, 5],
  [12, 5],
  [8, 10],
  [3, 15],
])
  tiles.rect(T(4) + x, y0, 1, 5, 0x3d4463);
tiles.rect(T(4), 1, 16, 1, 0x76809f);
// 6: ván cầu
tiles.rect(T(5), 0, 16, 4, 0x9a6a3a);
tiles.rect(T(5), 0, 16, 1, 0xc08a52);
tiles.rect(T(5), 3, 16, 1, 0x5e3d20);
for (const x of [5, 11]) tiles.rect(T(5) + x, 0, 1, 4, 0x5e3d20);
tiles.rect(T(5), 4, 1, 4, 0xb89a6a);
tiles.rect(T(5) + 15, 4, 1, 4, 0xb89a6a);
// 7: nước
tiles.rect(T(6), 0, 16, 16, 0x2a5fa8, 200);
for (let x = 0; x < 16; x += 4) tiles.rect(T(6) + x, 2 + (x % 8 ? 1 : 0), 3, 1, 0x8fc4ff);
// 8: lửa
for (let x = 0; x < 16; x++) {
  const h = 6 + Math.round(6 * Math.abs(Math.sin(x * 0.9)));
  tiles.rect(T(7) + x, 16 - h, 1, h, 0xe8641e);
  tiles.rect(T(7) + x, 16 - Math.floor(h * 0.6), 1, Math.floor(h * 0.6), 0xffb02e);
  tiles.rect(T(7) + x, 16 - Math.floor(h * 0.3), 1, Math.floor(h * 0.3), 0xfff2a0);
}
save('maps/tiles.png', encodePng(128, 16, tiles.px));

// ---------- Map builder (Tiled JSON) ----------
const GRASS = 1,
  DIRT = 2,
  BAMBOO = 3,
  SPIKE = 4,
  STONE = 5,
  PLANK = 6,
  WATER = 7,
  FIRE = 8;

class MapBuilder {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.ground = new Array(w * h).fill(0);
    this.platforms = new Array(w * h).fill(0);
    this.hazards = new Array(w * h).fill(0);
    this.spawns = [];
    this.markers = [];
    this.nextId = 1;
  }
  /** Đất đặc từ cột x0..x1, bề mặt ở hàng top. */
  land(x0, x1, top, top1 = GRASS, fill = DIRT) {
    for (let x = x0; x <= x1; x++)
      for (let y = top; y < this.h; y++) this.ground[y * this.w + x] = y === top ? top1 : fill;
  }
  platform(x0, x1, row, tile = BAMBOO) {
    for (let x = x0; x <= x1; x++) this.platforms[row * this.w + x] = tile;
  }
  hazard(x0, x1, row, tile = SPIKE) {
    for (let x = x0; x <= x1; x++) this.hazards[row * this.w + x] = tile;
  }
  spawn(type, tx, ty, props = {}) {
    this.spawns.push(this.obj(type, tx * 16 + 8, ty * 16, props));
  }
  marker(type, px, py, props = {}, size) {
    this.markers.push(this.obj(type, px, py, props, size));
  }
  obj(type, x, y, props, size) {
    const o = {
      id: this.nextId++,
      name: type,
      type,
      x,
      y,
      width: size ? size[0] : 0,
      height: size ? size[1] : 0,
      rotation: 0,
      visible: true,
      point: !size,
    };
    const keys = Object.keys(props);
    if (keys.length)
      o.properties = keys.map((name) => ({
        name,
        type: typeof props[name] === 'number' ? 'float' : 'string',
        value: props[name],
      }));
    return o;
  }
  json() {
    const tl = (id, name, data) => ({
      id,
      name,
      type: 'tilelayer',
      data,
      width: this.w,
      height: this.h,
      x: 0,
      y: 0,
      opacity: 1,
      visible: true,
    });
    const og = (id, name, objects) => ({
      id,
      name,
      type: 'objectgroup',
      draworder: 'topdown',
      objects,
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
    });
    return JSON.stringify({
      compressionlevel: -1,
      width: this.w,
      height: this.h,
      tilewidth: 16,
      tileheight: 16,
      infinite: false,
      orientation: 'orthogonal',
      renderorder: 'right-down',
      tiledversion: '1.10.2',
      type: 'map',
      version: '1.10',
      nextlayerid: 6,
      nextobjectid: this.nextId,
      layers: [
        tl(1, 'ground', this.ground),
        tl(2, 'platforms', this.platforms),
        tl(3, 'hazards', this.hazards),
        og(4, 'spawns', this.spawns),
        og(5, 'markers', this.markers),
      ],
      tilesets: [
        {
          firstgid: 1,
          name: 'tiles',
          image: 'tiles.png',
          imagewidth: 128,
          imageheight: 16,
          tilewidth: 16,
          tileheight: 16,
          tilecount: 8,
          columns: 8,
          margin: 0,
          spacing: 0,
        },
      ],
    });
  }
}

// ---------- Màn 1: Rừng tre đêm trăng (200 × 17 ô = 3200 × 272 px) ----------
function stage1() {
  const m = new MapBuilder(200, 17);
  const G = 13; // hàng mặt đất
  m.land(0, 38, G);
  m.platform(14, 19, 11);
  m.platform(26, 31, 11);
  m.platform(21, 24, 9);
  m.land(42, 70, G);
  m.hazard(55, 56, G - 1);
  m.platform(48, 53, 11);
  m.platform(58, 63, 11);
  m.platform(60, 65, 9);
  // cầu treo qua vực
  m.platform(71, 86, G, PLANK);
  m.land(87, 99, G);
  m.land(100, 115, G - 2, GRASS, DIRT);
  m.hazard(108, 109, G - 3);
  m.land(116, 120, G);
  m.land(124, 150, G);
  m.platform(128, 133, 11);
  m.platform(134, 139, 9);
  m.platform(140, 145, 11);
  m.hazard(146, 147, G - 1);
  m.land(154, 199, G);
  // sàn trong khu đấu boss
  m.platform(172, 177, 11);
  m.platform(181, 186, 9);
  m.platform(190, 195, 11);

  // kẻ địch: spawn(loại, cột, hàng-chân, {count, interval})
  m.spawn('ashigaru', 34, G);
  m.spawn('ashigaru', 44, G, { count: 2, interval: 900 });
  m.spawn('archer', 51, 11);
  m.spawn('crow', 60, 8);
  m.spawn('barrel', 66, G);
  m.spawn('redninja', 76, G);
  m.spawn('crow', 80, 8);
  m.spawn('turret', 92, G);
  m.spawn('archer', 98, G);
  m.spawn('ashigaru', 103, G - 2, { count: 2, interval: 800 });
  m.spawn('redninja', 110, G - 2);
  m.spawn('barrel', 118, G);
  m.spawn('ashigaru', 126, G, { count: 3, interval: 700 });
  m.spawn('archer', 131, 11);
  m.spawn('turret', 137, 9);
  m.spawn('crow', 141, 7, { count: 2, interval: 600 });
  m.spawn('redninja', 148, G);
  m.spawn('ashigaru', 156, G, { count: 2, interval: 800 });
  m.spawn('barrel', 161, G);

  // đèn lồng mang vật phẩm bay ngang màn hình (bắn rơi để nhặt)
  m.spawn('carrier', 30, 6, { drop: 'upgrade' });
  m.spawn('carrier', 56, 6, { drop: 'rice' });
  m.spawn('carrier', 72, 5, { drop: 'shield' });
  m.spawn('carrier', 96, 6, { drop: 'upgrade' });
  m.spawn('carrier', 114, 6, { drop: 'rice' });
  m.spawn('carrier', 130, 5, { drop: 'smoke' });
  m.spawn('carrier', 152, 6, { drop: 'rice' });

  m.marker('playerStart', 48, G * 16);
  m.marker('checkpoint', 42 * 16, G * 16);
  m.marker('checkpoint', 124 * 16, G * 16);
  m.marker('bossZone', 170 * 16, 0, {}, [30 * 16, 272]);
  m.marker('boss', 193 * 16, G * 16);
  return m;
}

// ---------- tiện ích bố cục thêm cho màn 2, 3 ----------
MapBuilder.prototype.water = function (x0, x1, row0, row1, tile = WATER) {
  for (let r = row0; r <= row1; r++) this.hazard(x0, x1, r, tile);
};
/** Dải sàn sập: mỗi ô 16×8 tự sập sau khi đứng lên. */
MapBuilder.prototype.crumbleRun = function (x0, x1, row) {
  for (let c = x0; c <= x1; c++) this.marker('crumble', c * 16, row * 16, {}, [16, 8]);
};
MapBuilder.prototype.boat = function (col, row, props = {}) {
  this.marker('boat', col * 16, row * 16 - 2, props, [48, 16]);
};
MapBuilder.prototype.conveyor = function (x0, x1, row, speed) {
  this.marker('conveyor', x0 * 16, row * 16, { speed }, [(x1 - x0 + 1) * 16, 6]);
};
/** Cột lửa đứng trên bề mặt hàng `row`, cao 4 ô. */
MapBuilder.prototype.pillar = function (col, row, period = 3200, offset = 0) {
  this.marker('firePillar', col * 16, row * 16 - 64, { period, offset }, [16, 64]);
};
MapBuilder.prototype.carriers = function (list) {
  for (const [col, row, drop] of list) this.spawn('carrier', col, row, { drop });
};

// ---------- Màn 2: Làng chài bị chiếm (220 × 17 ô = 3520 × 272 px) ----------
function stage2() {
  const m = new MapBuilder(220, 17);
  const G = 13;
  // bến tàu
  m.land(0, 34, G, STONE, STONE);
  m.platform(12, 17, 11);
  m.platform(22, 27, 11);
  // 5 chiếc thuyền chòng chành nối nhau qua mặt nước
  m.water(35, 58, 14, 16);
  [36, 41, 46, 51, 56].forEach((c, i) =>
    m.boat(c, G, { amp: 5, period: 3000 + i * 250, phase: i * 1.3 }),
  );
  // mái nhà bậc thang
  m.land(59, 70, 12, STONE, STONE);
  m.land(71, 79, 10, STONE, STONE);
  m.land(80, 88, 8, STONE, STONE);
  m.land(89, 96, 10, STONE, STONE);
  m.land(97, 106, 12, STONE, STONE);
  m.hazard(75, 76, 9);
  // sàn sập trên mặt nước
  m.water(107, 125, 14, 16);
  m.crumbleRun(108, 124, G);
  // bờ bên kia
  m.land(126, 150, G, STONE, STONE);
  m.platform(130, 135, 11);
  m.platform(140, 145, 11);
  m.hazard(138, 139, G - 1);
  // thuyền lớn dao động mạnh
  m.water(151, 170, 14, 16);
  [152, 157, 162].forEach((c, i) => m.boat(c, G, { amp: 7, period: 2600 + i * 300, phase: i * 2 }));
  m.land(171, 219, G, STONE, STONE);
  m.platform(194, 199, 11);
  m.platform(201, 206, 9);
  m.platform(208, 212, 11);

  m.spawn('ashigaru', 34, G);
  m.spawn('crow', 40, 8);
  m.spawn('crow', 50, 7);
  m.spawn('archer', 66, 12);
  m.spawn('redninja', 74, 10);
  m.spawn('archer', 84, 8);
  m.spawn('crow', 90, 6);
  m.spawn('ashigaru', 100, 12, { count: 2, interval: 800 });
  m.spawn('barrel', 104, 12);
  m.spawn('crow', 112, 8, { count: 2, interval: 700 });
  m.spawn('crow', 120, 9);
  m.spawn('ashigaru', 128, G, { count: 3, interval: 700 });
  m.spawn('archer', 133, 11);
  m.spawn('turret', 139, G);
  m.spawn('redninja', 146, G);
  m.spawn('crow', 148, 7, { count: 2, interval: 600 });
  m.spawn('crow', 156, 8);
  m.spawn('crow', 164, 7);
  m.spawn('ashigaru', 174, G, { count: 2, interval: 800 });
  m.spawn('barrel', 178, G);
  m.spawn('archer', 183, G);
  m.spawn('redninja', 186, G);
  m.carriers([
    [46, 6, 'shield'],
    [66, 5, 'upgrade'],
    [100, 5, 'rice'],
    [122, 6, 'smoke'],
    [146, 6, 'rice'],
    [165, 6, 'upgrade'],
    [182, 6, 'rice'],
  ]);

  m.marker('playerStart', 48, G * 16);
  m.marker('checkpoint', 126 * 16, G * 16);
  m.marker('bossZone', 190 * 16, 0, {}, [30 * 16, 272]);
  m.marker('boss', 214 * 16, G * 16);
  return m;
}

// ---------- Màn 3: Pháo đài trên núi lửa (230 × 34 ô = 3680 × 544 px, có đoạn leo dọc) ----------
function stage3() {
  const m = new MapBuilder(230, 34);
  const G = 30; // tầng dưới
  const T = 13; // tầng trên (sau đoạn leo)
  // đoạn A: băng chuyền ngược chiều + cột lửa
  m.land(0, 40, G, STONE, STONE);
  m.conveyor(12, 24, G, -45);
  m.platform(16, 21, 28, PLANK);
  m.pillar(32, G, 3200, 0);
  m.pillar(36, G, 3200, 1600);
  m.water(41, 43, 31, 33, FIRE);
  // đoạn B: sàn sập trên dung nham
  m.land(44, 55, G, STONE, STONE);
  m.water(56, 64, 31, 33, FIRE);
  m.crumbleRun(56, 64, G);
  m.land(65, 70, G, STONE, STONE);
  m.pillar(48, G, 2800, 800);
  m.pillar(67, G, 3000, 0);
  // đoạn C: leo dọc theo bậc thang (cuộn camera lên trên)
  m.water(71, 106, 31, 33, FIRE);
  for (let k = 0; k < 8; k++) m.platform(74 + 4 * k, 77 + 4 * k, 28 - 2 * k, PLANK);
  m.pillar(88, 22, 3400, 600);
  m.pillar(96, 18, 3400, 2300);
  // đoạn D: tầng trên
  m.land(107, 229, T, STONE, STONE);
  m.conveyor(122, 134, T, 50);
  m.pillar(116, T, 3000, 0);
  m.pillar(140, T, 3000, 1500);
  m.hazard(146, 147, T - 1);
  m.crumbleRun(150, 158, T);
  // khoét một đoạn đất cho sàn sập (xoá đất cột 150–158)
  for (let x = 150; x <= 158; x++) for (let y = T; y < 34; y++) m.ground[y * m.w + x] = 0;
  m.water(150, 158, 31, 33, FIRE);
  m.platform(168, 173, 11, PLANK);
  m.platform(178, 183, 11, PLANK);
  m.platform(204, 209, 11, PLANK);
  m.platform(212, 217, 9, PLANK);
  m.platform(220, 225, 11, PLANK);

  // địch
  m.spawn('ashigaru', 34, G);
  m.spawn('archer', 18, 28);
  m.spawn('turret', 38, G);
  m.spawn('ashigaru', 48, G, { count: 2, interval: 800 });
  m.spawn('redninja', 52, G);
  m.spawn('crow', 60, 26);
  m.spawn('archer', 68, G);
  m.spawn('crow', 80, 22);
  m.spawn('archer', 87, 22);
  m.spawn('crow', 92, 20);
  m.spawn('archer', 95, 18);
  m.spawn('turret', 99, 16);
  m.spawn('crow', 102, 14);
  m.spawn('ashigaru', 112, T, { count: 3, interval: 700 });
  m.spawn('redninja', 119, T);
  m.spawn('turret', 126, T);
  m.spawn('archer', 130, T);
  m.spawn('barrel', 136, T);
  m.spawn('crow', 142, 8, { count: 2, interval: 600 });
  m.spawn('ashigaru', 162, T, { count: 2, interval: 800 });
  m.spawn('redninja', 168, 11);
  m.spawn('archer', 176, T);
  m.spawn('turret', 180, 11);
  m.spawn('barrel', 186, T);
  m.spawn('ashigaru', 190, T, { count: 2, interval: 700 });
  m.spawn('redninja', 195, T);
  m.carriers([
    [30, 26, 'upgrade'],
    [58, 26, 'rice'],
    [84, 22, 'shield'],
    [98, 18, 'rice'],
    [120, 8, 'smoke'],
    [148, 8, 'rice'],
    [172, 8, 'upgrade'],
    [192, 8, 'rice'],
  ]);

  m.marker('playerStart', 48, G * 16);
  m.marker('checkpoint', 44 * 16, G * 16);
  m.marker('checkpoint', 107 * 16, T * 16);
  m.marker('bossZone', 200 * 16, 0, {}, [30 * 16, 272]);
  m.marker('boss', 224 * 16, T * 16);
  return m;
}

mkdirSync(join(ROOT, 'maps'), { recursive: true });
for (const [name, build] of [
  ['stage1', stage1],
  ['stage2', stage2],
  ['stage3', stage3],
]) {
  writeFileSync(join(ROOT, 'maps', `${name}.json`), build().json());
  console.log(`ghi maps/${name}.json`);
}
