import type { Tone } from '../fiber';

export type Pillar = 'Code' | 'Compute' | 'Data';
export type Result = 'Fail' | 'Warn' | 'Pass';

export interface DimDef {
  key: string;
  name: string;
  weight: number;
  hint: string;
}

export interface Team {
  id: string;
  name: string;
  short: string;
  channel: string;
}

export interface Item {
  id: string;
  name: string;
  team: string;
  pillar: Pillar;
  type: string;
  path: string;
  owner: string;
  dims: Record<string, number>;
  meta?: string[];
}

export interface Finding {
  id: string;
  itemId: string;
  dim: string;
  check: string;
  points: number;
  result: Result;
  evidence: string;
  recommendation: string;
}

export const PILLAR_WEIGHTS: Record<Pillar, number> = { Code: 0.25, Compute: 0.25, Data: 0.5 };

export const DIMS: Record<Pillar, DimDef[]> = {
  Data: [
    { key: 'C', name: 'Convention & Consistency', weight: 0.2, hint: 'Naming, owner, tags' },
    { key: 'O', name: 'Ontology', weight: 0.25, hint: 'Descriptions ≥50 chars' },
    { key: 'D', name: 'Data Modelling & Optimisation', weight: 0.2, hint: 'Partitioning, OPTIMIZE' },
    { key: 'A', name: 'Access Management', weight: 0.2, hint: 'PII masks, grants' },
    { key: 'L', name: 'Lineage & Lifecycle', weight: 0.15, hint: 'Lineage, retention' },
  ],
  Compute: [
    { key: 'R', name: 'Reliability', weight: 0.35, hint: 'Failed runs, alerting' },
    { key: 'E', name: 'Efficiency', weight: 0.3, hint: 'Idle and oversized clusters' },
    { key: 'G', name: 'Cost governance', weight: 0.2, hint: 'Budgets, tags, policies' },
    { key: 'P', name: 'Platform hygiene', weight: 0.15, hint: 'Runtime, autoscaling' },
  ],
  Code: [
    { key: 'S', name: 'Secrets', weight: 0.4, hint: 'Hard-coded credentials' },
    { key: 'Q', name: 'Code quality', weight: 0.25, hint: 'Sonar gate, complexity' },
    { key: 'H', name: 'Repo hygiene', weight: 0.2, hint: 'Repos, reviews, owners' },
    { key: 'V', name: 'Vulnerabilities', weight: 0.15, hint: 'Dependency CVEs' },
  ],
};

