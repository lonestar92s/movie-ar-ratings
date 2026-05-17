import axios from 'axios';
import { MovieRatings } from '../types';

const API_KEY = process.env.EXPO_PUBLIC_OMDB_API_KEY;
const BASE_URL = 'https://www.omdbapi.com';

interface OmdbRating {
  Source: string;
  Value: string;
}

interface OmdbResponse {
  Response: 'True' | 'False';
  Title: string;
  Year: string;
  Type: string;
  Poster: string;
  imdbRating: string;
  Ratings: OmdbRating[];
}

export async function fetchRatings(title: string): Promise<MovieRatings | null> {
  try {
    const { data } = await axios.get<OmdbResponse>(BASE_URL, {
      params: { t: title, apikey: API_KEY },
      timeout: 5000,
    });

    if (data.Response === 'False') return null;

    const rtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');
    const metaRating = data.Ratings?.find(r => r.Source === 'Metacritic');

    return {
      title: data.Title,
      year: data.Year,
      type: (data.Type as MovieRatings['type']) ?? 'movie',
      poster: data.Poster !== 'N/A' ? data.Poster : undefined,
      imdbRating: data.imdbRating,
      rottenTomatoes: rtRating?.Value,
      metacritic: metaRating?.Value,
      ratings: data.Ratings?.map(r => ({
        source: r.Source === 'Internet Movie Database'
          ? 'IMDb'
          : r.Source === 'Rotten Tomatoes'
          ? 'Rotten Tomatoes'
          : 'Metacritic',
        value: r.Value,
      })) ?? [],
    };
  } catch {
    return null;
  }
}
