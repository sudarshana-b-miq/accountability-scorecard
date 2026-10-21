import { DBSQLClient } from '@databricks/sql';

const CATALOG = 'eng_data_platform.ani';

const TABLE_QUERIES = {
  teams: `SELECT team_id, team_name, team_lead_email, tech_lead_email, slack_channel_name, team_email, description
    FROM ${CATALOG}.miq_teams WHERE is_active = true ORDER BY team_name`,
  members: `SELECT team_id, member_email, role, joined_at
    FROM ${CATALOG}.miq_team_members WHERE is_active = true ORDER BY team_id, role, member_email`,
  assets: `SELECT team_id, table_catalog, table_schema, table_name, full_table_name, table_type, data_source_format,
      table_owner, table_comment, total_columns, commented_columns, clean_named_columns,
      c_score, o_score, d_score, a_score, l_score, final_codal_score, raw_codal_score, codal_band,
      hard_fail_reason, recommendations, missing_table_comment, has_unmasked_pii, non_delta_format,
      pii_columns_count, masked_pii_columns, active_bytes, scored_at
    FROM ${CATALOG}.accountability_codal_asset_scores
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  schemaSummaries: `SELECT team_id, table_catalog, table_schema, total_assets, avg_convention, avg_ontology,
      avg_data_modelling, avg_access, avg_lineage, avg_codal_score, catalog_grade_count, governed_count,
      documented_count, published_count, missing_comments, scored_at
    FROM ${CATALOG}.accountability_codal_schema_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  codeFindings: `SELECT team_id, workspace_name, notebook_path, notebook_id, notebook_link, owner, secret_type,
      severity, line_number, referring_line, scan_time, days_since_scan, sla_breached, scored_at
    FROM ${CATALOG}.accountability_code_findings
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  codeSummaries: `SELECT team_id, workspace_name, total_findings, high_count, medium_count, low_count,
      notebooks_affected, owners_affected, raw_code_score, final_code_score, final_grade, hard_gate_applied,
      has_sla_breach, latest_scan_time, scored_at, compute_score, data_score, composite_score
    FROM ${CATALOG}.accountability_code_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  codeWorkspaceSummaries: `SELECT team_id, workspace_name, total_findings, high_count, medium_count, low_count,
      notebooks_affected, final_code_score, final_grade, hard_gate_applied, has_sla_breach, latest_scan_time, scored_at
    FROM ${CATALOG}.accountability_code_workspace_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  computeFindings: `SELECT team_id, finding_type, resource_type, workspace_id, resource_id, resource_name, severity,
      metric_value, cost_impact_usd, recommendation, attribution_method, scored_at
    FROM ${CATALOG}.accountability_compute_findings
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  computeSummaries: `SELECT team_id, status, max_points_available, p_reliability, p_right_sizing, p_spend_trend,
      p_autotermination, p_interactive_share, raw_compute_score, hard_gate_applied, final_compute_score, compute_grade,
      job_runs, failed_runs, success_rate_pct, failed_run_cost_usd, rs_jobs_evaluated, rs_jobs_suboptimal, rs_savings_usd,
      spend_current_usd, spend_previous_usd, spend_change_usd, spend_change_pct, spend_direction,
      interactive_spend_usd, interactive_share, chronic_open_jobs, chronic_past_sla, window_start, window_end, scored_at
    FROM ${CATALOG}.accountability_compute_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  dataSummaries: `SELECT team_id, total_assets, avg_convention, avg_ontology, avg_data_modelling, avg_access, avg_lineage,
      raw_data_score, catalog_grade_count, governed_count, documented_count, published_count,
      assets_missing_comment, assets_with_account_users, assets_non_delta, majority_below_documented,
      final_data_score, final_data_grade, scored_at
    FROM ${CATALOG}.accountability_data_summary
    WHERE team_id IS NOT NULL AND team_id <> '_UNATTRIBUTED'`,
  teamSchemas: `SELECT team_id, catalog_name, schema_name, is_active
    FROM ${CATALOG}.accountability_team_schemas WHERE is_active = true`,
};

const number = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = value => Math.max(0, Math.min(100, Math.round(number(value))));

const bool = value => value === true || value === 'true' || value === 1 || value === '1';

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
  if (/name|tag|convention|comment on column/.test(value)) return 'C';
  if (/comment|description|document|ontology/.test(value)) return 'O';
  if (/partition|optimi|delta|model|type/.test(value)) return 'D';
  if (/access|grant|pii|mask|permission/.test(value)) return 'A';
  return 'L';
}

function parseRecommendations(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }
  return [];
}

function formatBytes(value) {
  const bytes = number(value, NaN);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function latest(rows) {
  return rows.reduce((best, row) => {
    const stamp = Date.parse(row.scored_at ?? row.latest_scan_time ?? row.window_end ?? 0);
    return stamp > best ? stamp : best;
  }, 0);
}

function publishedLabel(timestamp) {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function aggregateCodeSummary(rows) {
  if (!rows.length) return null;
  return {
    totalFindings: rows.reduce((sum, row) => sum + number(row.total_findings), 0),
    highCount: rows.reduce((sum, row) => sum + number(row.high_count), 0),
    mediumCount: rows.reduce((sum, row) => sum + number(row.medium_count), 0),
    lowCount: rows.reduce((sum, row) => sum + number(row.low_count), 0),
    notebooksAffected: rows.reduce((sum, row) => sum + number(row.notebooks_affected), 0),
    finalCodeScore: clamp(rows.reduce((sum, row) => sum + number(row.final_code_score, 100), 0) / rows.length),
    hardGateApplied: rows.some(row => bool(row.hard_gate_applied)),
    hasSlaBreach: rows.some(row => number(row.has_sla_breach) > 0 || bool(row.has_sla_breach)),
  };
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

  const schemaSummariesByTeam = new Map();
  for (const row of raw.schemaSummaries) {
    const rows = schemaSummariesByTeam.get(row.team_id) ?? [];
    rows.push({
      catalog: row.table_catalog,
      schema: row.table_schema,
      path: `${row.table_catalog}.${row.table_schema}`,
      totalAssets: number(row.total_assets),
      avgCodalScore: number(row.avg_codal_score),
      missingComments: number(row.missing_comments),
    });
    schemaSummariesByTeam.set(row.team_id, rows);
  }

  const teams = raw.teams.map(team => {
    const codeAgg = aggregateCodeSummary(codeRowsByTeam.get(team.team_id) ?? []);
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
        Code: codeAgg?.finalCodeScore ?? 100,
        Compute: clamp(compute?.final_compute_score ?? 100),
        Data: clamp(data?.final_data_score ?? 100),
      },
      metrics: {
        data: data
          ? {
              totalAssets: number(data.total_assets),
              avgConvention: number(data.avg_convention),
              avgOntology: number(data.avg_ontology),
              avgDataModelling: number(data.avg_data_modelling),
              avgAccess: number(data.avg_access),
              avgLineage: number(data.avg_lineage),
              assetsMissingComment: number(data.assets_missing_comment),
              majorityBelowDocumented: bool(data.majority_below_documented),
              catalogGradeCount: number(data.catalog_grade_count),
              governedCount: number(data.governed_count),
              documentedCount: number(data.documented_count),
              publishedCount: number(data.published_count),
              finalGrade: data.final_data_grade ?? null,
            }
          : undefined,
        compute: compute
          ? {
              jobRuns: number(compute.job_runs),
              failedRuns: number(compute.failed_runs),
              successRatePct: number(compute.success_rate_pct),
              spendCurrentUsd: number(compute.spend_current_usd),
              spendPreviousUsd: number(compute.spend_previous_usd),
              spendChangeUsd: number(compute.spend_change_usd),
              spendChangePct: number(compute.spend_change_pct),
              spendDirection: compute.spend_direction ?? null,
              chronicOpenJobs: number(compute.chronic_open_jobs),
              chronicPastSla: number(compute.chronic_past_sla),
              hardGateApplied: bool(compute.hard_gate_applied),
              windowStart: compute.window_start ?? null,
              windowEnd: compute.window_end ?? null,
              reliabilityPts: number(compute.p_reliability),
              rightSizingPts: number(compute.p_right_sizing),
              spendTrendPts: number(compute.p_spend_trend),
              autoterminationPts: number(compute.p_autotermination),
              interactiveSharePts: number(compute.p_interactive_share),
              rsSavingsUsd: number(compute.rs_savings_usd),
            }
          : undefined,
        code: codeAgg ?? undefined,
        schemas: schemaSummariesByTeam.get(team.team_id) ?? [],
      },
    };
  });

  const schemaSummary = new Map(
    raw.schemaSummaries.map(row => [`${row.team_id}:${row.table_catalog}.${row.table_schema}`, row]),
  );

  const dataItems = raw.assets.map(row => {
    const id = stableId('data', `${row.team_id}:${row.full_table_name}`);
    const recommendations = parseRecommendations(row.recommendations);
    const findings = recommendations.map((recommendation, index) => {
      const dim = recommendationDimension(recommendation);
      const score = clamp(row[`${dim.toLowerCase()}_score`]);
      const points = Math.max(1, 100 - score);
      return {
        id: `${id}:${dim}${index}`,
        itemId: id,
        dim,
        check: recommendation,
        points,
        result: points >= 20 ? 'Fail' : 'Warn',
        evidence: row.hard_fail_reason || `${dim} score: ${score}/100`,
        recommendation,
        source: 'accountability_codal_asset_scores',
      };
    });
    const schema = schemaSummary.get(`${row.team_id}:${row.table_catalog}.${row.table_schema}`);
    const size = formatBytes(row.active_bytes);
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
        size,
        schema ? `${number(schema.total_assets)} assets in schema` : null,
        bool(row.missing_table_comment) ? 'Missing table comment' : null,
        bool(row.has_unmasked_pii) ? 'Unmasked PII' : null,
      ].filter(Boolean),
      liveFindings: findings,
      score: clamp(row.final_codal_score),
      band: row.codal_band ?? null,
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
        rows.some(row => bool(row.sla_breached)) ? 'SLA breached' : 'Within SLA',
      ],
      liveFindings: rows.map((row, index) => ({
        id: `${id}:S${index}`,
        itemId: id,
        dim: 'S',
        check: `${row.secret_type || 'Potential'} secret`,
        points: severityPoints(row.severity),
        result: resultFor(row.severity),
        evidence: [
          row.workspace_name,
          row.line_number != null ? `line ${row.line_number}` : null,
          row.referring_line,
          row.days_since_scan != null ? `${number(row.days_since_scan)}d since scan` : null,
        ].filter(Boolean).join(' · '),
        recommendation: `Move the ${row.secret_type || 'secret'} into a Databricks secret scope and rotate the exposed credential.`,
        source: 'accountability_code_findings',
      })),
      score: secretScore,
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
            row.attribution_method ? `Attribution: ${row.attribution_method}` : null,
          ].filter(Boolean).join(' · ') || 'Finding from accountability_compute_findings',
          recommendation: row.recommendation || 'Review and remediate this compute finding.',
          source: 'accountability_compute_findings',
        };
      }),
      score: clamp(Object.values(dims).reduce((a, b) => a + b, 0) / 4),
    };
  });

  const allRows = Object.values(raw).flat();
  const refreshedAt = latest(allRows) || Date.now();
  const windowEnds = raw.computeSummaries.map(row => row.window_end).filter(Boolean);
  return {
    teams,
    items: [...dataItems, ...computeItems, ...codeItems],
    refreshedAt,
    published: publishedLabel(refreshedAt),
    period: {
      start: raw.computeSummaries.map(row => row.window_start).filter(Boolean).sort()[0] ?? null,
      end: windowEnds.sort().slice(-1)[0] ?? null,
    },
    sources: Object.fromEntries(Object.entries(raw).map(([name, rows]) => [name, rows.length])),
  };
}

function connectionOptions(env, accessToken) {
  const host = String(env.DATABRICKS_SERVER_HOSTNAME || env.DATABRICKS_HOST || '').replace(/^https?:\/\//, '');
  const warehouseId = env.DATABRICKS_WAREHOUSE_ID || '8d04a00a80f4c77e';
  if (!host) throw new Error('DATABRICKS_HOST or DATABRICKS_SERVER_HOSTNAME is required');
  const options = {
    host,
    path: env.DATABRICKS_HTTP_PATH || `/sql/1.0/warehouses/${warehouseId}`,
    telemetryEnabled: false,
  };
  const token = accessToken || env.DATABRICKS_TOKEN;
  if (token) return { ...options, authType: 'access-token', token };
  return {
    ...options,
    authType: 'databricks-oauth',
    oauthClientId: env.DATABRICKS_CLIENT_ID,
    oauthClientSecret: env.DATABRICKS_CLIENT_SECRET,
  };
}

export async function withSqlSession(env, fn, accessToken) {
  const client = new DBSQLClient();
  let session;
  try {
    await client.connect(connectionOptions(env, accessToken));
    session = await client.openSession();
    const query = async sql => {
      const operation = await session.executeStatement(sql, { runAsync: true });
      try {
        return await operation.fetchAll();
      } finally {
        await operation.close();
      }
    };
    return await fn(query);
  } finally {
    if (session) await session.close();
    await client.close();
  }
}

export async function loadScorecard(env = process.env, accessToken) {
  return withSqlSession(env, async query => {
    const raw = {};
    for (const [name, sql] of Object.entries(TABLE_QUERIES)) {
      raw[name] = await query(sql);
    }
    return normalizeScorecard(raw);
  }, accessToken);
}
