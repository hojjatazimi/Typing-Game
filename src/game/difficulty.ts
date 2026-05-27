import type { DifficultyState } from '../core/types';

export function getDifficulty(levelIndex: number): DifficultyState {
  const minLen = Math.min(3 + Math.floor(levelIndex / 4), 8);
  const maxLen = Math.min(minLen + 1 + Math.floor(levelIndex / 7), 8);

  return {
    levelIndex,
    wordLengthRange: [minLen, Math.max(minLen, maxLen)],
    inputWindowMs: Math.max(450, 1000 - levelIndex * 20),
    platformMotionProfile: {
      movingStartLevel: 6,
      moveChance: Math.min(0.45, levelIndex * 0.03)
    }
  };
}
