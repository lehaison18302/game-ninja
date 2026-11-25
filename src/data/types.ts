import type { TextKey } from '../text/vi';

export type CharacterId = 'kage' | 'fuuka' | 'hayate' | 'ren';
export type WeaponId = 'shuriken' | 'tessen' | 'yumi' | 'tanto';
export type ProjectileBehavior = 'straight' | 'wind' | 'arrow' | 'kunai' | 'slash' | 'blast';
export type FireMode = 'auto' | 'charge' | 'melee';

export interface WeaponLevel {
  damage: number;
  speed: number;
  /** Giây giữa hai lần ra đòn. */
  cooldown: number;
  count: number;
  /** Góc giữa hai tia (độ). */
  spread: number;
  /** Tessen: hệ số kích thước lúc cuối đường bay. */
  grow?: number;
  /** Tessen Lv3: biên độ đan nhau (px). */
  weave?: number;
}

export interface ChargeDef {
  /** Thời gian gồng đầy cho mỗi cấp (ms). */
  ms: [number, number, number];
  damageMul: number;
  speedMul: number;
  /** Hệ số tốc độ di chuyển khi đang gồng. */
  moveMul: number;
  /** Từ cấp này, tên gồng tách 3 mũi khi trúng. */
  splitAtLevel: number;
}

export interface MeleeDef {
  range: number;
  damage: [number, number, number];
  cooldown: number;
  /** Từ cấp này, kunai nổ khi cắm vào địch. */
  explodeAtLevel: number;
  /** Từ cấp này, đường chém tạo thêm sóng kiếm. */
  waveAtLevel: number;
}

export interface WeaponDef {
  id: WeaponId;
  nameKey: TextKey;
  mode: FireMode;
  behavior: ProjectileBehavior;
  pierce: boolean;
  /** Giây. */
  /** Tầm bay tối đa (px); thời gian sống = tầm / tốc độ. Màn hình rộng 480px. */
  range: number;
  sprite: string;
  knockback?: number;
  /** Chặn được đạn thường của địch. */
  blocksBullets?: boolean;
  charge?: ChargeDef;
  melee?: MeleeDef;
  levels: [WeaponLevel, WeaponLevel, WeaponLevel];
}

export interface CharacterDef {
  id: CharacterId;
  nameKey: TextKey;
  descKey: TextKey;
  weapon: WeaponId;
  color: number;
  /** Kỹ năng nút C: lướt hoặc dùng vật phẩm (bom khói). */
  skill: 'dash' | 'item';
  /** Thang 1–5 hiển thị ở màn Chọn ninja. */
  stats: { range: number; damage: number; speed: number; pierce: boolean };
}

export interface Vec {
  x: number;
  y: number;
}

export type EnemyId = 'ashigaru' | 'archer' | 'turret' | 'crow' | 'redninja' | 'barrel' | 'carrier';
export type ItemId = 'upgrade' | 'rice' | 'shield' | 'smoke';
export type EnemyAI = 'walker' | 'shooter' | 'turret' | 'flyer' | 'jumper' | 'roller' | 'carrier';

export interface EnemyFire {
  texture: string;
  /** px/s – chậm hơn đạn người chơi để kịp né. */
  speed: number;
  /** ms chờ giữa hai loạt. */
  cooldown: number;
  /** ms cảnh báo (≥ 300) trước khi bắn. */
  telegraph: number;
  count: number;
  /** Độ giữa các tia. */
  spread: number;
  /** Bắn theo 8 hướng (tháp nỏ) thay vì nhắm thẳng. */
  snap8?: boolean;
}

export interface EnemyDef {
  id: EnemyId;
  ai: EnemyAI;
  hp: number;
  /** px/s. */
  speed: number;
  score: number;
  texture: string;
  /** Hitbox (px). */
  w: number;
  h: number;
  gravity: boolean;
  /** Chạm người chơi gây sát thương. */
  contact: boolean;
  /** Đòn thường chỉ gây một nửa (trừ tên gồng, chém, nổ). */
  armored?: boolean;
  /** Màu hạt khi chết. */
  color: number;
  fire?: EnemyFire;
}

export type BossId = 'datou' | 'longthuyen' | 'tuongquan';
export type PatternId =
  | 'throwRocks'
  | 'fireBreath'
  | 'slam'
  | 'cannonVolley'
  | 'dragonSpit'
  | 'ramCharge'
  | 'shadowDash'
  | 'shurikenFan'
  | 'summonClones'
  | 'darkRain';

export interface BossPhaseDef {
  /** Vào phase này khi máu ≤ tỉ lệ này (1 = ngay từ đầu). */
  hpBelow: number;
  patterns: { id: PatternId; weight: number }[];
  /** Hệ số thời gian nghỉ giữa hai pattern (nhỏ = dồn dập hơn). */
  cooldownMul: number;
}

export interface BossDef {
  id: BossId;
  nameKey: TextKey;
  hp: number;
  texture: string;
  /** Hitbox (px). */
  w: number;
  h: number;
  score: number;
  /** Nghỉ giữa hai pattern (ms). */
  cooldownMs: number;
  phases: BossPhaseDef[];
}
