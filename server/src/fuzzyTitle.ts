import { LookupCandidate } from './types.js';

const ARTICLES = new Set(['a', 'an', 'the']);

/** Lowercase, strip punctuation, collapse spaces — for distance compare only. */
export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function titleDistance(query: string, candidateTitle: string): number {
  return levenshtein(normalizeForCompare(query), normalizeForCompare(candidateTitle));
}

/** Primary query plus looser retries when exact OCR text misses. */
export function buildSearchQueries(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  const push = (q: string) => {
    const key = q.toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(q.trim());
  };

  push(trimmed);

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2 && ARTICLES.has(tokens[0].toLowerCase())) {
    push(tokens.slice(1).join(' '));
  }

  if (tokens.length >= 2) {
    for (let i = 0; i < tokens.length; i++) {
      push(tokens.filter((_, idx) => idx !== i).join(' '));
    }
  }

  return out;
}

export interface RankedCandidate {
  candidate: LookupCandidate;
  distance: number;
}

export function rankCandidates(
  query: string,
  candidates: LookupCandidate[]
): RankedCandidate[] {
  return candidates
    .map(candidate => ({
      candidate,
      distance: titleDistance(query, candidate.title),
    }))
    .sort((a, b) => a.distance - b.distance || a.candidate.title.localeCompare(b.candidate.title));
}

const AUTO_MAX_DISTANCE = 1;
const CLOSE_MAX_DISTANCE = 3;
const PICKER_LIMIT = 3;

export type FuzzyDecision =
  | { action: 'auto'; candidate: LookupCandidate; distance: number }
  | { action: 'ambiguous'; candidates: LookupCandidate[] }
  | { action: 'reject' };

export function decideFromRanked(ranked: RankedCandidate[]): FuzzyDecision {
  if (ranked.length === 0) return { action: 'reject' };

  const best = ranked[0];
  if (best.distance > CLOSE_MAX_DISTANCE) return { action: 'reject' };

  const tiedForBest = ranked.filter(r => r.distance === best.distance);
  if (best.distance <= AUTO_MAX_DISTANCE && tiedForBest.length === 1) {
    return { action: 'auto', candidate: best.candidate, distance: best.distance };
  }

  const close = ranked
    .filter(r => r.distance <= CLOSE_MAX_DISTANCE)
    .slice(0, PICKER_LIMIT)
    .map(r => r.candidate);

  return { action: 'ambiguous', candidates: close };
}
