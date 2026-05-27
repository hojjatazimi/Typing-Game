import { describe, expect, it } from 'vitest';
import { InputJudge } from '../src/game/inputJudge';

const POLICY = {
  wrongKeyDrop: 'previous_platform' as const,
  burstWindowMs: 2000,
  burstThreshold: 3,
  burstDrop: 'previous_level' as const
};

describe('InputJudge', () => {
  it('accepts case-insensitive exact keys', () => {
    const judge = new InputJudge(POLICY);
    expect(judge.judge('A', 'a', 100)).toBe('correct');
  });

  it('returns burstPenalty at threshold within window', () => {
    const judge = new InputJudge(POLICY);
    expect(judge.judge('x', 'a', 100)).toBe('wrong');
    expect(judge.judge('x', 'a', 300)).toBe('wrong');
    expect(judge.judge('x', 'a', 500)).toBe('burstPenalty');
  });

  it('expires old mistakes outside rolling window', () => {
    const judge = new InputJudge(POLICY);
    expect(judge.judge('x', 'a', 100)).toBe('wrong');
    expect(judge.judge('x', 'a', 2400)).toBe('wrong');
    expect(judge.judge('x', 'a', 2600)).toBe('wrong');
  });
});
