import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizeScorecard } from './databricks-data.js';
import { createApp } from './server.js';

async function withServer(run, loader) {
  const staticDirectory = await mkdtemp(path.join(tmpdir(), 'scorecard-'));
  await writeFile(path.join(staticDirectory, 'index.html'), '<main>Scorecard</main>');
  const server = createApp(staticDirectory, loader).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();

  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  }
}

test('reports app health', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

test('normalizes live team, member, and asset data', () => {
  const data = normalizeScorecard({
    teams: [{ team_id: 'T-1', team_name: 'Analytics', slack_channel_name: 'analytics' }],
    members: [{ team_id: 'T-1', member_email: 'owner@example.com', role: 'lead' }],
    assets: [{
      team_id: 'T-1',
      table_catalog: 'catalog',
      table_schema: 'schema',
      table_name: 'orders',
      full_table_name: 'catalog.schema.orders',
      table_type: 'MANAGED',
      table_owner: 'owner@example.com',
      total_columns: 12,
      c_score: 90,
      o_score: 80,
      d_score: 70,
      a_score: 60,
      l_score: 50,
      codal_band: 'Governed',
      recommendations: ['Add a table description'],
      scored_at: '2026-10-21T00:00:00Z',
    }],
    schemaSummaries: [{ team_id: 'T-1', table_catalog: 'catalog', table_schema: 'schema', total_assets: 1 }],
    codeFindings: [],
    codeSummaries: [],
    codeWorkspaceSummaries: [],
    computeFindings: [],
    computeSummaries: [{ team_id: 'T-1', final_compute_score: 74 }],
    dataSummaries: [{ team_id: 'T-1', final_data_score: 69 }],
    teamSchemas: [{ team_id: 'T-1', catalog_name: 'catalog', schema_name: 'schema' }],
  });

  assert.equal(data.teams[0].members.length, 1);
  assert.deepEqual(data.teams[0].scores, { Code: 100, Compute: 74, Data: 69 });
  assert.equal(data.items[0].path, 'catalog.schema.orders');
  assert.equal(data.items[0].liveFindings[0].dim, 'O');
  assert.deepEqual(data.sources, {
    teams: 1,
    members: 1,
    assets: 1,
    schemaSummaries: 1,
    codeFindings: 0,
    codeSummaries: 0,
    codeWorkspaceSummaries: 0,
    computeFindings: 0,
    computeSummaries: 1,
    dataSummaries: 1,
    teamSchemas: 1,
  });
});

test('returns the Databricks-backed scorecard', async () => {
  const payload = {
    teams: [{ id: 'T-0001', name: 'ANI' }],
    items: [{ id: 'data_1', team: 'T-0001', pillar: 'Data' }],
    refreshedAt: 1,
  };
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/scorecard`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), payload);
  }, async () => payload);
});

test('reports a temporary failure when Databricks is unavailable', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/scorecard`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      error: 'warehouse unavailable',
      teams: [],
      items: [],
    });
  }, async () => {
    throw new Error('warehouse unavailable');
  });
});

test('queries with the forwarded user token', async () => {
  let seenToken;
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/api/scorecard`, {
      headers: { 'x-forwarded-access-token': 'user-token' },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).teams[0].id, 'T-0001');
  }, async (_env, token) => {
    seenToken = token;
    return { teams: [{ id: 'T-0001' }], items: [] };
  });
  assert.equal(seenToken, 'user-token');
});

test('serves the SPA entry point for client routes', async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/recommendations`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Scorecard/);
  });
});
