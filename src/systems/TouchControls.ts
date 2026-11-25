import Phaser from 'phaser';
import { DEPTH, GAME_H, GAME_W } from '../constants';
import { run } from '../core/GameState';
import { pickButton, STICK_DIRS, stickSector } from '../core/touchMath';
import { characters } from '../data/characters';
import type { SkillId } from '../data/types';
import {
  pressTouchButton,
  releaseTouchButton,
  resetTouchInput,
  touchInput,
  type TouchButton,
} from './InputController';
import { save } from './SaveSystem';

interface Btn {
  id: TouchButton;
  /** Khoảng cách tâm nút tới góc phải-dưới màn hình và bán kính, ở cỡ nút 100%. */
  dx: number;
  dy: number;
  baseR: number;
  /** Vị trí/bán kính thật sau khi nhân cỡ nút (px logic). */
  x: number;
  y: number;
  r: number;
  /** Số ngón đang giữ nút. */
  holds: number;
  gfx: Phaser.GameObjects.Graphics;
}

/** Cụm nút bên phải: Đánh (trái-dưới), Nhảy (phải-trên), Chiêu (góc phải-dưới). */
const LAYOUT: [TouchButton, number, number, number][] = [
  ['attack', 120, 46, 28],
  ['jump', 60, 98, 28],
  ['skill', 46, 36, 23],
];
const SKILL = 2;
const IDLE_ALPHA = 0.45;
const DOWN_ALPHA = 0.85;
const DOWN_SCALE = 0.9;
const STICK_R = 30;
const THUMB_R = 13;
/** Chạm lệch ra ngoài mép nút tối đa ngần này px (logic, ở cỡ 100%) vẫn tính là bấm nút đó. */
const GRAB = 26;
/** Nửa trái màn hình (kể cả viền đen bên trái) dành cho joystick, nửa phải cho cụm nút. */
const STICK_ZONE = GAME_W * 0.5;
const HOME_X = 70;
const HOME_Y = GAME_H - 64;
const LISTEN: AddEventListenerOptions = { passive: true };

/**
 * Joystick ảo động (chạm nửa trái, hiện tại chỗ chạm, nền bám theo ngón) + 3 nút Đánh / Nhảy / Chiêu.
 *
 * Đọc thẳng sự kiện chạm của trình duyệt trên cả cửa sổ thay vì qua Phaser:
 * - chạm vào vùng viền đen hai bên (máy màn hình dài hơn 16:9) vẫn điều khiển được;
 * - xử lý ngay khi có sự kiện, không giới hạn số ngón, `touchcancel` luôn nhả nút;
 * - ngón nào trình duyệt quên báo nhả thì tự dọn ở lần chạm sau (không kẹt nút).
 */
export class TouchControls {
  private k = 1;
  private readonly buttons: Btn[] = [];
  private readonly cd: Phaser.GameObjects.Graphics;
  private cdRatio = 0;
  private readonly base: Phaser.GameObjects.Arc;
  private readonly thumb: Phaser.GameObjects.Arc;
  /** touch.identifier → chỉ số nút đang bấm (-1 = ngón bên phải chưa vào nút nào). */
  private readonly fingers = new Map<number, number>();
  private stickId: number | null = null;
  private ox = 0;
  private oy = 0;
  private sector = -1;
  private readonly skillId: SkillId;
  private readonly skillColor: number;

