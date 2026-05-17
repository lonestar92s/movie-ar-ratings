import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

export interface TmdbMatch {
  imdbId: string;
  title: string;
  year: string;
  type: 'movie' | 'series';
}

interface TmdbSearchResult {
  id: number;
  title?: string;       // movies
  name?: string;        // tv shows
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv' | 'person';
}

interface TmdbExternalIds {
  imdb_id: string | null;
}

async function getImdbId(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
  try {
    const { data } = await axios.get<TmdbExternalIds>(
      `${BASE_URL}/${mediaType}/${tmdbId}/external_ids`,
      { params: { api_key: API_KEY }, timeout: 5000 }
    );
    return data.imdb_id ?? null;
  } catch {
    return null;
  }
}

export async function searchTmdb(query: string): Promise<TmdbMatch[]> {
  try {
    const { data } = await axios.get<{ results: TmdbSearchResult[] }>(
      `${BASE_URL}/search/multi`,
      { params: { query, api_key: API_KEY, include_adult: false }, timeout: 5000 }
    );

    const candidates = data.results
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 3); // top 3 results

    const matches = await Promise.all(
      candidates.map(async (r): Promise<TmdbMatch | null> => {
        const mediaType = r.media_type === 'tv' ? 'tv' : 'movie';
        const imdbId = await getImdbId(r.id, mediaType);
        if (!imdbId) return null;

        const rawDate = r.release_date ?? r.first_air_date ?? '';
        return {
          imdbId,
          title: r.title ?? r.name ?? query,
          year: rawDate ? rawDate.split('-')[0] : '',
          type: mediaType === 'tv' ? 'series' : 'movie',
        };
      })
    );

    return matches.filter((m): m is TmdbMatch => m !== null);
  } catch {
    return [];
  }
}
