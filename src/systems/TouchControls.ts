import Phaser from 'phaser';
import { DEPTH, GAME_H, GAME_W, RENDER_SCALE } from '../constants';
import { touchInput, resetTouchInput } from './InputController';
import { save } from './SaveSystem';

type BtnId = 'attack' | 'jump' | 'skill';

interface Btn {
  id: BtnId;
  x: number;
  y: number;
  r: number;
  pointer: number | null;
  gfx: Phaser.GameObjects.Graphics;
  /** Lớp phủ thể hiện hồi chiêu (0..1). */
  cd: Phaser.GameObjects.Graphics;
  cdRatio: number;
}

const IDLE_ALPHA = 0.4;
const DOWN_ALPHA = 0.75;
const STICK_R = 30;
const HIT_MARGIN = 8;

/**
 * Joystick ảo động (chạm nửa trái, hiện tại chỗ chạm) + 3 nút A/B/C.
 * Đa chạm: mỗi ngón gắn với 1 điều khiển theo pointer.id, nhả đúng ngón nào thì thả đúng điều khiển đó.
 */
export class TouchControls {
  private stickPointer: number | null = null;
  private ox = 0;
  private oy = 0;
  private homeX: number;
  private homeY: number;
  private base: Phaser.GameObjects.Arc;
  private thumb: Phaser.GameObjects.Arc;
  private buttons: Btn[] = [];

  constructor(private scene: Phaser.Scene) {
    const k = save.settings.touchScale;
    this.homeX = 66;
    this.homeY = GAME_H - 62;

    this.base = scene.add
      .circle(this.homeX, this.homeY, STICK_R * k, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setAlpha(0.35)
      .setDepth(DEPTH.ui);
    this.thumb = scene.add
      .circle(this.homeX, this.homeY, 13 * k, 0xffffff, 0.35)
      .setDepth(DEPTH.ui);

    const defs: [BtnId, number, number, number][] = [
      ['attack', GAME_W - 120, GAME_H - 48, 27],
      ['jump', GAME_W - 62, GAME_H - 88, 27],
      ['skill', GAME_W - 54, GAME_H - 30, 21],
    ];
    for (const [id, x, y, r] of defs) {
      const rr = r * k;
      const gfx = scene.add.graphics().setDepth(DEPTH.ui).setAlpha(IDLE_ALPHA);
      const cd = scene.add
        .graphics()
        .setDepth(DEPTH.ui + 1)
        .setAlpha(0.7);
      this.drawButton(gfx, id, x, y, rr);
      this.buttons.push({ id, x, y, r: rr, pointer: null, gfx, cd, cdRatio: 0 });
    }

    scene.input.addPointer(3);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** Hiển thị hồi chiêu nút kỹ năng (0 = sẵn sàng, 1 = vừa dùng). */
  setSkillCooldown(ratio: number): void {
    const b = this.buttons[2];
    if (!b || Math.abs(b.cdRatio - ratio) < 0.01) return;
    b.cdRatio = ratio;
    b.cd.clear();
    if (ratio > 0) {
      b.cd.fillStyle(0x000000, 0.6);
      b.cd.slice(b.x, b.y, b.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio, false);
      b.cd.fillPath();
    }
  }

  private drawButton(
    g: Phaser.GameObjects.Graphics,
    id: BtnId,
    x: number,
    y: number,
    r: number,
  ): void {
    g.fillStyle(0xffffff, 0.18).fillCircle(x, y, r);
    g.lineStyle(2, 0xffffff, 1).strokeCircle(x, y, r);
    g.fillStyle(0xffffff, 1);
    const s = r * 0.5;
    if (id === 'attack') {
      // phi tiêu 4 cánh
      g.fillPoints(
        [
          { x, y: y - s },
          { x: x + s * 0.3, y: y - s * 0.3 },
          { x: x + s, y },
          { x: x + s * 0.3, y: y + s * 0.3 },
          { x, y: y + s },
          { x: x - s * 0.3, y: y + s * 0.3 },
          { x: x - s, y },
          { x: x - s * 0.3, y: y - s * 0.3 },
        ],
        true,
      );
    } else if (id === 'jump') {
      g.fillTriangle(x, y - s, x - s, y + s * 0.6, x + s, y + s * 0.6);
    } else {
      g.fillTriangle(x, y - s, x - s * 0.8, y, x + s * 0.8, y);
      g.fillTriangle(x, y + s, x - s * 0.8, y, x + s * 0.8, y);
    }
  }

  private toLogic(p: Phaser.Input.Pointer): [number, number] {
    return [p.x / RENDER_SCALE, p.y / RENDER_SCALE];
  }

  private onDown(p: Phaser.Input.Pointer): void {
    const [x, y] = this.toLogic(p);
    for (const b of this.buttons) {
      if (b.pointer === null && Math.hypot(x - b.x, y - b.y) <= b.r + HIT_MARGIN) {
        b.pointer = p.id;
        b.gfx.setAlpha(DOWN_ALPHA);
        touchInput[b.id] = true;
        return;
      }
    }
    if (this.stickPointer === null && x < GAME_W * 0.45) {
      this.stickPointer = p.id;
      const k = save.settings.touchScale;
      this.ox = Phaser.Math.Clamp(x, STICK_R * k + 6, GAME_W * 0.45);
      this.oy = Phaser.Math.Clamp(y, 50, GAME_H - STICK_R * k - 6);
      this.base.setPosition(this.ox, this.oy).setAlpha(1);
      this.thumb.setPosition(this.ox, this.oy);
      this.updateStick(x, y);
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (p.id !== this.stickPointer) return;
    const [x, y] = this.toLogic(p);
    this.updateStick(x, y);
  }

  private onUp(p: Phaser.Input.Pointer): void {
    for (const b of this.buttons) {
      if (b.pointer === p.id) {
        b.pointer = null;
        b.gfx.setAlpha(IDLE_ALPHA);
        touchInput[b.id] = false;
      }
    }
    if (p.id === this.stickPointer) this.releaseStick();
  }

  private updateStick(x: number, y: number): void {
    const k = save.settings.touchScale;
    const R = STICK_R * k;
    let dx = x - this.ox;
    let dy = y - this.oy;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    this.thumb.setPosition(this.ox + dx, this.oy + dy);

    const nx = dx / R;
    const ny = dy / R;
    if (Math.hypot(nx, ny) < 0.35) {
      touchInput.dirX = 0;
      touchInput.dirY = 0;
      return;
    }
    // 8 hướng: cạnh nhỏ < tan(22.5°) × cạnh lớn thì bỏ.
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    touchInput.dirX = ax > ay * 0.414 ? Math.sign(nx) : 0;
    touchInput.dirY = ay > ax * 0.414 ? Math.sign(ny) : 0;
  }

  private releaseStick(): void {
    this.stickPointer = null;
    touchInput.dirX = 0;
    touchInput.dirY = 0;
    this.base.setPosition(this.homeX, this.homeY).setAlpha(0.35);
    this.thumb.setPosition(this.homeX, this.homeY);
  }

  /** Nhả mọi điều khiển (mất focus, quay lại sau tạm dừng) để không kẹt ngón/nút. */
  reset(): void {
    for (const b of this.buttons) {
      b.pointer = null;
      b.gfx.setAlpha(IDLE_ALPHA);
    }
    this.releaseStick();
    resetTouchInput();
  }

  private destroy(): void {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.reset, this);
    resetTouchInput();
  }
}
