import { PLAYER } from '../constants';
import type { CharacterId } from '../data/types';

/** Trạng thái một lượt chơi, giữ xuyên các màn (cấp vũ khí gắn với người chơi, không gắn với ninja). */
export const run = {
  character: 'kage' as CharacterId,
  weaponLevel: 1,
  score: 0,
  lives: PLAYER.lives as number,
  /** Qua màn không hồi tim. */
  hearts: PLAYER.hearts as number,
  stage: 1,
  /** Mốc đầu màn, để "Chơi tiếp/Chơi lại màn" quay về đúng chỗ. */
  stageStart: { score: 0, weaponLevel: 1, hearts: PLAYER.hearts as number },
};

export function resetRun(): void {
  run.weaponLevel = 1;
  run.score = 0;
  run.lives = PLAYER.lives;
  run.hearts = PLAYER.hearts;
  run.stage = 1;
  run.stageStart.score = 0;
  run.stageStart.weaponLevel = 1;
  run.stageStart.hearts = PLAYER.hearts;
}

/** Gọi khi bắt đầu một màn. */
export function markStageStart(): void {
  run.stageStart.score = run.score;
  run.stageStart.weaponLevel = run.weaponLevel;
  run.stageStart.hearts = run.hearts;
}

/** "Chơi tiếp" sau khi hết mạng: chơi lại từ đầu màn hiện tại, điểm về 0, đủ mạng, giữ cấp vũ khí đầu màn. */
export function continueStage(): void {
  run.score = 0;
  run.weaponLevel = run.stageStart.weaponLevel;
  run.lives = PLAYER.lives;
  run.hearts = PLAYER.hearts;
}

/** "Chơi lại màn" từ menu tạm dừng: về mốc đầu màn. */
export function restartStage(): void {
  run.score = run.stageStart.score;
  run.weaponLevel = run.stageStart.weaponLevel;
  run.hearts = run.stageStart.hearts;
}
