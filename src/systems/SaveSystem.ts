const KEY = 'ninja-phong-anh-v1';

export interface Settings {
  sound: boolean;
  vibrate: boolean;
  /** Hệ số kích thước nút cảm ứng (0.8–1.4). */
  touchScale: number;
}

interface SaveData {
  settings: Settings;
  highScore: number;
  board: number[];
}

const defaults = (): SaveData => ({
  settings: { sound: true, vibrate: true, touchScale: 1 },
  highScore: 0,
  board: [],
});

let cache: SaveData | null = null;

function load(): SaveData {
  if (cache) return cache;
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<SaveData>;
      Object.assign(d.settings, p.settings);
      d.highScore = Number(p.highScore) || 0;
      d.board = Array.isArray(p.board) ? p.board.filter((n) => typeof n === 'number') : [];
    }
  } catch {
    /* localStorage bị chặn → dùng mặc định */
  }
  cache = d;
  return d;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    /* bỏ qua */
  }
}

export const save = {
  get settings(): Settings {
    return load().settings;
  },
  update(patch: Partial<Settings>): void {
    Object.assign(load().settings, patch);
    persist();
  },
  get highScore(): number {
    return load().highScore;
  },
  get board(): readonly number[] {
    return load().board;
  },
  /** Ghi điểm; trả về true nếu là kỷ lục mới. */
  submitScore(score: number): boolean {
    const d = load();
    const record = score > d.highScore;
    if (record) d.highScore = score;
    d.board = [...d.board, score].sort((a, b) => b - a).slice(0, 10);
    persist();
    return record;
  },
};
