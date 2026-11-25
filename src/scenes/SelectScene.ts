import Phaser from 'phaser';
import { COLORS, GAME_W } from '../constants';
import { initCamera } from '../core/camera';
import { run } from '../core/GameState';
import { CHARACTER_ORDER, characters } from '../data/characters';
import { skills } from '../data/skills';
import { weapons } from '../data/weapons';
import type { CharacterId } from '../data/types';
import { t } from '../text/t';
import type { TextKey } from '../text/vi';
import { makeButton } from '../ui/Button';
import { makeText } from '../ui/text';

const CARD_W = 108;
const CARD_H = 104;
const CARD_Y = 36;
const PREVIEW = { x: 330, y: 182 };

/** Chọn ninja trước mỗi màn: chỉ số + xem trước cách đánh (đạn bay lặp lại). */
export class SelectScene extends Phaser.Scene {
  private cards = new Map<CharacterId, Phaser.GameObjects.Rectangle>();
  private desc!: Phaser.GameObjects.Text;
  private skillName!: Phaser.GameObjects.Text;
  private skillDesc!: Phaser.GameObjects.Text;
  private statGfx!: Phaser.GameObjects.Graphics;
  private statLabels: Phaser.GameObjects.Text[] = [];
  private previewNinja!: Phaser.GameObjects.Image;
  private previewTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('SelectScene');
  }

  create(): void {
    initCamera(this.cameras.main);
    this.cards.clear();
    this.statLabels = [];
    this.add.image(0, 0, 'sky').setOrigin(0, 0);

    makeText(this, GAME_W / 2, 6, t('select.title'), {
      size: 22,
      origin: [0.5, 0],
      color: COLORS.textGold,
    });
    makeText(this, GAME_W - 8, 8, t(`stage.${run.stage}` as TextKey), {
      size: 12,
      origin: [1, 0],
      color: COLORS.textDim,
    });

    CHARACTER_ORDER.forEach((id, i) => {
      const def = characters[id];
      const x = 8 + i * (CARD_W + 6);
      const card = this.add
        .rectangle(x, CARD_Y, CARD_W, CARD_H, 0x141a38, 0.95)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0x3a4a8a)
        .setInteractive({ useHandCursor: true });
      card.on('pointerup', () => this.choose(id));
      this.cards.set(id, card);
      this.add.image(x + CARD_W / 2, CARD_Y + 40, `ninja-${id}`).setScale(1.8);
      makeText(this, x + CARD_W / 2, CARD_Y + 74, t(def.nameKey), { origin: 0.5, size: 16 });
      makeText(this, x + CARD_W / 2, CARD_Y + 91, t(weapons[def.weapon].nameKey), {
        origin: 0.5,
        size: 12,
        color: COLORS.textDim,
        stroke: false,
      });
    });

    this.desc = makeText(this, 8, 146, '', { size: 14, wrap: GAME_W - 16, color: COLORS.textGold });
    this.skillName = makeText(this, 200, 204, '', { size: 14, color: COLORS.textGold });
    this.skillDesc = makeText(this, 200, 220, '', {
      size: 12,
      wrap: 146,
      color: COLORS.text,
      stroke: false,
    });
    this.statGfx = this.add.graphics();
    this.previewNinja = this.add.image(PREVIEW.x - 28, PREVIEW.y, 'ninja-kage');

    makeButton(this, GAME_W - 70, 250, 120, 28, t('select.go'), () => this.start(), { size: 18 });
    this.choose(run.character);

    this.previewTimer = this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => this.firePreview(),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.previewTimer?.remove());
  }

  private choose(id: CharacterId): void {
    run.character = id;
    for (const [cid, card] of this.cards) {
      card.setStrokeStyle(cid === id ? 3 : 2, cid === id ? COLORS.moon : 0x3a4a8a);
    }
    const def = characters[id];
    this.desc.setText(t(def.descKey as TextKey));
    const skill = skills[def.skill];
    this.skillName.setText(`${t('select.skill')}: ${t(skill.nameKey)}`);
    this.skillDesc.setText(t(skill.descKey));
    this.previewNinja.setTexture(`ninja-${id}`);

    this.statGfx.clear();
    for (const l of this.statLabels) l.destroy();
    this.statLabels = [];
    const rows: [TextKey, number | boolean][] = [
      ['select.range', def.stats.range],
      ['select.damage', def.stats.damage],
      ['select.speed', def.stats.speed],
      ['select.pierce', def.stats.pierce],
    ];
    rows.forEach(([key, v], i) => {
      const y = 176 + i * 17;
      this.statLabels.push(makeText(this, 10, y - 8, t(key), { size: 13, stroke: false }));
      if (typeof v === 'boolean') {
        this.statLabels.push(
          makeText(this, 112, y - 8, t(v ? 'select.yes' : 'select.no'), {
            size: 13,
            stroke: false,
            color: v ? COLORS.textGold : COLORS.textDim,
          }),
        );
      } else {
        for (let n = 0; n < 5; n++) {
          this.statGfx
            .fillStyle(n < v ? COLORS.moon : 0x2a3260, 1)
            .fillRect(112 + n * 16, y - 4, 13, 8);
        }
      }
    });
    this.statLabels.push(
      makeText(this, 10, 244, `${t('weapon.level')} ${run.weaponLevel}`, {
        size: 14,
        color: COLORS.textGold,
        stroke: false,
      }),
    );
  }

  /** Xem trước cách đánh: phóng vài đạn minh hoạ theo vũ khí + cấp hiện tại. */
  private firePreview(): void {
    const def = weapons[characters[run.character].weapon];
    const lv = def.levels[run.weaponLevel - 1];
    const n = def.mode === 'melee' ? 1 : lv.count;
    const dur = def.mode === 'melee' ? 350 : Math.min(900, def.range * 2.2);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * lv.spread;
      const rad = (off * Math.PI) / 180;
      const dist = def.mode === 'melee' ? 70 : 110;
      const s = this.add.image(PREVIEW.x - 10, PREVIEW.y - 8, def.sprite).setRotation(rad);
      if (def.behavior === 'wind') s.setScale(0.8);
      if (def.mode === 'charge') s.setScale(1.3).setTint(0x9fe8ff);
      this.tweens.add({
        targets: s,
        x: s.x + Math.cos(rad) * dist,
        y: s.y + Math.sin(rad) * dist,
        scale: def.behavior === 'wind' ? 2 : s.scale,
        alpha: def.behavior === 'wind' ? 0.2 : 1,
        duration: dur,
        onComplete: () => s.destroy(),
      });
    }
  }

  private start(): void {
    this.scene.start('GameScene');
  }
}
