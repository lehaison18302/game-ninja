import Phaser from 'phaser';
import { COLORS, DEPTH, EVT, GAME_W, PLAYER } from '../constants';
import { initCamera } from '../core/camera';
import { run } from '../core/GameState';
import { characters } from '../data/characters';
import { weapons } from '../data/weapons';
import { TouchControls } from '../systems/TouchControls';
import { t } from '../text/t';
import type { TextKey } from '../text/vi';
import { makeText } from '../ui/text';

const BOSS_BAR_W = 220;

/** HUD + nút cảm ứng, chạy song song với GameScene (không bị camera game kéo theo). */
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private livesText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossMax = 1;
  private banner!: Phaser.GameObjects.Text;
  private sub!: Phaser.GameObjects.Text;
  private intro!: Phaser.GameObjects.Text;
  private itemText!: Phaser.GameObjects.Text;
  private smokeText!: Phaser.GameObjects.Text;
  private shieldIcon!: Phaser.GameObjects.Image;
  private touch?: TouchControls;
  private game_!: Phaser.Scene;

  constructor() {
    super('UIScene');
  }

  create(): void {
    initCamera(this.cameras.main);
    this.game_ = this.scene.get('GameScene');
    this.hearts = [];

    for (let i = 0; i < PLAYER.hearts; i++) {
      this.hearts.push(
        this.add
          .image(8 + i * 18, 8, 'heart-full')
          .setOrigin(0, 0)
          .setDepth(DEPTH.ui),
      );
    }
    this.livesText = makeText(this, 66, 5, '', { size: 14 });
    this.weaponText = makeText(this, 8, 24, '', { size: 14, color: COLORS.textGold });
    this.scoreText = makeText(this, GAME_W - 40, 5, '', { size: 14, origin: [1, 0] });
    this.bossName = makeText(this, GAME_W / 2, 6, '', {
      size: 14,
      origin: [0.5, 0],
      color: COLORS.textRed,
    }).setVisible(false);
    this.bossBar = this.add.graphics().setDepth(DEPTH.ui).setVisible(false);
    this.banner = makeText(this, GAME_W / 2, 100, '', {
      size: 36,
      origin: 0.5,
      color: COLORS.textRed,
    }).setVisible(false);

    this.sub = makeText(this, GAME_W / 2, 136, '', {
      size: 18,
      origin: 0.5,
      color: COLORS.textGold,
    }).setVisible(false);
    this.intro = makeText(this, GAME_W / 2, 90, '', { size: 26, origin: 0.5 }).setVisible(false);

    this.itemText = makeText(this, GAME_W / 2, 176, '', {
      size: 16,
      origin: 0.5,
      color: COLORS.textGold,
    }).setVisible(false);
    this.smokeText = makeText(this, 8, 40, '', { size: 14, color: COLORS.text }).setVisible(false);
    this.shieldIcon = this.add
      .image(8 + PLAYER.hearts * 18 + 36, 8, 'item-shield')
      .setOrigin(0, 0)
      .setScale(0.75)
      .setDepth(DEPTH.ui)
      .setVisible(false);

    this.makePauseButton();
    if (this.sys.game.device.input.touch) this.touch = new TouchControls(this);

    const ev = this.game_.events;
    ev.on(EVT.heartsChanged, this.setHearts, this);
    ev.on(EVT.livesChanged, this.setLives, this);
    ev.on(EVT.weaponChanged, this.setWeapon, this);
    ev.on(EVT.scoreChanged, this.setScore, this);
    ev.on(EVT.bossShow, this.showBoss, this);
    ev.on(EVT.bossHp, this.setBossHp, this);
    ev.on(EVT.bossWarning, this.showWarning, this);
    ev.on(EVT.stageClear, this.showClear, this);
    ev.on(EVT.skillCooldown, this.setSkillCd, this);
    ev.on(EVT.pickupTaken, this.showItem, this);
    ev.on(EVT.smokeChanged, this.setSmoke, this);
    ev.on(EVT.shieldChanged, this.setShield, this);
    const onResume = (): void => this.touch?.reset();
    this.events.on(Phaser.Scenes.Events.RESUME, onResume);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, onResume);
      ev.off(EVT.heartsChanged, this.setHearts, this);
      ev.off(EVT.livesChanged, this.setLives, this);
      ev.off(EVT.weaponChanged, this.setWeapon, this);
      ev.off(EVT.scoreChanged, this.setScore, this);
      ev.off(EVT.bossShow, this.showBoss, this);
      ev.off(EVT.bossHp, this.setBossHp, this);
      ev.off(EVT.bossWarning, this.showWarning, this);
      ev.off(EVT.stageClear, this.showClear, this);
      ev.off(EVT.skillCooldown, this.setSkillCd, this);
      ev.off(EVT.pickupTaken, this.showItem, this);
      ev.off(EVT.smokeChanged, this.setSmoke, this);
      ev.off(EVT.shieldChanged, this.setShield, this);
    });

    this.setHearts(run.hearts);
    this.showIntro(run.stage);
    this.setLives(run.lives);
    this.setWeapon();
    this.setScore(run.score);
  }

  private makePauseButton(): void {
    const x = GAME_W - 18;
    const y = 18;
    const bg = this.add
      .circle(x, y, 13, 0x000000, 0.4)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(DEPTH.ui);
    this.add.rectangle(x - 3, y, 3, 10, 0xffffff, 0.9).setDepth(DEPTH.ui);
    this.add.rectangle(x + 3, y, 3, 10, 0xffffff, 0.9).setDepth(DEPTH.ui);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => this.game_.events.emit(EVT.pauseRequest));
  }

  private setHearts(n: number): void {
    this.hearts.forEach((h, i) => h.setTexture(i < n ? 'heart-full' : 'heart-empty'));
  }

  private setLives(n: number): void {
    this.livesText.setText(`${t('hud.lives')} ×${n}`);
  }

  private setWeapon(): void {
    const w = weapons[characters[run.character].weapon];
    this.weaponText.setText(`${t(w.nameKey)} ${t('weapon.level')}${run.weaponLevel}`);
  }

  private setScore(n: number): void {
    this.scoreText.setText(`${t('hud.score')} ${String(n).padStart(6, '0')}`);
  }

  private showBoss(name: string, max: number): void {
    this.bossMax = max;
    this.bossName.setText(name).setVisible(true);
    this.bossBar.setVisible(true);
    this.setBossHp(max);
  }

  private setBossHp(hp: number): void {
    const x = (GAME_W - BOSS_BAR_W) / 2;
    const ratio = Phaser.Math.Clamp(hp / this.bossMax, 0, 1);
    this.bossBar.clear();
    this.bossBar.fillStyle(0x000000, 0.7).fillRect(x - 2, 21, BOSS_BAR_W + 4, 10);
    this.bossBar.fillStyle(0xc8321e, 1).fillRect(x, 23, BOSS_BAR_W * ratio, 6);
    if (hp <= 0)
      this.time.delayedCall(600, () => {
        this.bossName.setVisible(false);
        this.bossBar.setVisible(false);
      });
  }

  private flashBanner(text: string, color: string, ms: number): void {
    this.banner.setText(text).setColor(color).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.banner);
    this.tweens.add({
      targets: this.banner,
      alpha: { from: 1, to: 0.15 },
      duration: 250,
      yoyo: true,
      repeat: Math.max(0, Math.floor(ms / 500) - 1),
      onComplete: () => this.banner.setVisible(false),
    });
  }

  private showWarning(): void {
    this.flashBanner(t('hud.warning'), COLORS.textRed, 2000);
  }

  private showClear(bonus: number): void {
    this.flashBanner(t('hud.stageClear'), COLORS.textGold, 2500);
    if (bonus > 0) {
      this.sub.setText(`${t('hud.noHitBonus')}: +${bonus}`).setVisible(true);
      this.time.delayedCall(3000, () => this.sub.setVisible(false));
    }
  }

  private showIntro(stage: number): void {
    this.intro
      .setText(t(`stage.${stage}` as TextKey))
      .setVisible(true)
      .setAlpha(1);
    this.tweens.add({
      targets: this.intro,
      alpha: 0,
      delay: 1100,
      duration: 600,
      onComplete: () => this.intro.setVisible(false),
    });
  }

  private showItem(item: string): void {
    this.itemText
      .setText(t(`item.${item}` as TextKey))
      .setVisible(true)
      .setAlpha(1);
    this.tweens.killTweensOf(this.itemText);
    this.tweens.add({
      targets: this.itemText,
      alpha: 0,
      delay: 900,
      duration: 400,
      onComplete: () => this.itemText.setVisible(false),
    });
  }

  private setSmoke(n: number): void {
    this.smokeText.setText(`${t('item.smoke')} ×${n}`).setVisible(n > 0);
  }

  private setShield(on: boolean): void {
    this.shieldIcon.setVisible(on);
  }

  private setSkillCd(ratio: number): void {
    this.touch?.setSkillCooldown(ratio);
  }
}