  constructor(private scene: Phaser.Scene) {
    const def = characters[run.character];
    this.skillId = def.skill;
    this.skillColor = def.color;

    this.base = scene.add
      .circle(0, 0, STICK_R, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setDepth(DEPTH.ui);
    this.thumb = scene.add.circle(0, 0, THUMB_R, 0xffffff, 0.35).setDepth(DEPTH.ui);
    for (const [id, dx, dy, r] of LAYOUT) {
      const gfx = scene.add.graphics().setDepth(DEPTH.ui).setAlpha(IDLE_ALPHA);
      this.buttons.push({ id, dx, dy, baseR: r, x: 0, y: 0, r, holds: 0, gfx });
    }
    this.cd = scene.add.graphics().setDepth(DEPTH.ui + 1);
    this.layout();

    window.addEventListener('touchstart', this.onStart, LISTEN);
    window.addEventListener('touchmove', this.onMove, LISTEN);
    window.addEventListener('touchend', this.onEnd, LISTEN);
    window.addEventListener('touchcancel', this.onEnd, LISTEN);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.reset, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  /** Hiển thị hồi chiêu trên nút Chiêu (0 = sẵn sàng, 1 = vừa dùng). */
  setSkillCooldown(ratio: number): void {
    if (ratio === this.cdRatio) return;
    const wasCooling = this.cdRatio > 0;
    this.cdRatio = ratio;
    this.drawCooldown();
    if (wasCooling && ratio <= 0) this.pulseSkill();
  }

  /** Nhả mọi điều khiển (mất focus, quay lại sau tạm dừng) để không kẹt ngón/nút; áp cỡ nút mới nếu vừa đổi. */
  reset(): void {
    this.fingers.clear();
    for (const b of this.buttons) {
      b.holds = 0;
      this.setLook(b, false);
    }
    this.releaseStick();
    resetTouchInput();
    if (save.settings.touchScale !== this.k) this.layout();
  }

  // ------------------------------------------------------------ bố cục + vẽ

  private layout(): void {
    const k = (this.k = save.settings.touchScale);
    for (const b of this.buttons) {
      b.x = GAME_W - b.dx * k;
      b.y = GAME_H - b.dy * k;
      b.r = b.baseR * k;
      b.gfx.setPosition(b.x, b.y);
      this.drawButton(b);
    }
    const s = this.buttons[SKILL];
    this.cd.setPosition(s.x, s.y);
    this.drawCooldown();
    this.base.setRadius(STICK_R * k);
    this.thumb.setRadius(THUMB_R * k);
    this.releaseStick();
  }

  private drawButton(b: Btn): void {
    const g = b.gfx;
    const r = b.r;
    const s = r * 0.5;
    g.clear();
    g.fillStyle(0xffffff, 0.18).fillCircle(0, 0, r);
    g.lineStyle(2, b.id === 'skill' ? this.skillColor : 0xffffff, 1).strokeCircle(0, 0, r);
    g.fillStyle(0xffffff, 1);
    if (b.id === 'attack') {
      // phi tiêu 4 cánh
      g.fillPoints(
        [
          { x: 0, y: -s },
          { x: s * 0.3, y: -s * 0.3 },
          { x: s, y: 0 },
          { x: s * 0.3, y: s * 0.3 },
          { x: 0, y: s },
          { x: -s * 0.3, y: s * 0.3 },
          { x: -s, y: 0 },
          { x: -s * 0.3, y: -s * 0.3 },
        ],
        true,
      );
    } else if (b.id === 'jump') {
      g.fillTriangle(0, -s, -s, s * 0.6, s, s * 0.6);
    } else {
      this.drawSkillIcon(g, s);
    }
  }

  /** Biểu tượng riêng cho chiêu của từng ninja. */
  private drawSkillIcon(g: Phaser.GameObjects.Graphics, s: number): void {
    g.lineStyle(Math.max(2, s * 0.2), 0xffffff, 1);
    switch (this.skillId) {
      case 'shurikenStorm': // vòng phi tiêu toả ra
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          g.fillCircle(Math.cos(a) * s, Math.sin(a) * s, Math.max(1.5, s * 0.2));
        }
        g.fillCircle(0, 0, s * 0.32);
        break;
      case 'whirlwind': // phễu lốc xoáy
        for (let i = 0; i < 4; i++) {
          const w = s * (1.9 - i * 0.42);
          g.fillRect(-w / 2 + (i % 2) * s * 0.12, -s + i * s * 0.52, w, Math.max(2, s * 0.24));
        }
        break;
      case 'arrowRain': // ba mũi tên rơi chéo
        for (let i = -1; i <= 1; i++) {
          const x = i * s * 0.62;
          g.lineBetween(x - s * 0.2, -s * 0.8, x + s * 0.1, s * 0.4);
          g.fillTriangle(x + s * 0.21, s * 0.84, x + s * 0.34, s * 0.34, x - s * 0.14, s * 0.46);
        }
        break;
      default: // shadowDash: hai mũi » lướt
        for (let i = 0; i < 2; i++) {
          const x = (i - 0.5) * s * 0.8;
          g.lineBetween(x - s * 0.35, -s * 0.7, x + s * 0.35, 0);
          g.lineBetween(x + s * 0.35, 0, x - s * 0.35, s * 0.7);
        }
    }
  }

  private drawCooldown(): void {
    const g = this.cd;
    g.clear();
    if (this.cdRatio <= 0) return;
    const r = this.buttons[SKILL].r;
    g.fillStyle(0x000000, 0.6);
    g.slice(0, 0, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.cdRatio, false);
    g.fillPath();
  }

  private setLook(b: Btn, down: boolean): void {
    this.scene.tweens.killTweensOf(b.gfx);
    const sc = down ? DOWN_SCALE : 1;
    b.gfx.setAlpha(down ? DOWN_ALPHA : IDLE_ALPHA).setScale(sc);
    if (b === this.buttons[SKILL]) this.cd.setScale(sc);
  }

  /** Hồi chiêu xong: nút Chiêu phồng lên + sáng rồi trở lại, báo cho người chơi biết. */
  private pulseSkill(): void {
    const b = this.buttons[SKILL];
    const down = b.holds > 0;
    this.scene.tweens.killTweensOf(b.gfx);
    this.scene.tweens.add({
      targets: b.gfx,
      scale: { from: 1.25, to: down ? DOWN_SCALE : 1 },
      alpha: { from: 1, to: down ? DOWN_ALPHA : IDLE_ALPHA },
      duration: 280,
      ease: 'Quad.easeOut',
    });
  }

  // ------------------------------------------------------------ sự kiện chạm

  private onStart = (e: TouchEvent): void => {
    if (!this.scene.sys.isActive()) return;
    this.prune(e.touches);
    const rect = this.scene.game.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const x = ((t.clientX - rect.left) * GAME_W) / rect.width;
      const y = ((t.clientY - rect.top) * GAME_H) / rect.height;
      if (x < STICK_ZONE) {
        if (this.stickId === null) this.startStick(t.identifier, x, y);
      } else if (!this.fingers.has(t.identifier)) {
        this.fingers.set(t.identifier, -1);
        this.moveFinger(t.identifier, x, y);
      }
    }
  };

