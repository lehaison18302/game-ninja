/** Kích thước màn hình logic (toàn bộ code game dùng toạ độ này). */
export const GAME_W = 480;
export const GAME_H = 270;
/** Canvas thật = logic × RENDER_SCALE (camera zoom bù lại) → chữ có dấu tiếng Việt luôn sắc nét. */
export const RENDER_SCALE = 2;
export const TILE = 16;
/** Số màn có sẵn file map trong public/maps. */
export const STAGE_COUNT = 3;

export const FONT_FAMILY = 'VT323';
export const COLORS = {
  bg: 0x0b1026,
  moon: 0xffe27a,
  red: 0xc8321e,
  text: '#f4f1e1',
  textDim: '#8a93b8',
  textGold: '#ffe27a',
  textRed: '#ff6a55',
} as const;

export const DEPTH = {
  bg: 0,
  tiles: 10,
  pickup: 20,
  enemy: 30,
  boss: 35,
  player: 40,
  projectile: 50,
  fx: 60,
  ui: 100,
} as const;

/** Tên event dùng chung (this.events / game.events). */
export const EVT = {
  playerHit: 'player-hit',
  playerDied: 'player-died',
  playerRespawn: 'player-respawn',
  heartsChanged: 'hearts-changed',
  livesChanged: 'lives-changed',
  weaponChanged: 'weapon-changed',
  scoreChanged: 'score-changed',
  bossHp: 'boss-hp',
  bossShow: 'boss-show',
  bossWarning: 'boss-warning',
  stageClear: 'stage-clear',
  gameOver: 'game-over',
  enemyKilled: 'enemy-killed',
  pickupTaken: 'pickup-taken',
  smokeChanged: 'smoke-changed',
  shieldChanged: 'shield-changed',
  skillCooldown: 'skill-cooldown',
  pauseRequest: 'pause-request',
  bossDefeated: 'boss-defeated',
} as const;

/** Thông số lối chơi nhân vật (tinh chỉnh trên máy thật). */
export const PLAYER = {
  runSpeed: 90,
  jumpSpeed: 300,
  gravity: 900,
  coyoteMs: 80,
  jumpBufferMs: 100,
  dropThroughMs: 250,
  bodyW: 12,
  bodyH: 28,
  proneH: 14,
  hearts: 3,
  lives: 3,
  hurtIframes: 1500,
  respawnIframes: 2000,
  knockbackX: 80,
  knockbackY: 150,
  hitStopMs: 50,
  dashDistance: 120,
  dashMs: 150,
  dashCooldownMs: 800,
} as const;

export const POOL = {
  playerBullets: 64,
  enemyBullets: 48,
  enemies: 24,
  particles: 96,
} as const;
