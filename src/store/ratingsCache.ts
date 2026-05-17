import AsyncStorage from '@react-native-async-storage/async-storage';
import { CachedRating, MovieRatings } from '../types';

const TTL_MS = 24 * 60 * 60 * 1000; // 24h — RT/IMDb scores don't change intraday
const PREFIX = 'rc_';

// L1: in-memory for the session
const memCache = new Map<string, CachedRating>();

function key(title: string) {
  return title.toLowerCase().trim().replace(/\s+/g, '_');
}

export async function getCachedRating(title: string): Promise<MovieRatings | null> {
  const k = key(title);

  const mem = memCache.get(k);
  if (mem && Date.now() - mem.cachedAt < TTL_MS) return mem.data;

  try {
    const raw = await AsyncStorage.getItem(PREFIX + k);
    if (raw) {
      const entry: CachedRating = JSON.parse(raw);
      if (Date.now() - entry.cachedAt < TTL_MS) {
        memCache.set(k, entry);
        return entry.data;
      }
    }
  } catch {}

  return null;
}

export async function setCachedRating(title: string, data: MovieRatings): Promise<void> {
  const k = key(title);
  const entry: CachedRating = { data, cachedAt: Date.now() };
  memCache.set(k, entry);
  try {
    await AsyncStorage.setItem(PREFIX + k, JSON.stringify(entry));
  } catch {}
}