  private onMove = (e: TouchEvent): void => {
    if (!this.scene.sys.isActive()) return;
    let rect: DOMRect | null = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const isStick = t.identifier === this.stickId;
      if (!isStick && !this.fingers.has(t.identifier)) continue;
      rect ??= this.scene.game.canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = ((t.clientX - rect.left) * GAME_W) / rect.width;
      const y = ((t.clientY - rect.top) * GAME_H) / rect.height;
      if (isStick) this.updateStick(x, y);
      else this.moveFinger(t.identifier, x, y);
    }
  };

  /** touchend + touchcancel: luôn xử lý (kể cả lúc tạm dừng) để không bao giờ kẹt nút. */
  private onEnd = (e: TouchEvent): void => {
    for (let i = 0; i < e.changedTouches.length; i++) this.lift(e.changedTouches[i].identifier);
    this.prune(e.touches);
  };

  private lift(id: number): void {
    if (id === this.stickId) this.releaseStick();
    const b = this.fingers.get(id);
    if (b === undefined) return;
    this.fingers.delete(id);
    if (b >= 0) this.release(this.buttons[b]);
  }

  /** Phòng hờ trình duyệt "nuốt" touchend: ngón nào không còn trên màn hình thì thả ra. */
  private prune(list: TouchList): void {
    const alive = (id: number): boolean => {
      for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return true;
      return false;
    };
    if (this.stickId !== null && !alive(this.stickId)) this.releaseStick();
    for (const id of this.fingers.keys()) if (!alive(id)) this.lift(id);
  }

  // ------------------------------------------------------------ nút

  private moveFinger(id: number, x: number, y: number): void {
    const cur = this.fingers.get(id) ?? -1;
    const next = pickButton(this.buttons, x, y, cur, GRAB * this.k);
    if (next === cur) return;
    this.fingers.set(id, next);
    if (next >= 0) this.press(this.buttons[next]);
    if (cur >= 0) this.release(this.buttons[cur]);
  }

  private press(b: Btn): void {
    if (b.holds++ > 0) return;
    pressTouchButton(b.id);
    this.setLook(b, true);
  }

  private release(b: Btn): void {
    if (b.holds <= 0 || --b.holds > 0) return;
    releaseTouchButton(b.id);
    this.setLook(b, false);
  }

  // ------------------------------------------------------------ joystick

  private startStick(id: number, x: number, y: number): void {
    this.stickId = id;
    // tâm đặt đúng chỗ chạm (không kẹp vào trong): chạm sát mép không tự đi/ngồi
    this.ox = x;
    this.oy = y;
    this.sector = -1;
    this.base.setAlpha(1);
    this.updateStick(x, y);
  }

  private updateStick(x: number, y: number): void {
    const R = STICK_R * this.k;
    let dx = x - this.ox;
    let dy = y - this.oy;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      // nền bám theo ngón: muốn quay đầu chỉ cần kéo ngược lại một đoạn ngắn
      this.ox = x - (dx / len) * R;
      this.oy = y - (dy / len) * R;
      dx = x - this.ox;
      dy = y - this.oy;
    }
    // chỉ phần hình được kẹp vào trong màn hình (ngón có thể đang ở vùng viền đen)
    const bx = Phaser.Math.Clamp(this.ox, R, GAME_W - R);
    const by = Phaser.Math.Clamp(this.oy, R, GAME_H - R);
    this.base.setPosition(bx, by);
    this.thumb.setPosition(bx + dx, by + dy);

    this.sector = stickSector(dx, dy, R, this.sector);
    const d = this.sector < 0 ? null : STICK_DIRS[this.sector];
    touchInput.dirX = d ? d[0] : 0;
    touchInput.dirY = d ? d[1] : 0;
  }

  private releaseStick(): void {
    this.stickId = null;
    this.sector = -1;
    touchInput.dirX = 0;
    touchInput.dirY = 0;
    const R = STICK_R * this.k;
    const hx = Math.max(HOME_X, R + 8);
    const hy = Math.min(HOME_Y, GAME_H - R - 8);
    this.base.setPosition(hx, hy).setAlpha(0.35);
    this.thumb.setPosition(hx, hy);
  }

  private destroy(): void {
    window.removeEventListener('touchstart', this.onStart);
    window.removeEventListener('touchmove', this.onMove);
    window.removeEventListener('touchend', this.onEnd);
    window.removeEventListener('touchcancel', this.onEnd);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.reset, this);
    resetTouchInput();
  }
}
