import { DBSQLClient } from '@databricks/sql';

const CATALOG = 'eng_data_platform.ani';

const TABLE_QUERIES = {
  teams: `SELECT team_id, team_name, team_lead_email, tech_lead_email, slack_channel_name, team_email, description
    FROM ${CATALOG}.miq_teams WHERE is_active = true ORDER BY team_name`,
  members: `SELECT team_id, member_email, role, joined_at
    FROM ${CATALOG}.miq_team_members WHERE is_active = true ORDER BY team_id, role, member_email`,
  assets: `SELECT team_id, table_catalog, table_schema, table_name, full_table_name, table_type, table_owner,
      total_columns, c_score, o_score, d_score, a_score, l_score, final_codal_score, codal_band,
      hard_fail_reason, recommendations, scored_at
    FROM ${CATALOG}.accountability_codal_asset_scores
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  schemaSummaries: `SELECT * FROM ${CATALOG}.accountability_codal_schema_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  codeFindings: `SELECT team_id, workspace_name, notebook_path, notebook_id, notebook_link, owner, secret_type,
      severity, line_number, referring_line, scan_time, days_since_scan, sla_breached, scored_at
    FROM ${CATALOG}.accountability_code_findings
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  codeSummaries: `SELECT * FROM ${CATALOG}.accountability_code_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  codeWorkspaceSummaries: `SELECT * FROM ${CATALOG}.accountability_code_workspace_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  computeFindings: `SELECT team_id, finding_type, resource_type, workspace_id, resource_id, resource_name, severity,
      metric_value, cost_impact_usd, recommendation, attribution_method, scored_at
    FROM ${CATALOG}.accountability_compute_findings
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  computeSummaries: `SELECT * FROM ${CATALOG}.accountability_compute_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  dataSummaries: `SELECT * FROM ${CATALOG}.accountability_data_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  teamSchemas: `SELECT * FROM ${CATALOG}.accountability_team_schemas WHERE is_active = true`,
};

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = value => Math.max(0, Math.min(100, Math.round(number(value))));

