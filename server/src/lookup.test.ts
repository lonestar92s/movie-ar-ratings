import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearCache } from './cache.js';
import { lookupByTitle, resolveByImdbId } from './lookup.js';
import { MovieRatings } from './types.js';

vi.mock('./omdb.js', () => ({
  fetchRatingsByTitle: vi.fn(),
  fetchRatingsById: vi.fn(),
}));

vi.mock('./tmdb.js', () => ({
  searchTmdb: vi.fn(),
}));

import { fetchRatingsById, fetchRatingsByTitle } from './omdb.js';
import { searchTmdb } from './tmdb.js';

const sample: MovieRatings = {
  title: 'Mrs. Harris Goes to Paris',
  year: '2022',
  type: 'movie',
  imdbRating: '7.1',
  rottenTomatoes: '94%',
  ratings: [],
};

describe('lookupByTitle', () => {
  beforeEach(() => {
    clearCache();
    vi.mocked(fetchRatingsByTitle).mockReset();
    vi.mocked(fetchRatingsById).mockReset();
    vi.mocked(searchTmdb).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns not_found for empty query', async () => {
    const result = await lookupByTitle('   ');
    expect(result).toEqual({ status: 'not_found', message: 'Empty search query.' });
  });

  it('returns cached result without calling APIs', async () => {
    clearCache();
    const { setCachedRating } = await import('./cache.js');
    setCachedRating('Dune', sample);

    const result = await lookupByTitle('Dune');
    expect(result).toEqual({ status: 'found', data: sample });
    expect(fetchRatingsByTitle).not.toHaveBeenCalled();
    expect(searchTmdb).not.toHaveBeenCalled();
  });

  it('uses OMDB exact match on cache miss', async () => {
    vi.mocked(fetchRatingsByTitle).mockResolvedValue(sample);

    const result = await lookupByTitle('Mrs Harris Goes to Paris');
    expect(result).toEqual({ status: 'found', data: sample });
    expect(fetchRatingsByTitle).toHaveBeenCalledWith('Mrs Harris Goes to Paris');
    expect(searchTmdb).not.toHaveBeenCalled();
  });

  it('auto-resolves single TMDB candidate', async () => {
    vi.mocked(fetchRatingsByTitle).mockResolvedValue(null);
    vi.mocked(searchTmdb).mockResolvedValue([
      { imdbId: 'tt6166392', title: 'Mrs. Harris Goes to Paris', year: '2022', type: 'movie' },
    ]);
    vi.mocked(fetchRatingsById).mockResolvedValue(sample);

    const result = await lookupByTitle('Mrs Harris COES to Paris');
    expect(result).toEqual({ status: 'found', data: sample });
    expect(fetchRatingsById).toHaveBeenCalledWith('tt6166392');
  });

  it('returns ambiguous when TMDB has multiple matches', async () => {
    const candidates = [
      { imdbId: 'tt1', title: 'Dune', year: '1984', type: 'movie' as const },
      { imdbId: 'tt2', title: 'Dune', year: '2021', type: 'movie' as const },
    ];
    vi.mocked(fetchRatingsByTitle).mockResolvedValue(null);
    vi.mocked(searchTmdb).mockResolvedValue(candidates);

    const result = await lookupByTitle('Dune');
    expect(result).toEqual({ status: 'ambiguous', candidates });
    expect(fetchRatingsById).not.toHaveBeenCalled();
  });

  it('returns not_found when OMDB and TMDB miss', async () => {
    vi.mocked(fetchRatingsByTitle).mockResolvedValue(null);
    vi.mocked(searchTmdb).mockResolvedValue([]);

    const result = await lookupByTitle('Unknown Title XYZ');
    expect(result.status).toBe('not_found');
    if (result.status === 'not_found') {
      expect(result.message).toContain('Unknown Title XYZ');
    }
  });
});

describe('resolveByImdbId', () => {
  beforeEach(() => {
    clearCache();
    vi.mocked(fetchRatingsById).mockReset();
  });

  it('returns found and caches by key', async () => {
    vi.mocked(fetchRatingsById).mockResolvedValue(sample);

    const result = await resolveByImdbId(
      { imdbId: 'tt6166392', title: 'Mrs. Harris Goes to Paris', year: '2022', type: 'movie' },
      'mrs harris'
    );
    expect(result).toEqual({ status: 'found', data: sample });

    const { getCachedRating } = await import('./cache.js');
    expect(getCachedRating('mrs harris')).toEqual(sample);
  });

  it('returns not_found when OMDB by id fails', async () => {
    vi.mocked(fetchRatingsById).mockResolvedValue(null);

    const result = await resolveByImdbId({
      imdbId: 'tt0000000',
      title: 'Missing',
      year: '',
      type: 'movie',
    });
    expect(result.status).toBe('not_found');
  });
});
