import { useState, useCallback } from 'react';
import { MovieRatings } from '../types';
import { fetchRatings } from '../services/omdb';
import { getCachedRating, setCachedRating } from '../store/ratingsCache';

interface State {
  data: MovieRatings | null;
  loading: boolean;
  error: string | null;
}

const INITIAL: State = { data: null, loading: false, error: null };

export function useRatings() {
  const [state, setState] = useState<State>(INITIAL);

  const lookup = useCallback(async (title: string) => {
    setState({ data: null, loading: true, error: null });

    const cached = await getCachedRating(title);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      return;
    }

    const result = await fetchRatings(title);
    if (result) {
      await setCachedRating(title, result);
      setState({ data: result, loading: false, error: null });
    } else {
      setState({ data: null, loading: false, error: `No results found for "${title}"` });
    }
  }, []);

  const clear = useCallback(() => setState(INITIAL), []);

  return { ...state, lookup, clear };
}
