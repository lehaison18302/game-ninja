import Phaser from 'phaser';
import { audio } from '../audio/AudioSystem';
import { PLAYER, DEPTH, TILE } from '../constants';
import { attackAnimMs, NINJA_SCALE, ninjaAnimKey, ninjaTexture } from '../core/ninjaAnims';
import { StateMachine } from '../core/StateMachine';
import type { NinjaAnim } from '../data/ninjaSprites';
import type { CharacterId, Vec } from '../data/types';
import type { InputState } from '../systems/InputController';

export type PState = 'idle' | 'run' | 'jump' | 'fall' | 'prone' | 'dash' | 'hurt' | 'dead';

export interface Terrain {
  ground: Phaser.Tilemaps.TilemapLayer;
  platforms: Phaser.Tilemaps.TilemapLayer;
}

const HURT_STUN_MS = 300;
const SAFE_CHECK_MS = 120;
export const DASH_SPEED = PLAYER.dashDistance / (PLAYER.dashMs / 1000);

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
  /** Đang giương cung (WeaponSystem đặt mỗi frame). */
  aiming = false;
  /** Vận tốc ngang do băng chuyền (đặt mỗi frame bởi HazardSystem). */
  externalVx = 0;
  invulnUntil = 0;
  dropUntil = 0;
  safeX: number;
  safeY: number;
  readonly characterId: CharacterId;

  private jumping = false;
  private jumpAt = 0;
  private jumpCut = false;
  private lastGround = -1e9;
  private lastJumpPress = -1e9;
  private lastSafeCheck = 0;
  private hurtUntil = 0;
  private dashDir = 1;
  private tintMode: TintMode = 'none';
  /** Giữ tư thế ra đòn tới lúc này; `attackBig` = đòn chậm/cận chiến, được đè cả khi chạy/nhảy. */
  private attackUntil = 0;
  private attackBig = false;
  private nextGhost = 0;

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

    this.view = scene.add
      .sprite(x, y, ninjaTexture(id))
      .setOrigin(0.5, 1)
      .setScale(NINJA_SCALE)
      .setDepth(DEPTH.player);
    this.view.play(ninjaAnimKey(id, 'idle'));

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

  /** Có đang tự điều khiển được không (không lướt, không bị đánh bật, không chết). */
  get inControl(): boolean {
    const st = this.sm.current;
    return st === 'idle' || st === 'run' || st === 'jump' || st === 'fall' || st === 'prone';
  }

  /** Lướt ngắn có bất tử (chiêu của Ren). Trả về false nếu lúc này không lướt được. */
  startDash(time: number): boolean {
    if (!this.inControl) return false;
    this.dashDir = this.in_.dirX !== 0 ? this.in_.dirX : this.facing;
    this.facing = this.dashDir;
    this.jumping = false;
    this.invulnUntil = Math.max(this.invulnUntil, time + PLAYER.dashMs + 100);
    this.sm.set('dash');
    return true;
  }

  /**
   * Phát tư thế ra đòn (WeaponSystem gọi khi bắn/chém). `big`: đòn chậm hoặc cận chiến – hiện cả khi
   * đang chạy/nhảy; đòn bắn liên thanh thì chỉ hiện lúc đứng yên để chân chạy không bị khựng.
   */
  playAttack(time: number, big: boolean): void {
    this.attackUntil = time + attackAnimMs(this.characterId);
    this.attackBig = big;
    const v = this.view;
    const key = ninjaAnimKey(this.characterId, 'attack');
    // bắn liên tục: phát lại từ đầu mỗi phát để thấy rõ nhịp ném
    if (v.anims.currentAnim?.key === key) v.anims.restart();
  }

  update(time: number, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down) this.lastGround = time;
    if (this.in_.jumpPressed) this.lastJumpPress = time;

    if (!this.dead) this.updateAim(body.blocked.down);

    if (this.inControl) this.control(time);
    this.sm.update(time, delta);
    this.trackSafeSpot(time, body);
    this.syncView(time, delta);
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
    this.aiming = false;
    this.attackUntil = 0;
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

    // nhảy / xuyên sàn (có đệm phím + "coyote time").
    // Chỉ xuyên sàn khi giữ xuống trên sàn mỏng; trên đất đặc thì giữ xuống (ngón cái trĩu xuống) vẫn nhảy.
    let left = false;
    if (
      time - this.lastJumpPress <= PLAYER.jumpBufferMs &&
      time - this.lastGround <= PLAYER.coyoteMs
    ) {
      if (s.dirY > 0 && onGround && this.standingOnPlatform(body)) {
        this.dropUntil = time + PLAYER.dropThroughMs;
        this.setVelocityY(40);
      } else {
        this.setVelocityY(-PLAYER.jumpSpeed);
        this.jumping = true;
        this.jumpAt = time;
        this.jumpCut = false;
        audio.sfx('jump');
      }
      left = true;
      this.lastJumpPress = -1e9;
      this.lastGround = -1e9;
    }
    // nhả nút sớm → nhảy thấp (cắt một lần, sau thời gian bay tối thiểu)
    if (
      this.jumping &&
      !this.jumpCut &&
      !s.jump &&
      time - this.jumpAt >= PLAYER.shortHopMinMs &&
      body.velocity.y < -110
    ) {
      this.setVelocityY(body.velocity.y * PLAYER.shortHopMul);
      this.jumpCut = true;
    }

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

  /** Bóng mờ in lại tư thế hiện tại rồi tan dần (vệt lướt). */
  private spawnGhost(): void {
    const v = this.view;
    const g = this.scene.add
      .image(v.x, v.y, v.texture.key, v.frame.name)
      .setOrigin(v.originX, v.originY)
      .setScale(v.scaleX, v.scaleY)
      .setFlipX(v.flipX)
      .setTintFill(0xff9a8a)
      .setAlpha(0.55)
      .setDepth(DEPTH.player - 1);
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  }

  /** Chọn động tác hiển thị theo trạng thái + đòn đánh đang ra. */
  private pickAnim(time: number): NinjaAnim {
    const st = this.sm.current;
    switch (st) {
      case 'dead':
        return 'fall';
      case 'hurt':
        return 'crouch';
      case 'dash':
        return 'dash';
      case 'prone':
        return 'crouch';
    }
    const attacking = time < this.attackUntil && (this.attackBig || st === 'idle');
    if (this.aiming && st !== 'jump' && st !== 'fall') return 'aim';
    if (attacking) return 'attack';
    if (st === 'jump') return 'jump';
    if (st === 'fall') return 'fall';
    return st === 'run' ? 'run' : 'idle';
  }

  private syncView(time: number, delta: number): void {
    const v = this.view;
    const st = this.sm.current;
    const key = ninjaAnimKey(this.characterId, this.pickAnim(time));
    if (v.anims.currentAnim?.key !== key) v.play(key);

    v.setFlipX(this.facing < 0);
    if (st === 'dead') {
      v.setOrigin(0.5, 0.5).setPosition(this.x, this.y - 18);
      v.angle += delta * 0.6;
    } else {
      v.setOrigin(0.5, 1).setPosition(this.x, this.y + 1);
      v.setAngle(0);
    }

    if (st === 'dash' && time >= this.nextGhost) {
      this.nextGhost = time + 35;
      this.spawnGhost();
    }

    const blink = time < this.invulnUntil && st !== 'dash' && Math.floor(time / 70) % 2 === 0;
    v.setAlpha(blink ? 0.35 : st === 'dash' ? 0.85 : 1);

    if (st === 'hurt') this.setTintMode('hurt');
    else if (this.chargeRatio >= 1 && Math.floor(time / 80) % 2 === 0) this.setTintMode('white');
    else this.setTintMode('none');
  }
}
