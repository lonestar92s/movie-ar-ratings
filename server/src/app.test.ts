import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { clearCache } from './cache.js';
import { createApp } from './app.js';

vi.mock('./omdb.js', () => ({
  fetchRatingsByTitle: vi.fn(),
  fetchRatingsById: vi.fn(),
}));

vi.mock('./tmdb.js', () => ({
  searchTmdb: vi.fn(),
}));

import { fetchRatingsByTitle } from './omdb.js';
import { MovieRatings } from './types.js';

const sample: MovieRatings = {
  title: 'Dune',
  year: '2021',
  type: 'movie',
  imdbRating: '8.0',
  ratings: [],
};

describe('HTTP API', () => {
  const app = createApp();

  beforeEach(() => {
    clearCache();
    vi.mocked(fetchRatingsByTitle).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('POST /api/v1/lookup returns found', async () => {
    vi.mocked(fetchRatingsByTitle).mockResolvedValue(sample);

    const res = await request(app)
      .post('/api/v1/lookup')
      .send({ query: 'Dune' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'found', data: sample });
  });

  it('POST /api/v1/lookup validates empty query', async () => {
    const res = await request(app).post('/api/v1/lookup').send({ query: '  ' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('not_found');
  });

  it('POST /api/v1/resolve requires imdbId', async () => {
    const res = await request(app).post('/api/v1/resolve').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('imdbId');
  });
});
