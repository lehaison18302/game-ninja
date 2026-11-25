import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { EVT, PLAYER, DEPTH, TILE } from '../constants';
import { StateMachine } from '../core/StateMachine';
import { characters } from '../data/characters';
import type { CharacterId, Vec } from '../data/types';
import type { InputState } from '../systems/InputController';

export type PState = 'idle' | 'run' | 'jump' | 'fall' | 'prone' | 'dash' | 'hurt' | 'dead';

export interface Terrain {
  ground: Phaser.Tilemaps.TilemapLayer;
  platforms: Phaser.Tilemaps.TilemapLayer;
}

const HURT_STUN_MS = 300;
const SAFE_CHECK_MS = 120;
const DASH_SPEED = PLAYER.dashDistance / (PLAYER.dashMs / 1000);

type TintMode = 'none' | 'hurt' | 'white';

/**
 * Nhân vật chính. Thân vật lý (ẩn) nằm ở gốc chân (origin 0.5,1); hình hiển thị là `view` riêng
 * để xoay/nháy/đổi texture mà không đụng hitbox.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly view: Phaser.GameObjects.Sprite;
  readonly sm: StateMachine<Player, PState>;
  readonly aim: Vec = { x: 1, y: 0 };
  facing = 1;
  /** Hệ số tốc độ chạy (vd. đang gồng cung). */
  speedMul = 1;
  /** 0..1, do WeaponSystem đặt; =1 thì nhân vật nhấp nháy báo đã gồng đầy. */
  chargeRatio = 0;
  /** Vận tốc ngang do băng chuyền (đặt mỗi frame bởi HazardSystem). */
  externalVx = 0;
  invulnUntil = 0;
  dropUntil = 0;
  dashReadyAt = 0;
  safeX: number;
  safeY: number;
  readonly characterId: CharacterId;

  private jumping = false;
  private lastGround = -1e9;
  private lastJumpPress = -1e9;
  private lastSafeCheck = 0;
  private hurtUntil = 0;
  private dashDir = 1;
  private tintMode: TintMode = 'none';
  private lastCdEmit = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: CharacterId,
    private in_: InputState,
    private terrain: Terrain,
  ) {
    super(scene, x, y, 'px');
    this.characterId = id;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1).setVisible(false).setDepth(DEPTH.player);
    this.setMaxVelocity(900, 520);
    this.setBodyShape(PLAYER.bodyW, PLAYER.bodyH);
    this.safeX = x;
    this.safeY = y;

    this.view = scene.add.sprite(x, y, `ninja-${id}`).setOrigin(0.5, 1).setDepth(DEPTH.player);

    this.sm = new StateMachine<Player, PState>(this, () => scene.time.now);
    this.sm
      .add('idle', {})
      .add('run', {})
      .add('jump', {})
      .add('fall', {})
      .add('prone', {
        enter: (p) => p.setBodyShape(24, PLAYER.proneH),
        exit: (p) => p.setBodyShape(PLAYER.bodyW, PLAYER.bodyH),
      })
      .add('dash', {
        enter: (p) => {
          const body = p.body as Phaser.Physics.Arcade.Body;
          body.setAllowGravity(false);
          p.setVelocity(p.dashDir * DASH_SPEED, 0);
        },
        update: (p) => {
          if (p.sm.elapsed >= PLAYER.dashMs) p.endDash();
        },
        exit: (p) => {
          (p.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
        },
      })
      .add('hurt', {
        update: (p, time) => {
          if (time >= p.hurtUntil) p.control(time);
        },
      })
      .add('dead', {});
    this.sm.set('idle');
  }

  get dead(): boolean {
    return this.sm.is('dead');
  }

  canBeHit(time: number): boolean {
    return !this.dead && time >= this.invulnUntil;
  }

  /** Toạ độ đầu nòng (nơi đạn xuất hiện). */
  muzzle(out: Vec): Vec {
    const prone = this.sm.is('prone');
    out.x = this.x + this.aim.x * 12;
    out.y = (prone ? this.y - 6 : this.y - 17) + this.aim.y * 12;
    return out;
  }

  /** 0 = sẵn sàng … 1 = vừa dùng (nút kỹ năng). */
  skillCooldownRatio(time: number): number {
    if (characters[this.characterId].skill !== 'dash') return 0;
    return Phaser.Math.Clamp((this.dashReadyAt - time) / PLAYER.dashCooldownMs, 0, 1);
  }

  update(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) this.lastGround = time;
    if (this.in_.jumpPressed) this.lastJumpPress = time;

    if (!this.dead) this.updateAim(body.blocked.down);

    const st = this.sm.current;
    if (st === 'idle' || st === 'run' || st === 'jump' || st === 'fall' || st === 'prone') {
      this.control(time);
    }
    this.sm.update(time, delta);
    this.trackSafeSpot(time, body);
    this.syncView(time, delta);

    const cd = Math.round(this.skillCooldownRatio(time) * 50);
    if (cd !== this.lastCdEmit) {
      this.lastCdEmit = cd;
      this.scene.events.emit(EVT.skillCooldown, cd / 50);
    }
  }

  /** Nhận đòn: đẩy lùi + bất tử tạm. Việc trừ tim do HealthSystem quyết định. */
  hurt(fromX: number, time: number): void {
    if (this.dead) return;
    this.invulnUntil = time + PLAYER.hurtIframes;
    this.hurtUntil = time + HURT_STUN_MS;
    this.jumping = false;
    this.sm.set('hurt');
    const dir = this.x < fromX ? -1 : 1;
    this.setVelocity(dir * PLAYER.knockbackX, -PLAYER.knockbackY);
  }

  die(): void {
    if (this.dead) return;
    this.sm.set('dead');
    this.jumping = false;
    this.setVelocity(0, -180);
    (this.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;
  }

  /** Hồi sinh/đưa về điểm an toàn, bất tử `iframes` ms. */
  respawn(x: number, y: number, time: number, iframes: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.checkCollision.none = false;
    body.reset(x, y);
    this.jumping = false;
    this.speedMul = 1;
    this.chargeRatio = 0;
    this.invulnUntil = time + iframes;
    this.dropUntil = 0;
    this.sm.set('idle');
    this.view.setAngle(0).setVisible(true);
  }

  // ---------------------------------------------------------------- điều khiển

  private updateAim(onGround: boolean): void {
    const s = this.in_;
    if (s.dirX !== 0) this.facing = s.dirX;
    let ax = s.dirX;
    let ay = s.dirY;
    if (ax === 0 && ay === 0) ax = this.facing;
    else if (ax === 0 && ay > 0 && onGround) {
      ax = this.facing; // nằm sấp: bắn ngang
      ay = 0;
    }
    if (ax !== 0 && ay !== 0) {
      ax *= Math.SQRT1_2;
      ay *= Math.SQRT1_2;
    }
    this.aim.x = ax;
    this.aim.y = ay;
  }

  private control(time: number): void {
    const s = this.in_;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down;
    if (onGround) this.jumping = false;

    if (
      s.skillPressed &&
      characters[this.characterId].skill === 'dash' &&
      time >= this.dashReadyAt
    ) {
      this.dashDir = s.dirX !== 0 ? s.dirX : this.facing;
      this.facing = this.dashDir;
      this.dashReadyAt = time + PLAYER.dashCooldownMs;
      this.invulnUntil = Math.max(this.invulnUntil, time + PLAYER.dashMs + 100);
      audio.sfx('dash');
      this.sm.set('dash');
      return;
    }

    // nhảy / xuyên sàn (có đệm phím + "coyote time")
    let left = false;
    if (
      time - this.lastJumpPress <= PLAYER.jumpBufferMs &&
      time - this.lastGround <= PLAYER.coyoteMs
    ) {
      if (s.dirY > 0 && onGround && this.standingOnPlatform(body)) {
        this.dropUntil = time + PLAYER.dropThroughMs;
        this.setVelocityY(40);
        left = true;
      } else if (!(s.dirY > 0 && onGround)) {
        this.setVelocityY(-PLAYER.jumpSpeed);
        this.jumping = true;
        audio.sfx('jump');
        left = true;
      }
      if (left) {
        this.lastJumpPress = -1e9;
        this.lastGround = -1e9;
      }
    }
    // nhả nút sớm → nhảy thấp
    if (this.jumping && s.jumpReleased && body.velocity.y < -110)
      this.setVelocityY(body.velocity.y * 0.5);

    const prone = onGround && s.dirY > 0 && s.dirX === 0;
    const runV = PLAYER.runSpeed * this.speedMul;
    this.setVelocityX((prone ? 0 : s.dirX * runV) + (onGround ? this.externalVx : 0));

    if (left || !onGround) this.sm.set(this.jumping ? 'jump' : 'fall');
    else if (prone) this.sm.set('prone');
    else this.sm.set(s.dirX !== 0 ? 'run' : 'idle');
  }

  private endDash(): void {
    this.setVelocityX(this.dashDir * PLAYER.runSpeed);
    this.sm.set('fall');
  }

  private standingOnPlatform(body: Phaser.Physics.Arcade.Body): boolean {
    const tx = Math.floor(this.x / TILE);
    const ty = Math.floor((body.bottom + 2) / TILE);
    return !this.terrain.ground.hasTileAt(tx, ty) && this.terrain.platforms.hasTileAt(tx, ty);
  }

  private setBodyShape(w: number, h: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(w, h, false);
    body.setOffset(this.width * 0.5 - w / 2, this.height - h);
  }

  /** Ghi nhớ chỗ đứng vững (cách mép vực ≥ 1 ô) để hồi lại khi rơi vực. */
  private trackSafeSpot(time: number, body: Phaser.Physics.Arcade.Body): void {
    if (time - this.lastSafeCheck < SAFE_CHECK_MS) return;
    this.lastSafeCheck = time;
    const st = this.sm.current;
    if (!body.blocked.down || (st !== 'idle' && st !== 'run' && st !== 'prone')) return;
    const ty = Math.floor((body.bottom + 2) / TILE);
    const g = this.terrain.ground;
    const a = Math.floor((this.x - TILE) / TILE);
    const b = Math.floor((this.x + TILE) / TILE);
    if (g.hasTileAt(a, ty) && g.hasTileAt(b, ty)) {
      this.safeX = this.x;
      this.safeY = this.y;
    }
  }

  // ---------------------------------------------------------------- hiển thị

  private setTintMode(mode: TintMode): void {
    if (mode === this.tintMode) return;
    this.tintMode = mode;
    if (mode === 'none') this.view.clearTint();
    else if (mode === 'hurt') this.view.setTint(0xff6a55);
    else this.view.setTintFill(0xffffff);
  }

  private syncView(time: number, delta: number): void {
    const v = this.view;
    const st = this.sm.current;
    const id = this.characterId;
    const key =
      st === 'jump' ? `ninja-${id}-ball` : st === 'prone' ? `ninja-${id}-prone` : `ninja-${id}`;
    if (v.texture.key !== key) v.setTexture(key);

    v.setFlipX(this.facing < 0);
    v.setScale(1, 1);
    if (st === 'jump') {
      v.setOrigin(0.5, 0.5).setPosition(this.x, this.y - 14);
      v.angle += this.facing * delta * 0.8;
    } else if (st === 'dead') {
      v.setOrigin(0.5, 0.5).setPosition(this.x, this.y - 14);
      v.angle += delta * 0.6;
    } else {
      v.setOrigin(0.5, 1).setPosition(this.x, this.y);
      if (st === 'run') v.setAngle(this.facing * 4 + Math.sin(time * 0.03) * 3);
      else if (st === 'dash') {
        v.setAngle(this.facing * 14);
        v.setScale(1.5, 0.9);
      } else v.setAngle(0);
    }

    const blink = time < this.invulnUntil && st !== 'dash' && Math.floor(time / 70) % 2 === 0;
    v.setAlpha(blink ? 0.35 : st === 'dash' ? 0.8 : 1);

    if (st === 'hurt') this.setTintMode('hurt');
    else if (this.chargeRatio >= 1 && Math.floor(time / 80) % 2 === 0) this.setTintMode('white');
    else this.setTintMode('none');
  }
}
