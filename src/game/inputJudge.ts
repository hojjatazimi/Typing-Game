import type { InputResult, PenaltyPolicy } from '../core/types';

export class InputJudge {
  private readonly mistakeTimestamps: number[] = [];

  constructor(private readonly policy: PenaltyPolicy) {}

  judge(inputKey: string, expectedChar: string, nowMs: number): InputResult {
    if (normalizeKey(inputKey) === normalizeKey(expectedChar)) {
      return 'correct';
    }

    this.mistakeTimestamps.push(nowMs);
    this.pruneOld(nowMs);

    if (this.mistakeTimestamps.length >= this.policy.burstThreshold) {
      return 'burstPenalty';
    }

    return 'wrong';
  }

  clearMistakes(nowMs: number): void {
    this.pruneOld(nowMs);
    if (this.mistakeTimestamps.length > 0) {
      this.mistakeTimestamps.shift();
    }
  }

  getMistakeLoad(nowMs: number): number {
    this.pruneOld(nowMs);
    return Math.min(1, this.mistakeTimestamps.length / this.policy.burstThreshold);
  }

  private pruneOld(nowMs: number): void {
    const minTs = nowMs - this.policy.burstWindowMs;
    while (this.mistakeTimestamps.length > 0 && this.mistakeTimestamps[0] < minTs) {
      this.mistakeTimestamps.shift();
    }
  }
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}
