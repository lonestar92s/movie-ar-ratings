import AsyncStorage from '@react-native-async-storage/async-storage';
import { MovieRatings } from '../types';

const KEY = 'scan_history';
const MAX_ITEMS = 20;

export interface HistoryEntry {
  ratings: MovieRatings;
  scannedAt: number;
}

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToHistory(ratings: MovieRatings): Promise<void> {
  try {
    const history = await getHistory();
    const filtered = history.filter(e => e.ratings.title !== ratings.title);
    const updated = [{ ratings, scannedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
