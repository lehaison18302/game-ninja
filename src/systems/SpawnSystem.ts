import Phaser from 'phaser';
import { POOL } from '../constants';
import { enemies } from '../data/enemies';
import type { EnemyDef, EnemyId } from '../data/types';
import { Enemy } from '../entities/Enemy';
import type { EnemyContext } from '../behaviors/enemyBehaviors';
import type { StageTerrain } from './TerrainBuilder';

/** Địch xuất hiện khi mép phải camera còn cách điểm spawn chừng này (px) → vừa ló ra ngoài màn hình. */
const SPAWN_AHEAD = 40;
const DESPAWN_BEHIND = 80;

interface Entry {
  def: EnemyDef;
  x: number;
  y: number;
  count: number;
  interval: number;
  drop: string | null;
}

interface Pending {
  at: number;
  entry: Entry;
}

function prop<T extends string | number>(
  o: Phaser.Types.Tilemaps.TiledObject,
  name: string,
  fallback: T,
): T {
  const list = o.properties as { name: string; value: T }[] | undefined;
  return list?.find((p) => p.name === name)?.value ?? fallback;
}

/** Đọc lớp `spawns` của Tiled, kích hoạt địch theo camera, giữ pool địch và cập nhật AI mỗi frame. */
export class SpawnSystem {
  readonly group: Phaser.Physics.Arcade.Group;
  enabled = true;
  private entries: Entry[] = [];
  private next = 0;
  private pending: Pending[] = [];

  constructor(
    scene: Phaser.Scene,
    private terrain: StageTerrain,
    private ctx: EnemyContext,
  ) {
    this.group = scene.physics.add.group({
      classType: Enemy,
      maxSize: POOL.enemies,
      runChildUpdate: false,
    });
    const warm: Enemy[] = [];
    for (let i = 0; i < POOL.enemies; i++) warm.push(this.group.get(0, 0, 'px') as Enemy);
    for (const e of warm) e.kill();

    for (const o of terrain.spawns) {
      const def = enemies[o.name as EnemyId];
      if (!def || o.x === undefined || o.y === undefined) continue;
      this.entries.push({
        def,
        x: o.x,
        y: o.y,
        count: prop(o, 'count', 1),
        interval: prop(o, 'interval', 800),
        drop: prop(o, 'drop', '') || null,
      });
    }
    this.entries.sort((a, b) => a.x - b.x);
  }

  update(time: number, delta: number): void {
    const c = this.ctx;
    c.time = time;
    c.delta = delta;
    const view = c.view;

    if (this.enabled) {
      while (
        this.next < this.entries.length &&
        this.entries[this.next].x <= view.right + SPAWN_AHEAD
      ) {
        const entry = this.entries[this.next++];
        for (let i = 0; i < entry.count; i++)
          this.pending.push({ at: time + i * entry.interval, entry });
      }
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const p = this.pending[i];
        if (time >= p.at && this.spawn(p.entry)) this.pending.splice(i, 1);
      }
    }

    const list = this.group.getChildren() as Enemy[];
    for (const e of list) {
      if (!e.active) continue;
      e.tick(c);
      if (e.x < view.x - DESPAWN_BEHIND || e.y > this.terrain.height + 80 || e.x > view.right + 260)
        e.kill();
    }
  }

  private spawn(entry: Entry): boolean {
    const e = this.group.get(entry.x, entry.y, entry.def.texture) as Enemy | null;
    if (!e) return false; // pool đầy: thử lại frame sau
    e.spawnAt(entry.def, entry.x, entry.y, entry.drop);
    return true;
  }

  /** Sinh địch ngay tại chỗ (phân thân của boss…). */
  spawnDirect(id: EnemyId, x: number, y: number): boolean {
    const def = enemies[id];
    const e = this.group.get(x, y, def.texture) as Enemy | null;
    if (!e) return false;
    e.spawnAt(def, x, y, null);
    return true;
  }

  activeCount(): number {
    let n = 0;
    for (const e of this.group.getChildren() as Enemy[]) if (e.active) n++;
    return n;
  }

  /** Có địch nào trong bán kính `range` quanh (x,y) không? (cho đòn chém của Ren) */
  anyWithin(x: number, y: number, range: number): boolean {
    const list = this.group.getChildren() as Enemy[];
    for (const e of list) {
      if (!e.active) continue;
      const r = range + e.def.w / 2;
      const dx = e.x - x;
      const dy = e.y - e.def.h / 2 - y;
      if (dx * dx + dy * dy <= r * r) return true;
    }
    return false;
  }

  /** Dừng spawn và dọn địch thường (khi vào trận boss). */
  stopAndClear(): void {
    this.enabled = false;
    this.pending.length = 0;
    for (const e of this.group.getChildren() as Enemy[]) if (e.active) e.kill();
  }
}
