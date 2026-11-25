import Phaser from 'phaser';
import { DEPTH } from '../constants';
import type { Player } from '../entities/Player';
import type { HealthSystem } from './HealthSystem';
import type { StageTerrain } from './TerrainBuilder';

type Img = Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
type Obj = Phaser.Types.Tilemaps.TiledObject;

const SHAKE_MS = 450;
const FALL_MS = 500;
const RESPAWN_MS = 3200;
const LAND_TOLERANCE = 8;

interface Crumble {
  img: Img;
  homeX: number;
  homeY: number;
  /** 0 nguyên vẹn, 1 rung (cảnh báo), 2 rơi, 3 đã biến mất. */
  st: number;
  t: number;
}
interface Boat {
  img: Img;
  amp: number;
  period: number;
  phase: number;
}
interface Conveyor {
  belt: Phaser.GameObjects.TileSprite;
  x: number;
  y: number;
  w: number;
  speed: number;
}
interface Pillar {
  col: Phaser.GameObjects.Image;
  warn: Phaser.GameObjects.Image;
  x: number;
  y: number;
  w: number;
  h: number;
  period: number;
  offset: number;
}

function num(o: Obj, name: string, fallback: number): number {
  const list = o.properties as { name: string; value: number }[] | undefined;
  const v = list?.find((p) => p.name === name)?.value;
  return typeof v === 'number' ? v : fallback;
}

/**
 * Bẫy/vật chuyển động đọc từ lớp `markers` của Tiled:
 * crumble (sàn sập), boat (thuyền chòng chành), conveyor (băng chuyền), firePillar (cột lửa).
 */
export class HazardSystem {
  private crumbles: Crumble[] = [];
  private crumbleOf = new Map<Img, Crumble>();
  private boats: Boat[] = [];
  private belts: Conveyor[] = [];
  private pillars: Pillar[] = [];

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    terrain: StageTerrain,
    private health: HealthSystem,
  ) {
    const crumbleGroup = scene.physics.add.group({ allowGravity: false, immovable: true });
    const boatGroup = scene.physics.add.group({ allowGravity: false, immovable: true });

    for (const o of terrain.markers) {
      const x = o.x ?? 0;
      const y = o.y ?? 0;
      switch (o.name) {
        case 'crumble': {
          const img = scene.physics.add
            .image(x, y, 'crumble')
            .setOrigin(0, 0)
            .setDepth(DEPTH.tiles + 1) as Img;
          crumbleGroup.add(img);
          img.setImmovable(true).body.setAllowGravity(false);
          const c: Crumble = { img, homeX: x, homeY: y, st: 0, t: 0 };
          this.crumbles.push(c);
          this.crumbleOf.set(img, c);
          break;
        }
        case 'boat': {
          const img = scene.physics.add
            .image(x, y, 'boat')
            .setOrigin(0, 0)
            .setDepth(DEPTH.tiles + 1) as Img;
          boatGroup.add(img);
          img.setImmovable(true).body.setAllowGravity(false);
          img.body.setSize(48, 6, false).setOffset(0, 2);
          this.boats.push({
            img,
            amp: num(o, 'amp', 5),
            period: num(o, 'period', 3200),
            phase: num(o, 'phase', 0),
          });
          break;
        }
        case 'conveyor': {
          const w = o.width ?? 48;
          const belt = scene.add
            .tileSprite(x, y, w, 6, 'conveyor')
            .setOrigin(0, 0)
            .setDepth(DEPTH.tiles + 1);
          this.belts.push({ belt, x, y, w, speed: num(o, 'speed', 50) });
          break;
        }
        case 'firePillar': {
          const w = o.width ?? 16;
          const h = o.height ?? 64;
          const col = scene.add
            .image(x + w / 2, y + h, 'firepillar')
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.fx)
            .setVisible(false);
          const warn = scene.add
            .image(x + w / 2, y + h, 'fire-warn')
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.fx)
            .setVisible(false);
          this.pillars.push({
            col,
            warn,
            x,
            y,
            w,
            h,
            period: num(o, 'period', 3200),
            offset: num(o, 'offset', 0),
          });
          break;
        }
      }
    }

    // sàn một chiều: chỉ đáp từ trên xuống (và xuyên xuống được như sàn mỏng)
    scene.physics.add.collider(
      player,
      crumbleGroup,
      (_p, c) => this.onCrumbleTouched(c as Img),
      (_p, c) => this.landing(c as Img),
    );
    scene.physics.add.collider(player, boatGroup, undefined, (_p, b) => this.landing(b as Img));
  }

  update(time: number, delta: number): void {
    const p = this.player;
    const pb = p.body as Phaser.Physics.Arcade.Body;

    // băng chuyền
    p.externalVx = 0;
    for (const b of this.belts) {
      b.belt.tilePositionX -= (b.speed * delta) / 1000;
      if (
        pb.blocked.down &&
        pb.right > b.x &&
        pb.left < b.x + b.w &&
        Math.abs(pb.bottom - b.y) < 6
      ) {
        p.externalVx += b.speed;
      }
    }

    // thuyền chòng chành
    for (const b of this.boats) {
      const w = (Math.PI * 2) / b.period;
      b.img.body.setVelocityY(b.amp * w * 1000 * Math.cos(w * time + b.phase));
    }

    // sàn sập
    for (const c of this.crumbles) this.updateCrumble(c, delta);

    // cột lửa: tắt → nháy báo hiệu (≥ 0.3s) → phun
    for (const f of this.pillars) {
      const ph = ((time + f.offset) % f.period) / f.period;
      const on = ph >= 0.65;
      const warn = ph >= 0.42 && !on;
      f.col.setVisible(on);
      f.warn.setVisible(warn && Math.floor(time / 90) % 2 === 0);
      if (on && pb.right > f.x && pb.left < f.x + f.w && pb.bottom > f.y && pb.top < f.y + f.h) {
        this.health.hit(f.x + f.w / 2);
      }
    }
  }

  /** Va chạm một chiều: đáp từ trên xuống, không đang xuyên sàn. */
  private landing(plat: Img): boolean {
    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    if (this.scene.time.now <= this.player.dropUntil || this.player.dead) return false;
    return pb.velocity.y >= 0 && pb.bottom <= plat.body.top + LAND_TOLERANCE;
  }

  private onCrumbleTouched(img: Img): void {
    const c = this.crumbleOf.get(img);
    if (c && c.st === 0 && (this.player.body as Phaser.Physics.Arcade.Body).touching.down) {
      c.st = 1;
      c.t = 0;
    }
  }

  private updateCrumble(c: Crumble, delta: number): void {
    if (c.st === 0) return;
    c.t += delta;
    const img = c.img;
    if (c.st === 1) {
      img.x = c.homeX + (Math.floor(c.t / 40) % 2 === 0 ? -1 : 1);
      if (c.t >= SHAKE_MS) {
        c.st = 2;
        c.t = 0;
        img.x = c.homeX;
        img.body.enable = false;
      }
    } else if (c.st === 2) {
      img.y += (delta / 1000) * 180;
      img.setAlpha(Math.max(0, 1 - c.t / FALL_MS));
      if (c.t >= FALL_MS) {
        c.st = 3;
        img.setVisible(false);
      }
    } else if (c.t >= RESPAWN_MS) {
      c.st = 0;
      c.t = 0;
      img.setPosition(c.homeX, c.homeY).setAlpha(1).setVisible(true);
      img.body.enable = true;
      img.body.updateFromGameObject();
    }
  }
}
