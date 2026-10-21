import type { Tone } from '../fiber';

export type Pillar = 'Code' | 'Compute' | 'Data';
export type Result = 'Fail' | 'Warn' | 'Pass';

export interface DimDef {
  key: string;
  name: string;
  weight: number;
  hint: string;
}

export interface TeamDataMetrics {
  totalAssets: number;
  avgConvention: number;
  avgOntology: number;
  avgDataModelling: number;
  avgAccess: number;
  avgLineage: number;
  assetsMissingComment: number;
  majorityBelowDocumented: boolean;
  catalogGradeCount: number;
  governedCount: number;
  documentedCount: number;
  publishedCount: number;
  finalGrade?: string | null;
}

export interface TeamComputeMetrics {
  jobRuns: number;
  failedRuns: number;
  successRatePct: number;
  spendCurrentUsd: number;
  spendPreviousUsd: number;
  spendChangeUsd: number;
  spendChangePct: number;
  spendDirection?: string | null;
  chronicOpenJobs: number;
  chronicPastSla: number;
  hardGateApplied: boolean;
  windowStart?: string | null;
  windowEnd?: string | null;
  reliabilityPts: number;
  rightSizingPts: number;
  spendTrendPts: number;
  autoterminationPts: number;
  interactiveSharePts: number;
  rsSavingsUsd: number;
}

export interface TeamCodeMetrics {
  totalFindings: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  notebooksAffected: number;
  finalCodeScore: number;
  hardGateApplied: boolean;
  hasSlaBreach: boolean;
}

export interface TeamSchemaSummary {
  catalog: string;
  schema: string;
  path: string;
  totalAssets: number;
  avgCodalScore: number;
  missingComments: number;
}

export interface TeamMetrics {
  data?: TeamDataMetrics;
  compute?: TeamComputeMetrics;
  code?: TeamCodeMetrics;
  schemas?: TeamSchemaSummary[];
}

export interface Team {
  id: string;
  name: string;
  short: string;
  channel: string;
  description?: string;
  members?: { email: string; role: string; joinedAt?: string }[];
  schemas?: string[];
  scores?: Record<Pillar, number>;
  metrics?: TeamMetrics;
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
  liveFindings?: Finding[];
  score?: number;
  band?: string | null;
}

export interface LiveScorecard {
  teams: Team[];
  items: Item[];
  refreshedAt: number;
  published?: string;
  period?: { start?: string | null; end?: string | null };
  sources?: Record<string, number>;
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
  source?: string;
}

export const PILLAR_WEIGHTS: Record<Pillar, number> = { Code: 0.25, Compute: 0.25, Data: 0.5 };

/** Dimension rubric labels only — scores and findings come from accountability_* tables. */
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

const SOURCE_BY_PILLAR: Record<Pillar, string> = {
  Data: 'accountability_codal_asset_scores',
  Compute: 'accountability_compute_findings',
  Code: 'accountability_code_findings',
};

export function checkSource(dim: string, index: number, item?: Item, finding?: Finding) {
  if (finding?.source) return finding.source;
  if (item) return SOURCE_BY_PILLAR[item.pillar];
  if (['C', 'O', 'D', 'A', 'L'].includes(dim)) return SOURCE_BY_PILLAR.Data;
  if (['R', 'E', 'G', 'P'].includes(dim)) return SOURCE_BY_PILLAR.Compute;
  if (['S', 'Q', 'H', 'V'].includes(dim)) return SOURCE_BY_PILLAR.Code;
  return index >= 0 ? 'accountability_*' : 'accountability_*';
}

/** Populated only from `eng_data_platform.ani.miq_teams` via `/api/scorecard`. */
export const TEAMS: Team[] = [];

/** Populated only from accountability_* tables via `/api/scorecard`. */
export const ITEMS: Item[] = [];

export let PUBLISHED_LABEL = '—';
export let PERIOD: { start?: string | null; end?: string | null } = {};

export const ALL_TEAMS_ID = 'all';

export const ALL_TEAM: Team = {
  id: ALL_TEAMS_ID,
  name: 'All teams',
  short: 'All',
  channel: '',
};

export const MONTHS = [{ id: 'current', label: 'Current period', offset: 0, published: PUBLISHED_LABEL }];

export function itemsForTeam(teamId: string) {
  return teamId === ALL_TEAMS_ID ? [...ITEMS] : ITEMS.filter(i => i.team === teamId);
}

export function teamsInScope(teamId: string) {
  return teamId === ALL_TEAMS_ID ? TEAMS : TEAMS.filter(t => t.id === teamId);
}

export function teamFilterOptions(compact = false) {
  return [
    { value: ALL_TEAMS_ID, label: compact ? 'All' : 'All teams' },
    ...TEAMS.map(t => ({ value: t.id, label: compact ? t.short : t.name })),
  ];
}

