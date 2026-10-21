import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { loadScorecard } from './databricks-data.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');

export function createApp(staticDirectory = dist, scorecardLoader = loadScorecard) {
  const app = express();

  app.disable('x-powered-by');
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get('/api/scorecard', async (_request, response) => {
    try {
      response.set('Cache-Control', 'private, max-age=60');
      response.json(await scorecardLoader());
    } catch (error) {
      console.error('Unable to load scorecard data', error);
      response.status(503).json({ error: 'Databricks data is temporarily unavailable' });
    }
  });

  app.use(express.static(staticDirectory));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(staticDirectory, 'index.html'));
  });

  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.DATABRICKS_APP_PORT ?? process.env.PORT ?? 8000);
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`Accountability Scorecard listening on port ${port}`);
  });
}
