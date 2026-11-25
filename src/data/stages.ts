import type { BossId } from './types';

export interface StageDef {
  mapKey: string;
  boss: BossId;
  /** Chủ đề nền (bầu trời + 3 lớp parallax). */
  theme: 1 | 2 | 3;
}

/** Màn → file map (public/maps) + boss. Nhạc/nền sẽ thêm ở Giai đoạn 8. */
export const stages: Record<number, StageDef> = {
  1: { mapKey: 'stage1', boss: 'datou', theme: 1 },
  2: { mapKey: 'stage2', boss: 'longthuyen', theme: 2 },
  3: { mapKey: 'stage3', boss: 'tuongquan', theme: 3 },
};