export function findingsFor(item: Item): Finding[] {
  return item.liveFindings ?? [];
}

export const itemById = (id: string) => ITEMS.find(i => i.id === id);
export const findingById = (id: string) => {
  const item = itemById(id.split(':')[0]);
  return item ? findingsFor(item).find(f => f.id === id) : undefined;
};
export const teamById = (id: string) => {
  if (id === ALL_TEAMS_ID) return ALL_TEAM;
  return TEAMS.find(t => t.id === id) ?? TEAMS[0] ?? ALL_TEAM;
};
export const dimDef = (pillar: Pillar, key: string) => DIMS[pillar].find(d => d.key === key)!;

export const grade = (s: number) => (s >= 90 ? 'A' : s >= 75 ? 'B' : s >= 60 ? 'C' : s >= 40 ? 'D' : 'E');
export const toneOf = (s: number): Tone => (s >= 90 ? 'success' : s >= 75 ? 'info' : s >= 60 ? 'warning' : s >= 40 ? 'data4' : 'error');
export const codalBand = (s: number) => (s >= 80 ? 'Catalog-grade' : s >= 60 ? 'Governed' : s >= 40 ? 'Documented' : 'Published');
const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function dimScores(item: Item, excepted: Set<string>): Record<string, number> {
  const out: Record<string, number> = { ...item.dims };
  for (const f of findingsFor(item)) {
    if (excepted.has(f.id)) out[f.dim] = clamp((out[f.dim] ?? 0) + f.points);
  }
  return out;
}

export function itemScore(item: Item, excepted: Set<string> = new Set(), offset = 0) {
  if (item.score != null && excepted.size === 0) return clamp(Math.round(item.score + offset));
  const dims = dimScores(item, excepted);
  const defs = DIMS[item.pillar];
  const raw = defs.reduce((sum, d) => sum + (dims[d.key] ?? 0) * d.weight, 0);
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
  metrics: TeamMetrics;
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 100);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function aggregateMetrics(teams: Team[]): TeamMetrics {
  const dataRows = teams.map(t => t.metrics?.data).filter(Boolean) as TeamDataMetrics[];
  const computeRows = teams.map(t => t.metrics?.compute).filter(Boolean) as TeamComputeMetrics[];
  const codeRows = teams.map(t => t.metrics?.code).filter(Boolean) as TeamCodeMetrics[];
  const schemas = teams.flatMap(t => t.metrics?.schemas ?? []);

  return {
    data: dataRows.length
      ? {
          totalAssets: sum(dataRows.map(r => r.totalAssets)),
          avgConvention: avg(dataRows.map(r => r.avgConvention)),
          avgOntology: avg(dataRows.map(r => r.avgOntology)),
          avgDataModelling: avg(dataRows.map(r => r.avgDataModelling)),
          avgAccess: avg(dataRows.map(r => r.avgAccess)),
          avgLineage: avg(dataRows.map(r => r.avgLineage)),
          assetsMissingComment: sum(dataRows.map(r => r.assetsMissingComment)),
          majorityBelowDocumented: dataRows.some(r => r.majorityBelowDocumented),
          catalogGradeCount: sum(dataRows.map(r => r.catalogGradeCount)),
          governedCount: sum(dataRows.map(r => r.governedCount)),
          documentedCount: sum(dataRows.map(r => r.documentedCount)),
          publishedCount: sum(dataRows.map(r => r.publishedCount)),
        }
      : undefined,
    compute: computeRows.length
      ? {
          jobRuns: sum(computeRows.map(r => r.jobRuns)),
          failedRuns: sum(computeRows.map(r => r.failedRuns)),
          successRatePct: avg(computeRows.map(r => r.successRatePct)),
          spendCurrentUsd: sum(computeRows.map(r => r.spendCurrentUsd)),
          spendPreviousUsd: sum(computeRows.map(r => r.spendPreviousUsd)),
          spendChangeUsd: sum(computeRows.map(r => r.spendChangeUsd)),
          spendChangePct: avg(computeRows.map(r => r.spendChangePct)),
          spendDirection: computeRows[0]?.spendDirection ?? null,
          chronicOpenJobs: sum(computeRows.map(r => r.chronicOpenJobs)),
          chronicPastSla: sum(computeRows.map(r => r.chronicPastSla)),
          hardGateApplied: computeRows.some(r => r.hardGateApplied),
          windowStart: computeRows.map(r => r.windowStart).filter(Boolean).sort()[0] ?? null,
          windowEnd: computeRows.map(r => r.windowEnd).filter(Boolean).sort().slice(-1)[0] ?? null,
          reliabilityPts: avg(computeRows.map(r => r.reliabilityPts)),
          rightSizingPts: avg(computeRows.map(r => r.rightSizingPts)),
          spendTrendPts: avg(computeRows.map(r => r.spendTrendPts)),
          autoterminationPts: avg(computeRows.map(r => r.autoterminationPts)),
          interactiveSharePts: avg(computeRows.map(r => r.interactiveSharePts)),
          rsSavingsUsd: sum(computeRows.map(r => r.rsSavingsUsd)),
        }
      : undefined,
    code: codeRows.length
      ? {
          totalFindings: sum(codeRows.map(r => r.totalFindings)),
          highCount: sum(codeRows.map(r => r.highCount)),
          mediumCount: sum(codeRows.map(r => r.mediumCount)),
          lowCount: sum(codeRows.map(r => r.lowCount)),
          notebooksAffected: sum(codeRows.map(r => r.notebooksAffected)),
          finalCodeScore: avg(codeRows.map(r => r.finalCodeScore)),
          hardGateApplied: codeRows.some(r => r.hardGateApplied),
          hasSlaBreach: codeRows.some(r => r.hasSlaBreach),
        }
      : undefined,
    schemas,
  };
}