const CHECKS: Record<string, { check: string; evidence: string; rec: string; source: string }[]> = {
  C: [
    { check: 'snake_case naming & deny-list', evidence: '3 columns are camelCase (clientId, campaignId, …)', rec: 'Rename columns in the next schema version', source: 'information_schema.columns' },
    { check: 'Tags applied (domain, tier, PII)', evidence: 'Missing domain and tier tags', rec: 'Add UC tags for domain and tier', source: 'information_schema.table_tags' },
  ],
  O: [
    { check: 'Table description present (≥50 chars)', evidence: 'No table comment', rec: 'Add a business description covering grain, source and consumers', source: 'information_schema.tables' },
    { check: 'Top-used columns described (≥50 chars)', evidence: 'Only 1 of the 20 most-queried columns is documented', rec: 'Describe the 20 most-queried columns first', source: 'system.query.history + information_schema.columns' },
  ],
  D: [
    { check: 'Partitioning fit (avg partition ≥1 GB)', evidence: 'Avg partition 210 MB across 4,812 partitions', rec: 'Move to liquid clustering on the main filter columns', source: 'system.storage + DESCRIBE DETAIL' },
    { check: 'OPTIMIZE on tables >1 TB', evidence: 'Last OPTIMIZE 94 days ago', rec: 'Enable predictive optimization', source: 'system.storage.predictive_optimization_operations_history' },
  ],
  A: [
    { check: 'PII columns masked', evidence: 'email_hash has no column mask', rec: 'Apply a UC column mask for non-PII groups', source: 'information_schema.column_masks' },
    { check: 'Grants via groups, not users', evidence: '2 grants made to individual users', rec: 'Replace user grants with group grants', source: 'information_schema.table_privileges' },
  ],
  L: [
    { check: 'Retention / lifecycle policy', evidence: 'No VACUUM or TTL policy configured', rec: 'Set retention and a VACUUM schedule', source: 'DESCRIBE HISTORY' },
    { check: 'Upstream lineage captured', evidence: '2 upstream paths read S3 directly', rec: 'Read through a UC external location so lineage is captured', source: 'system.access.table_lineage' },
  ],
  R: [
    { check: 'Jobs with >10 failed runs (30 days)', evidence: '14 failed runs in the last 30 days', rec: 'Fix the failing task and add retries with alerts', source: 'system.lakeflow.job_run_timeline' },
    { check: 'Failure alerting configured', evidence: 'No on-failure notification on the job', rec: 'Add an on-failure notification to the team channel', source: 'system.lakeflow.jobs' },
  ],
  E: [
    { check: 'Idle cluster time', evidence: 'Idle 61% of uptime', rec: 'Lower auto-termination to 20 minutes', source: 'system.compute.node_timeline' },
    { check: 'Oversized clusters', evidence: 'Average CPU 18% on 16 workers', rec: 'Right-size to 6 workers with autoscaling', source: 'system.compute.node_timeline' },
  ],
  G: [
    { check: 'Budget policy and cost tags', evidence: 'Missing cost-centre tag', rec: 'Attach the team budget policy', source: 'system.billing.usage' },
    { check: 'Cluster policy enforced', evidence: 'Unrestricted cluster creation', rec: 'Apply the team cluster policy', source: 'system.compute.clusters' },
  ],
  P: [
    { check: 'Supported runtime version', evidence: 'DBR 11.3 (end of support)', rec: 'Upgrade to DBR 15.4 LTS', source: 'system.compute.clusters' },
    { check: 'Autoscaling enabled', evidence: 'Fixed-size cluster', rec: 'Enable autoscaling', source: 'system.compute.clusters' },
  ],
  S: [
    { check: 'No hard-coded secrets', evidence: 'Token found in reporting/load.py line 42', rec: 'Move to a secret scope and rotate the token', source: 'notebook_secrets_scan' },
    { check: 'Secrets read from secret scopes', evidence: 'Secrets read via os.environ in 2 notebooks', rec: 'Use dbutils.secrets.get', source: 'notebook_secrets_scan' },
  ],
  Q: [
    { check: 'Sonar quality gate', evidence: '2 bugs and 12 code smells', rec: 'Fix the 2 bugs flagged by Sonar', source: 'SonarCloud' },
    { check: 'Notebook complexity', evidence: '3 notebooks over 800 lines', rec: 'Split large notebooks into modules', source: 'workspace export' },
  ],
  H: [
    { check: 'Code in Repos with reviews', evidence: '4 notebooks outside Repos', rec: 'Move notebooks into a reviewed Repo', source: 'system.access.audit' },
    { check: 'Owner and README', evidence: 'No README or CODEOWNERS', rec: 'Add a README and CODEOWNERS', source: 'Git provider' },
  ],
  V: [
    { check: 'Dependency CVEs', evidence: '1 high CVE in requests==2.25', rec: 'Upgrade requests to 2.32', source: 'Snyk' },
    { check: 'Pinned dependencies', evidence: 'Unpinned requirements.txt', rec: 'Pin dependency versions', source: 'Snyk' },
  ],
};

export function checkSource(dim: string, index: number) {
  return CHECKS[dim]?.[index]?.source ?? 'system tables';
}

export const TEAMS: Team[] = [
  { id: 'ani', name: 'ANI · Analytics & Insights', short: 'ANI', channel: '#ani-data-alerts' },
  { id: 'ingestion', name: 'Ingestion', short: 'Ingestion', channel: '#ingestion-alerts' },
  { id: 'core', name: 'Core Assets', short: 'Core Assets', channel: '#core-assets' },
];

export const MONTHS = [
  { id: '2026-09', label: 'Sep 2026', offset: 0, published: '01 Oct 2026' },
  { id: '2026-08', label: 'Aug 2026', offset: -4, published: '01 Sep 2026' },
  { id: '2026-07', label: 'Jul 2026', offset: -7, published: '01 Aug 2026' },
];

