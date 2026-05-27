export type InputResult = 'correct' | 'wrong' | 'burstPenalty';

export type PlatformBehavior = 'static' | 'movingHorizontal';

export interface PlatformSpec {
  char: string;
  x: number;
  y: number;
  width: number;
  behavior: PlatformBehavior;
}

export interface LevelSpec {
  id: number;
  word: string;
  themeId: string;
  platforms: PlatformSpec[];
}

export interface DifficultyState {
  levelIndex: number;
  wordLengthRange: [number, number];
  inputWindowMs: number;
  platformMotionProfile: {
    movingStartLevel: number;
    moveChance: number;
  };
}

export interface ThemeSpec {
  id: string;
  background: number;
  platformColor: number;
  accentColor: number;
  particlePreset: 'spark' | 'leaf' | 'pixel' | 'bubble';
  musicCue: string;
}

export interface PenaltyPolicy {
  wrongKeyDrop: 'previous_platform';
  burstWindowMs: number;
  burstThreshold: number;
  burstDrop: 'previous_level';
}
