import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import type { MusicKey } from '../audio/AudioSystem';
import { EVT, GAME_H, GAME_W, STAGE_COUNT } from '../constants';
import { initCamera, setCamView } from '../core/camera';
import { markStageStart, run } from '../core/GameState';
import { bosses } from '../data/bosses';
import { characters } from '../data/characters';
import { stages } from '../data/stages';
import type { Vec } from '../data/types';
import { Boss } from '../entities/Boss';
import { Player } from '../entities/Player';
import type { EnemyContext } from '../behaviors/enemyBehaviors';
import { Backdrop } from '../systems/Backdrop';
import { CombatSystem } from '../systems/CombatSystem';
import { Effects } from '../systems/Effects';
import { HazardSystem } from '../systems/HazardSystem';
import { HealthSystem } from '../systems/HealthSystem';
import { InputController, resetTouchInput } from '../systems/InputController';
import { PickupSystem } from '../systems/PickupSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { StageFlow } from '../systems/StageFlow';
import { buildTerrain, findMarker, type StageTerrain } from '../systems/TerrainBuilder';
import { WeaponSystem } from '../systems/WeaponSystem';
import type { Projectile } from '../entities/Projectile';

/** Chỉ số tile bẫy chết (nước, lửa): rơi về điểm an toàn. Các tile còn lại (gai) gây sát thương thường. */
const DEADLY_TILES = [7, 8];
const SPIKE_TOP_INSET = 6;
const CAM_LEAD = 0.42;
const CAM_LERP = 0.15;
const CAM_LERP_Y = 0.12;
/** Người chơi nằm ở 75% chiều cao màn hình (nhìn được xa phía trên khi leo). */
const CAM_FOLLOW_Y = 0.75;
const WALL_MARGIN = 10;
const RESPAWN_EDGE = 28;

type TileLike = Phaser.Tilemaps.Tile;

/** Màn chơi: dựng map, tạo player, nối các system. */
export class GameScene extends Phaser.Scene {
  terrain!: StageTerrain;
  controls!: InputController;
  player!: Player;
  weapons!: WeaponSystem;
  fx!: Effects;
  health!: HealthSystem;
  spawns!: SpawnSystem;
  combat!: CombatSystem;
  pickups!: PickupSystem;
  hazards!: HazardSystem;
  flow!: StageFlow;
  private backdrop!: Backdrop;
  private camLeft = 0;
  private camMaxLeft = 0;
  private enemyCtx!: EnemyContext;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const cam = this.cameras.main;
    initCamera(cam);
    resetTouchInput();
    markStageStart();
    audio.music(`stage${stages[run.stage].theme}` as MusicKey);

    this.backdrop = new Backdrop(this, stages[run.stage].theme);
    this.terrain = buildTerrain(this, stages[run.stage].mapKey);
    const t = this.terrain;
    this.physics.world.setBounds(0, 0, t.width, t.height + 400);

    this.controls = new InputController(this);
    const start = findMarker(t, 'playerStart');
    this.player = new Player(
      this,
      start?.x ?? 48,
      start?.y ?? 200,
      run.character,
      this.controls.state,
      t,
    );
    this.fx = new Effects(this);
    this.weapons = new WeaponSystem(this, this.player, this.controls.state);
    this.health = new HealthSystem(this, this.player, this.fx, () => this.respawnPoint());

    this.enemyCtx = {
      player: this.player,
      time: 0,
      delta: 0,
      view: cam.worldView,
      fire: (cfg) => this.combat.fireEnemy(cfg),
    };
    this.spawns = new SpawnSystem(this, t, this.enemyCtx);
    this.combat = new CombatSystem(this, {
      player: this.player,
      weapons: this.weapons,
      spawns: this.spawns,
      health: this.health,
      fx: this.fx,
      terrain: t,
    });
    this.pickups = new PickupSystem(
      this,
      this.player,
      this.health,
      this.fx,
      () => characters[run.character].skill === 'dash',
      () => this.combat.smokeBomb(this.cameras.main.worldView),
      t,
    );
    this.hazards = new HazardSystem(this, this.player, t, this.health);
    this.weapons.enemyInRange = (x, y, r) =>
      this.spawns.anyWithin(x, y, r) || this.bossWithin(x, y, r);

