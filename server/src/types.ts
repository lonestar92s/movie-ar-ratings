export interface RatingSource {
  source: 'IMDb' | 'Rotten Tomatoes' | 'Metacritic';
  value: string;
}

export interface MovieRatings {
  title: string;
  year: string;
  type: 'movie' | 'series' | 'episode';
  poster?: string;
  imdbRating: string;
  rottenTomatoes?: string;
  metacritic?: string;
  ratings: RatingSource[];
}

export interface LookupCandidate {
  imdbId: string;
  title: string;
  year: string;
  type: 'movie' | 'series';
}

export type LookupResponse =
  | { status: 'found'; data: MovieRatings }
  | { status: 'ambiguous'; candidates: LookupCandidate[] }
  | { status: 'not_found'; message: string };
