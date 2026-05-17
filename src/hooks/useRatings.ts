import { useState, useCallback } from 'react';
import { MovieRatings } from '../types';
import { fetchRatings, fetchRatingsById } from '../services/omdb';
import { searchTmdb, TmdbMatch } from '../services/tmdb';
import { getCachedRating, setCachedRating } from '../store/ratingsCache';

interface State {
  data: MovieRatings | null;
  loading: boolean;
  error: string | null;
  // Populated when TMDB returns multiple candidates and we can't auto-pick
  candidates: TmdbMatch[];
}

const INITIAL: State = { data: null, loading: false, error: null, candidates: [] };

export function useRatings() {
  const [state, setState] = useState<State>(INITIAL);

  const lookup = useCallback(async (title: string): Promise<MovieRatings | null> => {
    setState({ data: null, loading: true, error: null, candidates: [] });

    // L1: cache
    const cached = await getCachedRating(title);
    if (cached) {
      setState({ data: cached, loading: false, error: null, candidates: [] });
      return cached;
    }

    // L2: OMDB exact match
    const exact = await fetchRatings(title);
    if (exact) {
      await setCachedRating(title, exact);
      setState({ data: exact, loading: false, error: null, candidates: [] });
      return exact;
    }

    // L3: TMDB fuzzy search → OMDB by IMDb ID
    const matches = await searchTmdb(title);

    if (matches.length === 0) {
      setState({ data: null, loading: false, error: `Nothing found for "${title}". Try scanning again or search manually.`, candidates: [] });
      return null;
    }

    // Auto-pick if there's only one match
    if (matches.length === 1) {
      return resolveTmdbMatch(matches[0], setState);
    }

    // Multiple candidates — surface them for the user to pick
    setState({ data: null, loading: false, error: null, candidates: matches });
    return null;
  }, []);

  const pickCandidate = useCallback(async (match: TmdbMatch): Promise<MovieRatings | null> => {
    setState(s => ({ ...s, loading: true, candidates: [] }));
    return resolveTmdbMatch(match, setState);
  }, []);

  const clear = useCallback(() => setState(INITIAL), []);

  return { ...state, lookup, pickCandidate, clear };
}

async function resolveTmdbMatch(
  match: TmdbMatch,
  setState: React.Dispatch<React.SetStateAction<State>>
): Promise<MovieRatings | null> {
  const result = await fetchRatingsById(match.imdbId);
  if (result) {
    await setCachedRating(match.title, result);
    setState({ data: result, loading: false, error: null, candidates: [] });
    return result;
  }
  setState({ data: null, loading: false, error: `Could not load ratings for "${match.title}".`, candidates: [] });
  return null;
}
