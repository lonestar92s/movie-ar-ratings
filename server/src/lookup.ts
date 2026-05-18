import { clearCache, getCachedRating, setCachedRating } from './cache.js';
import { log } from './logger.js';
import { fetchRatingsById, fetchRatingsByTitle } from './omdb.js';
import { searchTmdb } from './tmdb.js';
import { normalizeTitleText } from './titleText.js';
import { LookupCandidate, LookupResponse } from './types.js';

export async function lookupByTitle(rawQuery: string): Promise<LookupResponse> {
  const query = normalizeTitleText(rawQuery);

  log('debug', 'lookup_start', { query });

  if (!query) {
    log('info', 'lookup_not_found', { reason: 'empty_query' });
    return { status: 'not_found', message: 'Empty search query.' };
  }

  const cached = getCachedRating(query);
  if (cached) {
    log('info', 'lookup_cache_hit', { query, title: cached.title });
    return { status: 'found', data: cached };
  }

  const exact = await fetchRatingsByTitle(query);
  if (exact) {
    setCachedRating(query, exact);
    log('info', 'lookup_omdb_exact', { query, title: exact.title });
    return { status: 'found', data: exact };
  }

  log('debug', 'lookup_omdb_miss', { query });

  const matches = await searchTmdb(query);
  if (matches.length === 0) {
    log('info', 'lookup_not_found', { reason: 'tmdb_empty', query });
    return {
      status: 'not_found',
      message: `Nothing found for "${query}". Try scanning again or search manually.`,
    };
  }

  log('info', 'lookup_tmdb_candidates', { query, count: matches.length });

  if (matches.length === 1) {
    log('info', 'lookup_tmdb_auto_resolve', { query, imdbId: matches[0].imdbId });
    return resolveByImdbId(matches[0], query);
  }

  log('info', 'lookup_ambiguous', {
    query,
    candidates: matches.map(m => ({ imdbId: m.imdbId, title: m.title })),
  });
  return { status: 'ambiguous', candidates: matches };
}

export async function resolveByImdbId(
  candidate: LookupCandidate,
  cacheKey?: string
): Promise<LookupResponse> {
  log('debug', 'resolve_start', { imdbId: candidate.imdbId, title: candidate.title });

  const result = await fetchRatingsById(candidate.imdbId);
  if (!result) {
    log('info', 'resolve_not_found', { imdbId: candidate.imdbId, title: candidate.title });
    return {
      status: 'not_found',
      message: `Could not load ratings for "${candidate.title}".`,
    };
  }

  const key = cacheKey ?? candidate.title;
  setCachedRating(key, result);
  log('info', 'resolve_ok', { imdbId: candidate.imdbId, title: result.title, cacheKey: key });
  return { status: 'found', data: result };
}