export function replaceScorecardData(data: LiveScorecard) {
  TEAMS.splice(0, TEAMS.length, ...data.teams);
  ITEMS.splice(0, ITEMS.length, ...data.items);
  PUBLISHED_LABEL = data.published ?? (data.refreshedAt ? new Date(data.refreshedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
  PERIOD = data.period ?? {};
  MONTHS[0] = { id: 'current', label: 'Current period', offset: 0, published: PUBLISHED_LABEL };
}

export function teamSummary(teamId: string, excepted: Set<string>, offset = 0): TeamSummary {
  const items = itemsForTeam(teamId);
  const team = teamById(teamId);
  const metrics = teamId === ALL_TEAMS_ID ? aggregateMetrics(TEAMS) : (team.metrics ?? {});
  const pillars = {} as TeamSummary['pillars'];
  (['Code', 'Compute', 'Data'] as Pillar[]).forEach(p => {
    const ps = items.filter(i => i.pillar === p);
    const calculatedRaw = avg(ps.map(i => itemScore(i, new Set(), offset)));
    const calculatedAdjusted = avg(ps.map(i => itemScore(i, excepted, offset)));
    const singleLive = team.scores?.[p];
    const liveScores =
      teamId === ALL_TEAMS_ID
        ? TEAMS.map(t => t.scores?.[p]).filter((score): score is number => score != null)
        : singleLive == null
          ? []
          : [singleLive];
    const liveRaw = liveScores.length ? avg(liveScores) : undefined;
    pillars[p] = {
      raw: liveRaw == null ? calculatedRaw : clamp(liveRaw + offset),
      adjusted: liveRaw == null ? calculatedAdjusted : clamp(liveRaw + offset + calculatedAdjusted - calculatedRaw),
      count: ps.length,
    };
  });

  const secret = Boolean(metrics.code?.hasSlaBreach || metrics.code?.hardGateApplied);
  const failing = (metrics.compute?.chronicPastSla ?? 0) > 0 || Boolean(metrics.compute?.hardGateApplied);
  const belowDoc = Boolean(metrics.data?.majorityBelowDocumented);
  const spendUp = (metrics.compute?.spendChangePct ?? 0) > 10 && metrics.compute?.spendDirection === 'INCREASE';
  const gates: Gate[] = [
    { label: secret ? 'Secret SLA / code hard gate · caps at D' : 'Secrets within SLA', ok: !secret, cap: secret ? 59 : undefined },
    { label: failing ? 'Chronic failing jobs · caps at C' : 'No chronic failing jobs', ok: !failing, cap: failing ? 74 : undefined },
    { label: belowDoc ? 'Most assets below Documented · caps at C' : 'Assets documented', ok: !belowDoc, cap: belowDoc ? 74 : undefined },
    { label: spendUp ? `Spend up ${Math.round(metrics.compute?.spendChangePct ?? 0)}% vs prior window` : 'Compute spend on track', ok: !spendUp },
  ];
  const cap = Math.min(100, ...gates.filter(g => g.cap).map(g => g.cap!));
  const weighted = (k: 'raw' | 'adjusted') => Math.round((['Code', 'Compute', 'Data'] as Pillar[]).reduce((s, p) => s + pillars[p][k] * PILLAR_WEIGHTS[p], 0));
  const uncapped = weighted('adjusted');
  return {
    raw: Math.min(cap, weighted('raw')),
    adjusted: Math.min(cap, uncapped),
    uncapped,
    pillars,
    gates,
    cap,
    metrics,
  };
}

export function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}
