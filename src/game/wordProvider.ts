import { WORDS_BY_LENGTH } from '../data/words';

export type WordDictionary = Record<number, string[]>;

interface RemoteWordFeed {
  version?: number;
  words?: unknown;
}

const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 8;
const MIN_USABLE_WORDS = 8;

export class WordProvider {
  constructor(
    private readonly fallbackWords: WordDictionary = WORDS_BY_LENGTH,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async load(feedUrl = import.meta.env.VITE_WORD_FEED_URL || '/words.json'): Promise<WordDictionary> {
    if (!feedUrl) {
      return this.fallbackWords;
    }

    try {
      const response = await this.fetcher(feedUrl);
      if (!response.ok) {
        return this.fallbackWords;
      }

      const payload = (await response.json()) as RemoteWordFeed;
      const remoteWords = this.normalizeFeed(payload);
      return this.hasEnoughWords(remoteWords) ? remoteWords : this.fallbackWords;
    } catch {
      return this.fallbackWords;
    }
  }

  normalizeFeed(payload: RemoteWordFeed): WordDictionary {
    if (!Array.isArray(payload.words)) {
      return {};
    }

    const grouped: WordDictionary = {};
    const uniqueWords = new Set<string>();

    payload.words.forEach((value) => {
      if (typeof value !== 'string') {
        return;
      }

      const word = value.trim().toLowerCase();
      if (!/^[a-z]+$/.test(word) || word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) {
        return;
      }

      uniqueWords.add(word);
    });

    uniqueWords.forEach((word) => {
      grouped[word.length] ??= [];
      grouped[word.length].push(word);
    });

    return grouped;
  }

  private hasEnoughWords(words: WordDictionary): boolean {
    const total = Object.values(words).reduce((sum, group) => sum + group.length, 0);
    return total >= MIN_USABLE_WORDS;
  }
}