    this.setupCollisions();
    this.setupCamera();
    this.flow = new StageFlow({
      scene: this,
      player: this.player,
      zoneX: findMarker(t, 'bossZone')?.x,
      noHit: () => !this.health.tookHit,
      clearEnemies: () => {
        this.spawns.stopAndClear();
        this.combat.clearBullets();
      },
      lockCamera: () => (this.camLocked = true),
      createBoss: () => this.createBoss(),
      finish: () => this.finishStage(),
    });
    this.setupLifecycle();

    this.scene.launch('UIScene');
    this.events.emit(EVT.weaponChanged);
  }

  update(time: number, delta: number): void {
    this.controls.update();
    if (this.controls.state.pausePressed) this.pause();

    this.hazards.update(time, delta);
    this.player.update(time, delta);
    this.weapons.update(time);
    if (this.controls.state.skillPressed && !this.player.dead) this.pickups.trySmoke();
    this.pickups.update(delta);
    this.spawns.update(time, delta);
    this.health.update();
    this.flow.update(time, delta);
    this.updateCamera();
    this.keepPlayerInBounds();
    this.checkFall();
  }

  // ------------------------------------------------------------ va chạm

  private setupCollisions(): void {
    const { ground, platforms, hazards } = this.terrain;
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(
      this.player,
      platforms,
      undefined,
      () => this.time.now > this.player.dropUntil,
    );
    this.physics.add.overlap(
      this.player,
      hazards,
      (_p, tile) => this.onHazard(tile as TileLike),
      (_p, tile) => this.hazardTouches(tile as TileLike),
    );
    // đạn người chơi chạm đất đặc thì trả về pool
    this.physics.add.collider(this.weapons.bullets, ground, (b) => (b as Projectile).kill());
  }

  private hazardTouches(tile: TileLike): boolean {
    // overlap với tilemap trả về cả ô trống (index -1): chỉ ô có bẫy thật mới tính
    if (tile.index < 1) return false;
    if (DEADLY_TILES.includes(tile.index)) return true;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    return body.bottom > tile.pixelY + SPIKE_TOP_INSET; // gai chỉ nhọn ở phần dưới ô
  }

  private onHazard(tile: TileLike): void {
    if (DEADLY_TILES.includes(tile.index)) {
      if (this.player.canBeHit(this.time.now)) this.fallRespawn();
    } else {
      this.health.hit(tile.pixelX + this.terrain.map.tileWidth / 2);
    }
  }

  private fallRespawn(): void {
    this.weapons.cancel();
    this.health.fell();
  }

  private checkFall(): void {
    if (!this.player.dead && this.player.y > this.terrain.height + 48) this.fallRespawn();
  }

  /** Điểm hồi sinh: chỗ đứng vững gần nhất, kẹp vào vùng nhìn của camera. */
  private respawnPoint(): Vec {
    return {
      x: Phaser.Math.Clamp(
        this.player.safeX,
        this.camLeft + RESPAWN_EDGE,
        this.camLeft + GAME_W - RESPAWN_EDGE,
      ),
      y: this.player.safeY,
    };
  }

  // ------------------------------------------------------------ boss

  private createBoss(): Boss {
    const m = findMarker(this.terrain, 'boss');
    const def = bosses[stages[run.stage].boss];
    const x = m?.x ?? this.terrain.width - 80;
    const y = m?.y ?? this.terrain.height - 48;
    const zone = findMarker(this.terrain, 'bossZone');
    const left = zone?.x ?? x - 400;
    const boss = new Boss(this, x, y, def, {
      scene: this,
      player: this.player,
      fx: this.fx,
      fire: (cfg) => this.combat.fireEnemy(cfg),
      groundY: y,
      arena: { left, right: left + (zone?.width ?? 480) },
      spawnEnemy: (id, ex, ey) => this.spawns.spawnDirect(id, ex, ey),
      activeEnemies: () => this.spawns.activeCount(),
    });
    this.combat.registerBoss(boss);
    return boss;
  }

  private bossWithin(x: number, y: number, r: number): boolean {
    const b = this.flow.boss;
    if (!b || !b.active || b.dead) return false;
    const rr = r + b.def.w / 2;
    const dx = b.x - x;
    const dy = b.y - b.def.h / 2 - y;
    return dx * dx + dy * dy <= rr * rr;
  }

  private finishStage(): void {
    if (run.stage >= STAGE_COUNT) {
      this.scene.start('VictoryScene');
    } else {
      run.stage++;
      this.scene.start('SelectScene');
    }
  }

  // ------------------------------------------------------------ camera

  private camLocked = false;
  private camTop = 0;
  private lockTop = 0;

  private setupCamera(): void {
    const zone = findMarker(this.terrain, 'bossZone');
    this.camMaxLeft = Math.max(0, zone?.x ?? this.terrain.width - GAME_W);
    this.camLeft = 0;
    this.camLocked = false;
    this.lockTop = Math.max(0, (zone?.y ?? 0) + (zone?.height ?? GAME_H) - GAME_H);
    this.updateCamera(true);
  }

  /** Camera chỉ tiến, không lùi (như Contra); khoá hẳn ở khu đấu boss. */
  private updateCamera(snap = false): void {
    const target = this.camLocked
      ? this.camMaxLeft
      : Phaser.Math.Clamp(this.player.x - GAME_W * CAM_LEAD, 0, this.camMaxLeft);
    if (snap) this.camLeft = target;
    else if (target > this.camLeft) this.camLeft += (target - this.camLeft) * CAM_LERP;
    const maxTop = Math.max(0, this.terrain.height - GAME_H);
    const targetTop = this.camLocked
      ? this.lockTop
      : Phaser.Math.Clamp(this.player.y - GAME_H * CAM_FOLLOW_Y, 0, maxTop);
    if (snap) this.camTop = targetTop;
    else this.camTop += (targetTop - this.camTop) * CAM_LERP_Y;
    const cam = this.cameras.main;
    setCamView(cam, Math.round(this.camLeft), Math.round(this.camTop));
    this.backdrop.update(cam.worldView);
  }

  /** Tường vô hình: không đi lùi ra khỏi màn hình, không vượt biên phải. */
  private keepPlayerInBounds(): void {
    const p = this.player;
    if (p.dead) return;
    const minX = this.camLeft + WALL_MARGIN;
    const maxX = this.terrain.width - WALL_MARGIN;
    if (p.x < minX) {
      p.x = minX;
      if (p.body && p.body.velocity.x < 0) p.setVelocityX(0);
    } else if (p.x > maxX) {
      p.x = maxX;
      if (p.body && p.body.velocity.x > 0) p.setVelocityX(0);
    }
  }

  // ------------------------------------------------------------ vòng đời

  private setupLifecycle(): void {
    const onPause = (): void => this.pause();
    const onGameOver = (): void => {
      this.flow.gameOver();
      audio.music(null);
      this.time.delayedCall(400, () => this.scene.start('GameOverScene'));
    };
    const onResume = (): void => {
      this.controls.reset();
      resetTouchInput();
    };
    this.events.on(EVT.pauseRequest, onPause);
    this.events.on(EVT.gameOver, onGameOver);
    const onDied = (): void => this.weapons.cancel();
    this.events.on(EVT.playerDied, onDied);
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.game.events.on(Phaser.Core.Events.BLUR, onPause);
    this.game.events.on(Phaser.Core.Events.HIDDEN, onPause);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(EVT.pauseRequest, onPause);
      this.events.off(EVT.gameOver, onGameOver);
      this.events.off(EVT.playerDied, onDied);
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      this.game.events.off(Phaser.Core.Events.BLUR, onPause);
      this.game.events.off(Phaser.Core.Events.HIDDEN, onPause);
      this.scene.stop('UIScene');
    });
  }

  private pause(): void {
    if (this.scene.isPaused() || !this.scene.isActive()) return;
    this.weapons.cancel();
    this.scene.pause();
    this.scene.pause('UIScene');
    this.scene.launch('PauseScene');
  }
}
