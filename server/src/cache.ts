import { MovieRatings } from './types.js';

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { data: MovieRatings; cachedAt: number }>();

function cacheKey(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, '_');
}

export function getCachedRating(title: string): MovieRatings | null {
  const k = cacheKey(title);
  const entry = cache.get(k);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt >= TTL_MS) {
    cache.delete(k);
    return null;
  }
  return entry.data;
}

export function setCachedRating(title: string, data: MovieRatings): void {
  cache.set(cacheKey(title), { data, cachedAt: Date.now() });
}

/** Clears in-memory cache (for tests). */
export function clearCache(): void {
  cache.clear();
}
