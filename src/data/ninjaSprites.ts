// TỰ SINH bởi tools/build_sprites.py – đừng sửa tay, chạy lại script.
import type { CharacterId } from './types';

export type NinjaAnim = 'idle' | 'run' | 'jump' | 'fall' | 'crouch' | 'attack' | 'aim' | 'dash';

export interface NinjaSprite {
  /** Kích thước một ô (pixel texture = 2× pixel logic). Gốc chân ở giữa đáy ô. */
  frameWidth: number;
  frameHeight: number;
  /** Chỉ số khung theo thứ tự phát; thiếu động tác nào thì dùng động tác thay thế. */
  anims: Partial<Record<NinjaAnim, number[]>>;
}

export const NINJA_SPRITES: Record<CharacterId, NinjaSprite> = {
  kage: {
    frameWidth: 86,
    frameHeight: 75,
    anims: {
      idle: [0, 1, 2, 3, 4, 5, 6, 7],
      run: [8, 9, 10, 11, 12, 13, 14, 15],
      jump: [16, 17],
      fall: [18],
      crouch: [19],
      attack: [20, 21, 22],
    },
  },
  fuuka: {
    frameWidth: 84,
    frameHeight: 73,
    anims: {
      idle: [0, 1, 2, 3, 4, 5, 6, 7],
      run: [8, 9, 10],
      jump: [10],
      fall: [8],
      crouch: [11],
      attack: [12, 13, 14],
    },
  },
  hayate: {
    frameWidth: 96,
    frameHeight: 83,
    anims: {
      idle: [0, 1, 2, 3, 4, 5, 6],
      run: [7, 8, 9, 10, 11, 12, 13, 14],
      jump: [15],
      fall: [16],
      crouch: [17],
      aim: [18, 19, 20],
      attack: [21, 22],
    },
  },
  ren: {
    frameWidth: 100,
    frameHeight: 79,
    anims: {
      idle: [0, 1, 2, 3, 4],
      run: [5, 6, 7, 8, 9],
      dash: [10, 11, 12],
      jump: [13],
      fall: [14],
      crouch: [15],
      attack: [16, 17],
    },
  },
};
