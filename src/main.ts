import Phaser from 'phaser';
import '@fontsource/vt323/latin-400.css';
import '@fontsource/vt323/latin-ext-400.css';
import '@fontsource/vt323/vietnamese-400.css';
import { EVT, GAME_H, GAME_W, PLAYER, RENDER_SCALE } from './constants';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';
import { PreloadScene } from './scenes/PreloadScene';
import { SelectScene } from './scenes/SelectScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';
import { VictoryScene } from './scenes/VictoryScene';
import { save } from './systems/SaveSystem';
import { t } from './text/t';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W * RENDER_SCALE,
  height: GAME_H * RENDER_SCALE,
  backgroundColor: '#0b1026',
  pixelArt: true,
  disableContextMenu: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  fps: { target: 60 },
  input: { activePointers: 4, gamepad: true },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: PLAYER.gravity } } },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    SelectScene,
    GameScene,
    UIScene,
    PauseScene,
    GameOverScene,
    VictoryScene,
  ],
});

game.sound.mute = !save.settings.sound;

// Chỉ khi chạy dev: mở game ra console để gỡ lỗi / kiểm thử tự động (bản build không có dòng này).
if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;

// Nhắc xoay ngang; đang chơi mà xoay dọc thì tự tạm dừng.
const rotate = document.getElementById('rotate');
if (rotate) rotate.textContent = t('boot.landscape');
window.matchMedia('(orientation: portrait)').addEventListener('change', (e) => {
  if (e.matches) game.scene.getScene('GameScene')?.events.emit(EVT.pauseRequest);
});
