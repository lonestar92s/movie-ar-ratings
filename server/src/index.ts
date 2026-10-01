import 'dotenv/config';
import { createApp } from './app.js';
import { log } from './logger.js';

const PORT = Number(process.env.PORT) || 3001;

if (!process.env.OMDB_API_KEY) {
  log('warn', 'config_missing', { key: 'OMDB_API_KEY' });
}
if (!process.env.TMDB_API_KEY) {
  log('warn', 'config_missing', { key: 'TMDB_API_KEY' });
}

const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  log('info', 'server_started', { port: PORT, host: '0.0.0.0' });
});
