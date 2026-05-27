import type { ThemeSpec } from '../core/types';

export class ThemeManager {
  constructor(private readonly themes: ThemeSpec[]) {
    if (themes.length === 0) {
      throw new Error('ThemeManager requires at least one theme.');
    }
  }

  forLevel(levelIndex: number): ThemeSpec {
    return this.themes[levelIndex % this.themes.length];
  }
}
