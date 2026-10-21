import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { loadScorecard } from './databricks-data.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');

function scorecardErrorMessage(error, hasUserToken) {
  const status = error?.statusCode ?? error?.response?.status;
  const message = error instanceof Error ? error.message : 'Databricks data is temporarily unavailable';
  if (status === 403 || /\b403\b/.test(message)) {
    return hasUserToken
      ? 'Databricks refused the scorecard query for the signed-in user (403).'
      : 'Databricks refused the scorecard query (403). The app identity cannot use the SQL warehouse.';
  }
  return message;
}

export function createApp(staticDirectory = dist, scorecardLoader = loadScorecard) {
  const app = express();

  app.disable('x-powered-by');
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get('/api/scorecard', async (request, response) => {
    const accessToken = request.get('x-forwarded-access-token');
    try {
      response.set('Cache-Control', 'private, no-store');
      console.log(`Loading scorecard with ${accessToken ? 'signed-in user' : 'service principal'} credentials`);
      response.json(await scorecardLoader(process.env, accessToken));
    } catch (error) {
      console.error('Unable to load scorecard data', error);
      // The apps proxy replaces non-2xx bodies with an HTML page the UI cannot parse.
      response.json({
        error: scorecardErrorMessage(error, Boolean(accessToken)),
        teams: [],
        items: [],
      });
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
