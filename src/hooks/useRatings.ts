import { useState, useCallback } from 'react';
import { LookupCandidate, LookupResult, MovieRatings } from '../types';
import { apiLookup, apiResolve } from '../services/ratingsApi';
import { getCachedRating, setCachedRating } from '../store/ratingsCache';
import { normalizeTitleText } from '../utils/titleText';

interface State {
  data: MovieRatings | null;
  loading: boolean;
  error: string | null;
  candidates: LookupCandidate[];
}

const INITIAL: State = { data: null, loading: false, error: null, candidates: [] };

export function useRatings() {
  const [state, setState] = useState<State>(INITIAL);

  const lookup = useCallback(async (title: string): Promise<LookupResult> => {
    const query = normalizeTitleText(title);
    setState({ data: null, loading: true, error: null, candidates: [] });

    const cached = await getCachedRating(query);
    if (cached) {
      const hit: LookupResult = { data: cached, candidates: [], error: null };
      setState({ data: cached, loading: false, error: null, candidates: [] });
      return hit;
    }

    try {
      const response = await apiLookup(query);

      if (response.status === 'found') {
        await setCachedRating(query, response.data);
        const hit: LookupResult = { data: response.data, candidates: [], error: null };
        setState({ data: response.data, loading: false, error: null, candidates: [] });
        return hit;
      }

      if (response.status === 'ambiguous') {
        const hit: LookupResult = { data: null, candidates: response.candidates, error: null };
        setState({ data: null, loading: false, error: null, candidates: response.candidates });
        return hit;
      }

      const miss: LookupResult = {
        data: null,
        candidates: [],
        error: response.message,
      };
      setState({ data: null, loading: false, error: response.message, candidates: [] });
      return miss;
    } catch {
      const message = 'Could not reach the ratings server. Is it running?';
      const miss: LookupResult = { data: null, candidates: [], error: message };
      setState({ data: null, loading: false, error: message, candidates: [] });
      return miss;
    }
  }, []);

  const pickCandidate = useCallback(async (match: LookupCandidate): Promise<MovieRatings | null> => {
    setState(s => ({ ...s, loading: true, candidates: [] }));

    try {
      const response = await apiResolve(match);
      if (response.status === 'found') {
        await setCachedRating(match.title, response.data);
        setState({ data: response.data, loading: false, error: null, candidates: [] });
        return response.data;
      }

      const message =
        response.status === 'not_found'
          ? response.message
          : `Could not load ratings for "${match.title}".`;
      setState({ data: null, loading: false, error: message, candidates: [] });
      return null;
    } catch {
      const message = 'Could not reach the ratings server. Is it running?';
      setState({ data: null, loading: false, error: message, candidates: [] });
      return null;
    }
  }, []);

  const clear = useCallback(() => setState(INITIAL), []);

  return { ...state, lookup, pickCandidate, clear };
}
