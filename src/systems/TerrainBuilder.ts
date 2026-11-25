import Phaser from 'phaser';
import { DEPTH } from '../constants';

export interface StageTerrain {
  map: Phaser.Tilemaps.Tilemap;
  ground: Phaser.Tilemaps.TilemapLayer;
  platforms: Phaser.Tilemaps.TilemapLayer;
  hazards: Phaser.Tilemaps.TilemapLayer;
  width: number;
  height: number;
  spawns: Phaser.Types.Tilemaps.TiledObject[];
  markers: Phaser.Types.Tilemaps.TiledObject[];
}

/** Dựng 3 lớp tile từ file Tiled: đất đặc (4 mặt), sàn mỏng (chỉ mặt trên), bẫy. */
export function buildTerrain(scene: Phaser.Scene, mapKey: string): StageTerrain {
  const map = scene.make.tilemap({ key: mapKey });
  const tileset = map.addTilesetImage('tiles', 'tiles');
  if (!tileset) throw new Error('Thiếu tileset "tiles"');

  const ground = map.createLayer('ground', tileset);
  const platforms = map.createLayer('platforms', tileset);
  const hazards = map.createLayer('hazards', tileset);
  if (!ground || !platforms || !hazards)
    throw new Error(`Map ${mapKey} thiếu lớp ground/platforms/hazards`);
  ground.setDepth(DEPTH.tiles);
  platforms.setDepth(DEPTH.tiles);
  hazards.setDepth(DEPTH.tiles);

  ground.setCollisionByExclusion([-1]);
  // sàn mỏng: chỉ va chạm khi đáp từ trên xuống
  platforms.forEachTile((tile) => {
    if (tile.index > 0) tile.setCollision(false, false, true, false, false);
  });
  platforms.calculateFacesWithin(0, 0, map.width, map.height);
  hazards.setCollisionByExclusion([-1]);

  return {
    map,
    ground,
    platforms,
    hazards,
    width: map.widthInPixels,
    height: map.heightInPixels,
    spawns: map.getObjectLayer('spawns')?.objects ?? [],
    markers: map.getObjectLayer('markers')?.objects ?? [],
  };
}

export function findMarker(
  t: StageTerrain,
  name: string,
): Phaser.Types.Tilemaps.TiledObject | undefined {
  return t.markers.find((o) => o.name === name);
}
