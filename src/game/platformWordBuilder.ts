import type { DifficultyState, PlatformSpec } from '../core/types';
import { BASE_X, BASE_Y, GAME_WIDTH, LEVEL_VERTICAL_GAP, PLATFORM_WIDTH, X_STEP } from '../data/config';
import { SeededRandom } from './random';

const RIGHT_MARGIN = 92;
const ROW_VERTICAL_GAP = 96;
const SUBTLE_STAIRSTEP_Y = 12;

export class PlatformWordBuilder {
  constructor(private readonly random: SeededRandom) {}

  build(word: string, levelIndex: number, difficulty: DifficultyState): PlatformSpec[] {
    const levelBaseY = BASE_Y - levelIndex * LEVEL_VERTICAL_GAP;
    const safeRightX = GAME_WIDTH - RIGHT_MARGIN;
    const columns = Math.max(1, Math.floor((safeRightX - BASE_X) / X_STEP) + 1);

    return word.split('').map((char, i) => {
      const column = i % columns;
      const row = Math.floor(i / columns);
      const wobble = this.random.nextInt(-14, 14);
      const x = clamp(BASE_X + column * X_STEP + wobble, BASE_X, safeRightX);
      const y = levelBaseY - row * ROW_VERTICAL_GAP - (column % 2) * SUBTLE_STAIRSTEP_Y;
      const canMove =
        levelIndex >= difficulty.platformMotionProfile.movingStartLevel &&
        this.random.next() < difficulty.platformMotionProfile.moveChance;

      return {
        char,
        x,
        y,
        width: PLATFORM_WIDTH,
        behavior: canMove ? 'movingHorizontal' : 'static'
      };
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