export const ITEMS: Item[] = [
  { id: 'client_reporting_data', name: 'client_reporting_data', team: 'ani', pillar: 'Data', type: 'UC table', path: 'insights_and_reporting.ssr_rearch_prod', owner: 'priya.s', dims: { C: 55, O: 12, D: 40, A: 65, L: 20 }, meta: ['6.75M reads · 20d', '154.7 TB scanned', '60 columns'] },
  { id: 'yahoo_campaigns', name: 'yahoo_campaigns', team: 'ani', pillar: 'Data', type: 'UC table', path: 'eng_data_platform.ani', owner: 'rahul.k', dims: { C: 60, O: 35, D: 70, A: 55, L: 30 }, meta: ['1.2M reads · 20d', '18.4 TB scanned', '42 columns'] },
  { id: 'denormalized_data', name: 'denormalized_data', team: 'ani', pillar: 'Data', type: 'UC table', path: 'eng_data_platform.ani_adhoc', owner: 'ankit.m', dims: { C: 45, O: 50, D: 60, A: 70, L: 55 }, meta: ['410k reads · 20d', '6.1 TB scanned', '88 columns'] },
  { id: 'databricks_usage_cost_daily', name: 'Databricks_Usage_Cost_Daily', team: 'ani', pillar: 'Data', type: 'UC table', path: 'eng_data_platform.ani', owner: 'meera.r', dims: { C: 90, O: 60, D: 85, A: 90, L: 75 }, meta: ['220k reads · 20d', '0.9 TB scanned', '24 columns'] },
  { id: 'ani_daily_ingest_job', name: 'ani_daily_ingest_job', team: 'ani', pillar: 'Compute', type: 'Job', path: 'Job 268086697832738', owner: 'ani-oncall', dims: { R: 30, E: 70, G: 80, P: 60 }, meta: ['31 runs · 30d', '14 failed', '$2.4k / month'] },
  { id: 'ani_shared_cluster', name: 'ani-shared-cluster', team: 'ani', pillar: 'Compute', type: 'Cluster', path: '0912-ani-shared', owner: 'platform-ani', dims: { R: 90, E: 35, G: 60, P: 70 }, meta: ['Idle 61% of uptime', '16 workers', '$5.1k / month'] },
  { id: 'ani_reporting', name: 'ani-reporting', team: 'ani', pillar: 'Code', type: 'Repo', path: '/Repos/ani/reporting', owner: 'sudarshana.b', dims: { S: 70, Q: 80, H: 85, V: 90 }, meta: ['38 notebooks', '1 secret finding', 'Within 7-day SLA'] },
  { id: 'notebook_1439551495495882', name: 'Notebook 1439551495495882', team: 'ani', pillar: 'Code', type: 'Notebook', path: '/Users/ani/attribution', owner: 'vikram.p', dims: { S: 100, Q: 85, H: 90, V: 95 }, meta: ['Python', '412 lines'] },

  { id: 'ingest_raw_events', name: 'ingest_raw_events', team: 'ingestion', pillar: 'Data', type: 'UC table', path: 'eng_ingest.raw', owner: 'arjun.n', dims: { C: 70, O: 45, D: 60, A: 80, L: 40 }, meta: ['3.1M reads · 20d', '61 TB scanned'] },
  { id: 'ingest_partner_feeds', name: 'ingest_partner_feeds', team: 'ingestion', pillar: 'Data', type: 'UC table', path: 'eng_ingest.partner', owner: 'neha.j', dims: { C: 80, O: 70, D: 75, A: 85, L: 70 }, meta: ['740k reads · 20d'] },
  { id: 'ingestion_hourly_job', name: 'ingestion_hourly_job', team: 'ingestion', pillar: 'Compute', type: 'Job', path: 'Job 551203998812', owner: 'arjun.n', dims: { R: 85, E: 60, G: 70, P: 80 }, meta: ['720 runs · 30d', '6 failed'] },
  { id: 'ingestion_autoscale_pool', name: 'ingestion-autoscale-pool', team: 'ingestion', pillar: 'Compute', type: 'Instance pool', path: 'pool-ingest-01', owner: 'platform-ingest', dims: { R: 95, E: 80, G: 75, P: 85 } },
  { id: 'ingestion_pipelines', name: 'ingestion-pipelines', team: 'ingestion', pillar: 'Code', type: 'Repo', path: '/Repos/ingestion/pipelines', owner: 'neha.j', dims: { S: 100, Q: 70, H: 75, V: 80 } },

  { id: 'core_audience_dim', name: 'core_audience_dim', team: 'core', pillar: 'Data', type: 'UC table', path: 'core_assets.audience', owner: 'li.wei', dims: { C: 65, O: 80, D: 85, A: 90, L: 80 }, meta: ['2.2M reads · 20d'] },
  { id: 'core_geo_lookup', name: 'core_geo_lookup', team: 'core', pillar: 'Data', type: 'UC table', path: 'core_assets.reference', owner: 'li.wei', dims: { C: 90, O: 90, D: 80, A: 95, L: 85 } },
  { id: 'core_nightly_build', name: 'core_nightly_build', team: 'core', pillar: 'Compute', type: 'Job', path: 'Job 88120394', owner: 'core-oncall', dims: { R: 70, E: 75, G: 85, P: 90 } },
  { id: 'core_models', name: 'core-models', team: 'core', pillar: 'Code', type: 'Repo', path: '/Repos/core/models', owner: 'tom.h', dims: { S: 35, Q: 80, H: 85, V: 70 }, meta: ['Secret open 12 days', 'Beyond 7-day SLA'] },
];

const findingCache = new Map<string, Finding[]>();

