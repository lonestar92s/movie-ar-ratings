import { getCachedRating, setCachedRating } from './cache.js';
import {
  buildSearchQueries,
  decideFromRanked,
  rankCandidates,
  titleDistance,
} from './fuzzyTitle.js';
import { log } from './logger.js';
import { fetchRatingsById, fetchRatingsByTitle } from './omdb.js';
import { searchTmdb } from './tmdb.js';
import { normalizeTitleText } from './titleText.js';
import { LookupCandidate, LookupResponse } from './types.js';

async function gatherTmdbCandidates(query: string): Promise<LookupCandidate[]> {
  const queries = buildSearchQueries(query);
  const byImdbId = new Map<string, LookupCandidate>();

  for (const q of queries) {
    const results = await searchTmdb(q);
    for (const c of results) {
      if (!byImdbId.has(c.imdbId)) byImdbId.set(c.imdbId, c);
    }

    // If primary query already produced a near-exact unique hit, skip looser retries.
    if (q === queries[0] && byImdbId.size > 0) {
      const ranked = rankCandidates(query, [...byImdbId.values()]);
      const decision = decideFromRanked(ranked);
      if (decision.action === 'auto' && decision.distance <= 1) {
        break;
      }
    }
  }

  return [...byImdbId.values()];
}

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

  const matches = await gatherTmdbCandidates(query);
  if (matches.length === 0) {
    log('info', 'lookup_not_found', { reason: 'tmdb_empty', query });
    return {
      status: 'not_found',
      message: `Nothing found for "${query}". Try scanning again or search manually.`,
    };
  }

  const ranked = rankCandidates(query, matches);
  log('info', 'lookup_tmdb_candidates', {
    query,
    count: matches.length,
    bestDistance: ranked[0]?.distance,
    bestTitle: ranked[0]?.candidate.title,
  });

  const decision = decideFromRanked(ranked);

  if (decision.action === 'auto') {
    log('info', 'lookup_tmdb_auto_resolve', {
      query,
      imdbId: decision.candidate.imdbId,
      distance: decision.distance,
      title: decision.candidate.title,
    });
    return resolveByImdbId(decision.candidate, query);
  }

  if (decision.action === 'ambiguous') {
    log('info', 'lookup_ambiguous', {
      query,
      candidates: decision.candidates.map(m => ({
        imdbId: m.imdbId,
        title: m.title,
        distance: titleDistance(query, m.title),
      })),
    });
    return { status: 'ambiguous', candidates: decision.candidates };
  }

  log('info', 'lookup_not_found', {
    reason: 'no_close_match',
    query,
    bestDistance: ranked[0]?.distance,
  });
  return {
    status: 'not_found',
    message: `Nothing found for "${query}". Try scanning again or search manually.`,
  };
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
