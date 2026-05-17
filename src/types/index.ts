export interface DetectedTitle {
  text: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

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

export interface CachedRating {
  data: MovieRatings;
  cachedAt: number;
}