export function findingsFor(item: Item): Finding[] {
  const cached = findingCache.get(item.id);
  if (cached) return cached;
  const out: Finding[] = [];
  for (const d of DIMS[item.pillar]) {
    const deficit = 100 - (item.dims[d.key] ?? 100);
    const first = Math.round(deficit * 0.6);
    const parts = [first, deficit - first];
    CHECKS[d.key].forEach((t, i) => {
      const points = parts[i] ?? 0;
      out.push({
        id: `${item.id}:${d.key}${i}`,
        itemId: item.id,
        dim: d.key,
        check: t.check,
        points,
        result: points >= 20 ? 'Fail' : points > 0 ? 'Warn' : 'Pass',
        evidence: points > 0 ? t.evidence : 'Passing · no issues found',
        recommendation: points > 0 ? t.rec : '—',
      });
    });
  }
  out.sort((a, b) => b.points - a.points);
  findingCache.set(item.id, out);
  return out;
}

export const itemById = (id: string) => ITEMS.find(i => i.id === id);
export const findingById = (id: string) => {
  const item = itemById(id.split(':')[0]);
  return item ? findingsFor(item).find(f => f.id === id) : undefined;
};
export const teamById = (id: string) => TEAMS.find(t => t.id === id) ?? TEAMS[0];
export const dimDef = (pillar: Pillar, key: string) => DIMS[pillar].find(d => d.key === key)!;

export const grade = (s: number) => (s >= 90 ? 'A' : s >= 75 ? 'B' : s >= 60 ? 'C' : s >= 40 ? 'D' : 'E');
export const toneOf = (s: number): Tone => (s >= 90 ? 'success' : s >= 75 ? 'info' : s >= 60 ? 'warning' : s >= 40 ? 'data4' : 'error');
export const codalBand = (s: number) => (s >= 80 ? 'Catalog-grade' : s >= 60 ? 'Governed' : s >= 40 ? 'Documented' : 'Published');
const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function dimScores(item: Item, excepted: Set<string>): Record<string, number> {
  const out: Record<string, number> = { ...item.dims };
  for (const f of findingsFor(item)) {
    if (excepted.has(f.id)) out[f.dim] = clamp(out[f.dim] + f.points);
  }
  return out;
}

export function itemScore(item: Item, excepted: Set<string> = new Set(), offset = 0) {
  const dims = dimScores(item, excepted);
  const raw = DIMS[item.pillar].reduce((sum, d) => sum + dims[d.key] * d.weight, 0);
  return clamp(Math.round(raw + offset));
}

export interface Gate {
  label: string;
  ok: boolean;
  cap?: number;
}

export interface TeamSummary {
  raw: number;
  adjusted: number;
  uncapped: number;
  pillars: Record<Pillar, { raw: number; adjusted: number; count: number }>;
  gates: Gate[];
  cap: number;
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 100);

export function teamSummary(teamId: string, excepted: Set<string>, offset = 0): TeamSummary {
  const items = ITEMS.filter(i => i.team === teamId);
  const pillars = {} as TeamSummary['pillars'];
  (['Code', 'Compute', 'Data'] as Pillar[]).forEach(p => {
    const ps = items.filter(i => i.pillar === p);
    pillars[p] = {
      raw: avg(ps.map(i => itemScore(i, new Set(), offset))),
      adjusted: avg(ps.map(i => itemScore(i, excepted, offset))),
      count: ps.length,
    };
  });
  const secret = items.some(i => i.pillar === 'Code' && i.dims.S < 40);
  const failing = items.some(i => i.pillar === 'Compute' && i.dims.R < 50);
  const dataItems = items.filter(i => i.pillar === 'Data');
  const belowDoc = dataItems.filter(i => itemScore(i, excepted, offset) < 40).length > dataItems.length / 2;
  const gates: Gate[] = [
    { label: secret ? 'Secret open beyond SLA · caps at D' : 'Secrets within SLA', ok: !secret, cap: secret ? 59 : undefined },
    { label: failing ? 'Jobs with >10 failed runs · caps at C' : 'No chronic failing jobs', ok: !failing, cap: failing ? 74 : undefined },
    { label: belowDoc ? 'Most assets below Documented · caps at C' : 'Assets documented', ok: !belowDoc, cap: belowDoc ? 74 : undefined },
    { label: 'Budget on track', ok: true },
  ];
  const cap = Math.min(100, ...gates.filter(g => g.cap).map(g => g.cap!));
  const weighted = (k: 'raw' | 'adjusted') => Math.round((['Code', 'Compute', 'Data'] as Pillar[]).reduce((s, p) => s + pillars[p][k] * PILLAR_WEIGHTS[p], 0));
  const uncapped = weighted('adjusted');
  return { raw: Math.min(cap, weighted('raw')), adjusted: Math.min(cap, uncapped), uncapped, pillars, gates, cap };
}
