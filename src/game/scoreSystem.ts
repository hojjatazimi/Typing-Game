export class ScoreSystem {
  private score = 0;
  private combo = 0;
  private multiplier = 1;

  onCorrectJump(): void {
    this.combo += 1;
    this.multiplier = 1 + Math.floor(this.combo / 4);
    this.score += 10 * this.multiplier;
  }

  onWrongKey(): void {
    this.combo = 0;
    this.multiplier = 1;
  }

  onLevelComplete(levelIndex: number): void {
    this.score += 50 + levelIndex * 5;
  }

  getState(): { score: number; combo: number; multiplier: number } {
    return {
      score: this.score,
      combo: this.combo,
      multiplier: this.multiplier
    };
  }
}
