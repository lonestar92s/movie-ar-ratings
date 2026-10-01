import { describe, expect, it } from 'vitest';
import {
  buildSearchQueries,
  decideFromRanked,
  levenshtein,
  normalizeForCompare,
  rankCandidates,
  titleDistance,
} from './fuzzyTitle.js';
import { LookupCandidate } from './types.js';

describe('normalizeForCompare', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeForCompare('The Mighty Ducks!')).toBe('the mighty ducks');
  });
});

describe('levenshtein / titleDistance', () => {
  it('treats one-character OCR miss as distance 1', () => {
    expect(titleDistance('The mighty dugks', 'The Mighty Ducks')).toBe(1);
  });

  it('is case and punctuation insensitive', () => {
    expect(titleDistance('mrs harris coes to paris', 'Mrs. Harris Goes to Paris')).toBe(1);
  });

  it('returns 0 for identical normalized strings', () => {
    expect(levenshtein('dune', 'dune')).toBe(0);
  });
});

describe('buildSearchQueries', () => {
  it('includes article-stripped and drop-one-token variants', () => {
    expect(buildSearchQueries('The mighty dugks')).toEqual([
      'The mighty dugks',
      'mighty dugks',
      'The dugks',
      'The mighty',
    ]);
  });
});

describe('decideFromRanked', () => {
  const ducks: LookupCandidate = {
    imdbId: 'tt0104431',
    title: 'The Mighty Ducks',
    year: '1992',
    type: 'movie',
  };
  const other: LookupCandidate = {
    imdbId: 'tt2',
    title: 'The Mighty',
    year: '2019',
    type: 'series',
  };

  it('auto-resolves a unique distance-1 match', () => {
    const ranked = rankCandidates('The mighty dugks', [ducks, other]);
    expect(decideFromRanked(ranked)).toEqual({
      action: 'auto',
      candidate: ducks,
      distance: 1,
    });
  });

  it('returns ambiguous when multiple titles tie at distance 0', () => {
    const a: LookupCandidate = { imdbId: 'tt1', title: 'Dune', year: '1984', type: 'movie' };
    const b: LookupCandidate = { imdbId: 'tt2', title: 'Dune', year: '2021', type: 'movie' };
    const ranked = rankCandidates('Dune', [a, b]);
    expect(decideFromRanked(ranked)).toEqual({
      action: 'ambiguous',
      candidates: [a, b],
    });
  });

  it('rejects when nothing is close', () => {
    const ranked = rankCandidates('Unknown Title XYZ', [
      { imdbId: 'tt9', title: 'Completely Different', year: '2000', type: 'movie' },
    ]);
    expect(decideFromRanked(ranked)).toEqual({ action: 'reject' });
  });
});
