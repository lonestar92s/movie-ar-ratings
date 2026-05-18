import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { lookupByTitle, resolveByImdbId } from './lookup.js';
import { log } from './logger.js';
import { LookupCandidate } from './types.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      log('info', 'http_request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
      });
    });
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/v1/lookup', async (req, res) => {
    const query = typeof req.body?.query === 'string' ? req.body.query : '';
    log('info', 'lookup_request', { queryLength: query.length });

    try {
      const result = await lookupByTitle(query);
      log('info', 'lookup_response', { status: result.status });
      res.json(result);
    } catch (err) {
      log('error', 'lookup_failed', {
        message: err instanceof Error ? err.message : 'unknown',
      });
      res.status(500).json({
        status: 'not_found',
        message: 'Lookup failed. Please try again.',
      });
    }
  });

  app.post('/api/v1/resolve', async (req, res) => {
    const imdbId = typeof req.body?.imdbId === 'string' ? req.body.imdbId : '';
    const title = typeof req.body?.title === 'string' ? req.body.title : undefined;

    if (!imdbId) {
      res.status(400).json({ status: 'not_found', message: 'imdbId is required.' });
      return;
    }

    const candidate: LookupCandidate = {
      imdbId,
      title: title ?? imdbId,
      year: '',
      type: 'movie',
    };

    log('info', 'resolve_request', { imdbId, title: candidate.title });

    try {
      const result = await resolveByImdbId(candidate, title);
      log('info', 'resolve_response', { status: result.status });
      res.json(result);
    } catch (err) {
      log('error', 'resolve_failed', {
        imdbId,
        message: err instanceof Error ? err.message : 'unknown',
      });
      res.status(500).json({
        status: 'not_found',
        message: 'Resolve failed. Please try again.',
      });
    }
  });

  return app;
}