function stableId(prefix, value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

function severityPoints(severity) {
  switch (String(severity).toLowerCase()) {
    case 'critical':
      return 40;
    case 'high':
      return 30;
    case 'medium':
      return 15;
    default:
      return 5;
  }
}

function resultFor(severity) {
  return ['critical', 'high'].includes(String(severity).toLowerCase()) ? 'Fail' : 'Warn';
}

function computeDimension(type) {
  const value = String(type).toLowerCase();
  if (/fail|reliab|chronic|success|run/.test(value)) return 'R';
  if (/right.?siz|idle|utili|oversiz/.test(value)) return 'E';
  if (/spend|cost|budget|tag|polic/.test(value)) return 'G';
  return 'P';
}

function recommendationDimension(text) {
  const value = String(text).toLowerCase();
  if (/name|tag|convention/.test(value)) return 'C';
  if (/comment|description|document/.test(value)) return 'O';
  if (/partition|optimi|delta|model|type/.test(value)) return 'D';
  if (/access|grant|pii|mask|permission/.test(value)) return 'A';
  return 'L';
}

function latest(rows) {
  return rows.reduce((best, row) => {
    const stamp = Date.parse(row.scored_at ?? row.latest_scan_time ?? 0);
    return stamp > best ? stamp : best;
  }, 0);
}

export function normalizeScorecard(raw) {
  const membersByTeam = new Map();
  for (const member of raw.members) {
    const members = membersByTeam.get(member.team_id) ?? [];
    members.push({ email: member.member_email, role: member.role, joinedAt: member.joined_at });
    membersByTeam.set(member.team_id, members);
  }

  const schemasByTeam = new Map();
  for (const schema of raw.teamSchemas) {
    const schemas = schemasByTeam.get(schema.team_id) ?? [];
    schemas.push(`${schema.catalog_name}.${schema.schema_name}`);
    schemasByTeam.set(schema.team_id, schemas);
  }

  const dataSummary = new Map(raw.dataSummaries.map(row => [row.team_id, row]));
  const computeSummary = new Map(raw.computeSummaries.map(row => [row.team_id, row]));
  const codeRowsByTeam = new Map();
  for (const row of raw.codeSummaries) {
    const rows = codeRowsByTeam.get(row.team_id) ?? [];
    rows.push(row);
    codeRowsByTeam.set(row.team_id, rows);
  }

  const teams = raw.teams.map(team => {
    const codeRows = codeRowsByTeam.get(team.team_id) ?? [];
    const codeScore = codeRows.length
      ? codeRows.reduce((sum, row) => sum + number(row.final_code_score, 100), 0) / codeRows.length
      : 100;
    const data = dataSummary.get(team.team_id);
    const compute = computeSummary.get(team.team_id);
    return {
      id: team.team_id,
      name: team.team_name,
      short: team.team_name,
      channel: team.slack_channel_name ? `#${String(team.slack_channel_name).replace(/^#/, '')}` : team.team_email ?? '',
      description: team.description ?? '',
      members: membersByTeam.get(team.team_id) ?? [],
      schemas: schemasByTeam.get(team.team_id) ?? [],
      scores: {
        Code: clamp(codeScore),
        Compute: clamp(compute?.final_compute_score ?? 100),
        Data: clamp(data?.final_data_score ?? 100),
      },
    };
  });

  const schemaSummary = new Map(
    raw.schemaSummaries.map(row => [`${row.team_id}:${row.table_catalog}.${row.table_schema}`, row]),
  );

  const dataItems = raw.assets.map(row => {
    const id = stableId('data', `${row.team_id}:${row.full_table_name}`);
    const recommendations = Array.isArray(row.recommendations) ? row.recommendations : [];
    const findings = recommendations.map((recommendation, index) => {
      const dim = recommendationDimension(recommendation);
      const points = Math.max(1, 100 - clamp(row[`${dim.toLowerCase()}_score`]));
      return {
        id: `${id}:${dim}${index}`,
        itemId: id,
        dim,
        check: recommendation,
        points,
        result: points >= 20 ? 'Fail' : 'Warn',
        evidence: row.hard_fail_reason || `${dim} score: ${clamp(row[`${dim.toLowerCase()}_score`])}/100`,
        recommendation,
      };
    });
    const schema = schemaSummary.get(`${row.team_id}:${row.table_catalog}.${row.table_schema}`);
    return {
      id,
      name: row.table_name,
      team: row.team_id,
      pillar: 'Data',
      type: row.table_type || 'UC table',
      path: row.full_table_name,
      owner: row.table_owner || 'Unassigned',
      dims: {
        C: clamp(row.c_score),
        O: clamp(row.o_score),
        D: clamp(row.d_score),
        A: clamp(row.a_score),
        L: clamp(row.l_score),
      },
      meta: [
        `${number(row.total_columns)} columns`,
        row.codal_band,
        schema ? `${number(schema.total_assets)} assets in schema` : null,
      ].filter(Boolean),
      liveFindings: findings,
    };
  });

  const workspaceSummary = new Map(
    raw.codeWorkspaceSummaries.map(row => [`${row.team_id}:${row.workspace_name}`, row]),
  );
  const codeGroups = new Map();
  for (const row of raw.codeFindings) {
    const key = `${row.team_id}:${row.workspace_name}:${row.notebook_path || row.notebook_id}`;
    const rows = codeGroups.get(key) ?? [];
    rows.push(row);
    codeGroups.set(key, rows);
  }
  const codeItems = [...codeGroups.entries()].map(([key, rows]) => {
    const first = rows[0];
    const id = stableId('code', key);
    const workspace = workspaceSummary.get(`${first.team_id}:${first.workspace_name}`);
    const baseline = clamp(workspace?.final_code_score ?? 100);
    const secretScore = clamp(100 - rows.reduce((sum, row) => sum + severityPoints(row.severity), 0));
    return {
      id,
      name: String(first.notebook_path || `Notebook ${first.notebook_id}`).split('/').filter(Boolean).pop(),
      team: first.team_id,
      pillar: 'Code',
      type: 'Notebook',
      path: first.notebook_path || first.notebook_link || String(first.notebook_id),
      owner: first.owner || 'Unassigned',
      dims: { S: secretScore, Q: baseline, H: baseline, V: baseline },
      meta: [
        first.workspace_name,
        `${rows.length} secret finding${rows.length === 1 ? '' : 's'}`,
        rows.some(row => row.sla_breached) ? 'SLA breached' : 'Within SLA',
      ],
      liveFindings: rows.map((row, index) => ({
        id: `${id}:S${index}`,
        itemId: id,
        dim: 'S',
        check: `${row.secret_type || 'Potential'} secret`,
        points: severityPoints(row.severity),
        result: resultFor(row.severity),
        evidence: `${row.workspace_name}${row.line_number ? ` · line ${row.line_number}` : ''}${row.referring_line ? ` · ${row.referring_line}` : ''}`,
        recommendation: 'Move the value to a Databricks secret scope and rotate the exposed credential.',
      })),
    };
  });

  const computeGroups = new Map();
  for (const row of raw.computeFindings) {
    const key = `${row.team_id}:${row.workspace_id}:${row.resource_type}:${row.resource_id || row.resource_name}`;
    const rows = computeGroups.get(key) ?? [];
    rows.push(row);
    computeGroups.set(key, rows);
  }
  const computeItems = [...computeGroups.entries()].map(([key, rows]) => {
    const first = rows[0];
    const id = stableId('compute', key);
    const baseline = clamp(computeSummary.get(first.team_id)?.final_compute_score ?? 100);
    const dims = { R: baseline, E: baseline, G: baseline, P: baseline };
    for (const row of rows) {
      const dim = computeDimension(row.finding_type);
      dims[dim] = clamp(dims[dim] - severityPoints(row.severity));
    }
    return {
      id,
      name: first.resource_name || first.resource_id || 'Unnamed resource',
      team: first.team_id,
      pillar: 'Compute',
      type: first.resource_type || 'Compute resource',
      path: [first.workspace_id, first.resource_id].filter(Boolean).join(' · '),
      owner: 'Team owned',
      dims,
      meta: [
        `${rows.length} finding${rows.length === 1 ? '' : 's'}`,
        `$${rows.reduce((sum, row) => sum + number(row.cost_impact_usd), 0).toLocaleString()} cost impact`,
        first.attribution_method,
      ].filter(Boolean),
      liveFindings: rows.map((row, index) => {
        const dim = computeDimension(row.finding_type);
        return {
          id: `${id}:${dim}${index}`,
          itemId: id,
          dim,
          check: String(row.finding_type).replaceAll('_', ' '),
          points: severityPoints(row.severity),
          result: resultFor(row.severity),
          evidence: [
            row.metric_value == null ? null : `Metric: ${number(row.metric_value).toLocaleString()}`,
            row.cost_impact_usd == null ? null : `Cost impact: $${number(row.cost_impact_usd).toLocaleString()}`,
          ].filter(Boolean).join(' · ') || 'Finding detected in Databricks system data',
          recommendation: row.recommendation || 'Review and remediate this compute finding.',
        };
      }),
    };
  });

  const allRows = Object.values(raw).flat();
  return {
    teams,
    items: [...dataItems, ...computeItems, ...codeItems],
    refreshedAt: latest(allRows) || Date.now(),
    sources: Object.fromEntries(Object.entries(raw).map(([name, rows]) => [name, rows.length])),
  };
}

function connectionOptions(env) {
  const host = String(env.DATABRICKS_SERVER_HOSTNAME || env.DATABRICKS_HOST || '').replace(/^https?:\/\//, '');
  const warehouseId = env.DATABRICKS_WAREHOUSE_ID || '8d04a00a80f4c77e';
  if (!host) throw new Error('DATABRICKS_HOST or DATABRICKS_SERVER_HOSTNAME is required');
  const options = {
    host,
    path: env.DATABRICKS_HTTP_PATH || `/sql/1.0/warehouses/${warehouseId}`,
    telemetryEnabled: false,
  };
  if (env.DATABRICKS_TOKEN) return { ...options, token: env.DATABRICKS_TOKEN };
  return {
    ...options,
    authType: 'databricks-oauth',
    oauthClientId: env.DATABRICKS_CLIENT_ID,
    oauthClientSecret: env.DATABRICKS_CLIENT_SECRET,
  };
}

export async function loadScorecard(env = process.env) {
  const client = new DBSQLClient();
  let session;
  try {
    await client.connect(connectionOptions(env));
    session = await client.openSession();
    const raw = {};
    for (const [name, sql] of Object.entries(TABLE_QUERIES)) {
      const operation = await session.executeStatement(sql, { runAsync: true });
      try {
        raw[name] = await operation.fetchAll();
      } finally {
        await operation.close();
      }
    }
    return normalizeScorecard(raw);
  } finally {
    if (session) await session.close();
    await client.close();
  }
}
