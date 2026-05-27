import type { DifficultyState, LevelSpec } from '../core/types';
import { RECENT_WORD_BUFFER } from '../data/words';
import { getDifficulty } from './difficulty';
import { PlatformWordBuilder } from './platformWordBuilder';
import { SeededRandom } from './random';
import type { WordDictionary } from './wordProvider';

export class LevelManager {
  private readonly recentWords: string[] = [];

  constructor(
    private readonly random: SeededRandom,
    private readonly builder: PlatformWordBuilder,
    private readonly chooseThemeId: (levelIndex: number) => string,
    private readonly wordsByLength: WordDictionary
  ) {}

  createLevel(levelIndex: number): { level: LevelSpec; difficulty: DifficultyState } {
    const difficulty = getDifficulty(levelIndex);
    const word = this.pickWord(difficulty.wordLengthRange);
    const platforms = this.builder.build(word, levelIndex, difficulty);

    const level: LevelSpec = {
      id: levelIndex,
      word,
      themeId: this.chooseThemeId(levelIndex),
      platforms
    };

    this.recentWords.push(word);
    if (this.recentWords.length > RECENT_WORD_BUFFER) {
      this.recentWords.shift();
    }

    return { level, difficulty };
  }

  private pickWord([minLen, maxLen]: [number, number]): string {
    const lengths: number[] = [];
    for (let len = minLen; len <= maxLen; len += 1) {
      if (this.wordsByLength[len]?.length > 0) {
        lengths.push(len);
      }
    }

    if (lengths.length === 0) {
      const availableLengths = Object.keys(this.wordsByLength).map(Number);
      lengths.push(this.random.pick(availableLengths));
    }

    const shuffledLengths = lengths.sort(() => this.random.next() - 0.5);

    for (const len of shuffledLengths) {
      const pool = this.wordsByLength[len];
      const candidates = pool.filter((word) => !this.recentWords.includes(word));
      if (candidates.length > 0) {
        return this.random.pick(candidates);
      }
    }

    const fallbackLen = this.random.pick(lengths);
    return this.random.pick(this.wordsByLength[fallbackLen]);
  }
}
