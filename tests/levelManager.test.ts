import { describe, expect, it } from 'vitest';
import { LevelManager } from '../src/game/levelManager';
import { PlatformWordBuilder } from '../src/game/platformWordBuilder';
import { SeededRandom } from '../src/game/random';
import { BASE_X, GAME_WIDTH } from '../src/data/config';
import { WORDS_BY_LENGTH } from '../src/data/words';

describe('LevelManager + PlatformWordBuilder', () => {
  it('builds platform count equal to word length', () => {
    const random = new SeededRandom(99);
    const builder = new PlatformWordBuilder(random);
    const manager = new LevelManager(random, builder, (idx) => `theme-${idx % 4}`, WORDS_BY_LENGTH);

    const { level } = manager.createLevel(0);
    expect(level.platforms.length).toBe(level.word.length);
  });

  it('keeps generated platforms within the playfield', () => {
    const random = new SeededRandom(42);
    const builder = new PlatformWordBuilder(random);
    const platforms = builder.build('function', 12, {
      levelIndex: 12,
      wordLengthRange: [8, 8],
      inputWindowMs: 800,
      platformMotionProfile: {
        movingStartLevel: 99,
        moveChance: 0
      }
    });

    expect(platforms.every((platform) => platform.x >= BASE_X)).toBe(true);
    expect(platforms.every((platform) => platform.x <= GAME_WIDTH - 92)).toBe(true);
    expect(platforms[6].x).toBeLessThan(platforms[5].x);
    expect(platforms[6].y).toBeLessThan(platforms[0].y);
  });
});
