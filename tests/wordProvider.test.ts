import { describe, expect, it } from 'vitest';
import { WORDS_BY_LENGTH } from '../src/data/words';
import { WordProvider } from '../src/game/wordProvider';

function response(payload: unknown, ok = true): Response {
  return {
    ok,
    json: async () => payload
  } as Response;
}

describe('WordProvider', () => {
  it('normalizes and groups remote words by length', async () => {
    const fetcher = async () =>
      response({
        version: 1,
        words: [' Array ', 'PALACE', 'satrap', 'bad-word', 'x', 'return', 'array', 'cyrus', 'lapis', 'gold', 'debug']
      });
    const provider = new WordProvider(WORDS_BY_LENGTH, fetcher as typeof fetch);

    const words = await provider.load('/words.json');

    expect(words[4]).toContain('gold');
    expect(words[5]).toEqual(expect.arrayContaining(['array', 'cyrus', 'lapis', 'debug']));
    expect(words[6]).toEqual(expect.arrayContaining(['palace', 'satrap', 'return']));
    expect(words[5].filter((word) => word === 'array')).toHaveLength(1);
    expect(Object.values(words).flat()).not.toContain('bad-word');
  });

  it('falls back when fetch fails', async () => {
    const fetcher = async () => {
      throw new Error('network failed');
    };
    const provider = new WordProvider(WORDS_BY_LENGTH, fetcher as typeof fetch);

    await expect(provider.load('/words.json')).resolves.toBe(WORDS_BY_LENGTH);
  });

  it('falls back when remote feed is malformed or too small', async () => {
    const fetcher = async () =>
      response({
        version: 1,
        words: ['array', 'return']
      });
    const provider = new WordProvider(WORDS_BY_LENGTH, fetcher as typeof fetch);

    await expect(provider.load('/words.json')).resolves.toBe(WORDS_BY_LENGTH);
  });

  it('falls back when remote response is not ok', async () => {
    const fetcher = async () => response({}, false);
    const provider = new WordProvider(WORDS_BY_LENGTH, fetcher as typeof fetch);

    await expect(provider.load('/words.json')).resolves.toBe(WORDS_BY_LENGTH);
  });
});
