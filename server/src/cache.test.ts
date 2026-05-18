import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache, getCachedRating, setCachedRating } from './cache.js';
import { MovieRatings } from './types.js';

const sample: MovieRatings = {
  title: 'Test Movie',
  year: '2022',
  type: 'movie',
  imdbRating: '8.0',
  ratings: [],
};

describe('cache', () => {
  beforeEach(() => {
    clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves by normalized key', () => {
    setCachedRating('  Test   Movie  ', sample);
    expect(getCachedRating('test movie')).toEqual(sample);
  });

  it('returns null for missing entries', () => {
    expect(getCachedRating('unknown')).toBeNull();
  });

  it('expires entries after TTL', () => {
    setCachedRating('Test Movie', sample);
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);
    expect(getCachedRating('Test Movie')).toBeNull();
  });
});
