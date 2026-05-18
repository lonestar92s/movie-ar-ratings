import axios from 'axios';
import { LookupCandidate, LookupResponse } from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

function assertBaseUrl(): void {
  if (!BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not set.');
  }
}

export async function apiLookup(query: string): Promise<LookupResponse> {
  assertBaseUrl();
  const { data } = await axios.post<LookupResponse>(
    `${BASE_URL}/api/v1/lookup`,
    { query },
    { timeout: 15000 }
  );
  return data;
}

export async function apiResolve(candidate: LookupCandidate): Promise<LookupResponse> {
  assertBaseUrl();
  const { data } = await axios.post<LookupResponse>(
    `${BASE_URL}/api/v1/resolve`,
    { imdbId: candidate.imdbId, title: candidate.title },
    { timeout: 15000 }
  );
  return data;
}
