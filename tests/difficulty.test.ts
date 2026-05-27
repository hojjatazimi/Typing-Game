import { describe, expect, it } from 'vitest';
import { getDifficulty } from '../src/game/difficulty';

describe('difficulty progression', () => {
  it('increases or maintains min word length over time', () => {
    const d0 = getDifficulty(0);
    const d20 = getDifficulty(20);
    expect(d20.wordLengthRange[0]).toBeGreaterThanOrEqual(d0.wordLengthRange[0]);
  });

  it('ramps move chance', () => {
    const d4 = getDifficulty(4);
    const d18 = getDifficulty(18);
    expect(d18.platformMotionProfile.moveChance).toBeGreaterThan(d4.platformMotionProfile.moveChance);
  });
});
