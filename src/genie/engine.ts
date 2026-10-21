import { ALL_TEAMS_ID, DIMS, PILLAR_WEIGHTS, checkSource, dimDef, dimScores, findingsFor, grade, itemById, itemScore, itemsForTeam, teamById, teamSummary } from '../data/model';
import type { Pillar } from '../data/model';
import type { ExceptionRequest } from '../state/Store';

export type GenieScope = 'generic' | 'scores' | 'findings' | 'recommendations' | 'exceptions';

export const SCOPES: { value: GenieScope; label: string }[] = [
  { value: 'scores', label: 'Scores' },
  { value: 'findings', label: 'Findings' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'exceptions', label: 'Exceptions' },
  { value: 'generic', label: 'Generic' },
];

export type GenieContext = { kind: 'team' } | { kind: 'item'; itemId: string } | { kind: 'pillar'; pillar: Pillar };

export interface Answer {
  text: string;
  table?: { head: string[]; rows: (string | number)[][] };
  sql?: string;
  links?: { label: string; to: string }[];
  sources?: string[];
}

export interface AnswerInput {
  question: string;
  teamId: string;
  excepted: Set<string>;
  offset: number;
  monthId: string;
  monthLabel: string;
  exceptions: ExceptionRequest[];
  context: GenieContext;
  scope: GenieScope;
}

export function contextLabel(context: GenieContext, teamId: string) {
  if (context.kind === 'item') return itemById(context.itemId)?.name ?? 'line item';
  if (context.kind === 'pillar') return `${teamById(teamId).short} · ${context.pillar}`;
  return `${teamById(teamId).short} scorecard`;
}

export function suggestionsFor(context: GenieContext): string[] {
  if (context.kind === 'item') return ['Why is this score low?', 'What should we fix first?', 'Show the evidence', 'Any exceptions on this item?'];
  if (context.kind === 'pillar') return [`Why is ${context.pillar} low?`, `Top ${context.pillar} fixes`, 'Which items drag it down?', 'How is it calculated?'];
  return ['Why did our score drop this month?', 'What are the top 3 fixes?', 'Which tables have no descriptions?', 'Show pending exceptions'];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function itemAnswer(itemId: string, s: string, input: AnswerInput): Answer {
  const item = itemById(itemId)!;
  const { excepted, offset, exceptions } = input;
  const score = itemScore(item, excepted, offset);
  const open = findingsFor(item).filter(f => f.result !== 'Pass' && !excepted.has(f.id));
  const dims = dimScores(item, excepted);
  const sources = Array.from(new Set(open.map(f => checkSource(f.dim, 0, item, f)))).slice(0, 4);

  if (s.includes('exception')) {
    const list = exceptions.filter(e => e.itemId === item.id);
    return {
      text: list.length ? `${item.name} has ${list.length} exception request${list.length > 1 ? 's' : ''}.` : `There are no exception requests on ${item.name}.`,
      table: list.length ? { head: ['Request', 'Finding', 'Status'], rows: list.map(e => [e.id, e.findingId.split(':')[1], e.status]) } : undefined,
      links: [{ label: 'Open breakdown', to: `/item/${item.id}` }],
    };
  }
  if (s.includes('evidence')) {
    return {
      text: `Here is the evidence behind the ${open.length} open findings on ${item.name}:`,
      table: { head: ['Dim', 'Check', 'Evidence'], rows: open.slice(0, 5).map(f => [f.dim, f.check, f.evidence]) },
      sources,
      links: [{ label: 'Open breakdown', to: `/item/${item.id}` }],
    };
  }
  if (s.includes('fix') || s.includes('first') || s.includes('recommend')) {
    const top = open.slice(0, 3);
    return {
      text: `Fix these first on ${item.name}. Together they recover about +${round1(top.reduce((a, f) => a + f.points * dimDef(item.pillar, f.dim).weight, 0))} points on the item score:`,
      table: { head: ['Fix', 'Dim', 'Points'], rows: top.map(f => [f.recommendation, f.dim, `+${f.points}`]) },
      sources,
      links: [{ label: 'Open breakdown', to: `/item/${item.id}` }],
    };
  }
  const weakest = [...DIMS[item.pillar]].sort((a, b) => dims[a.key] - dims[b.key]).slice(0, 2);
  return {
    text: `${item.name} scores ${score} (grade ${grade(score)}). The weakest dimensions are ${weakest.map(d => `${d.name} (${dims[d.key]})`).join(' and ')}, which account for most of the gap. The biggest single finding is "${open[0]?.check ?? 'none'}".`,
    table: { head: ['Dimension', 'Score', 'Weight'], rows: DIMS[item.pillar].map(d => [`${d.key} · ${d.name}`, dims[d.key], `${Math.round(d.weight * 100)}%`]) },
    sql: `SELECT dimension, score, weight\nFROM scorecard.item_dimensions\nWHERE item_id = '${item.id}' AND month = '${input.monthId}';`,
    sources,
    links: [{ label: 'Open breakdown', to: `/item/${item.id}` }],
  };
}

export function answerFor(input: AnswerInput): Answer {
  const { question, teamId, excepted, offset, monthId, monthLabel, exceptions, context, scope } = input;
  const s = question.toLowerCase();
  if (context.kind === 'item') return itemAnswer(context.itemId, s, input);

  const team = teamById(teamId);
  const summary = teamSummary(teamId, excepted, offset);
  const teamItems = itemsForTeam(teamId);
  const items = teamItems.filter(i => context.kind !== 'pillar' || i.pillar === context.pillar);
  const open = items.flatMap(i => findingsFor(i).filter(f => f.result !== 'Pass' && !excepted.has(f.id)).map(f => ({ f, i })));
  const is = (words: string[], target: GenieScope) => words.some(w => s.includes(w)) || (scope === target && !/exception|fix|top|description/.test(s));
  const teamSqlFilter = teamId === ALL_TEAMS_ID ? '1=1' : `team = '${team.id}'`;

  if (is(['exception', 'pending', 'approval'], 'exceptions')) {
    const pend = exceptions.filter(e => e.status === 'pending');
    return {
      text: `There are ${pend.length} exception requests waiting for a workspace admin.`,
      table: { head: ['Request', 'Line item', 'Reason', 'Requested by'], rows: pend.map(e => [e.id, e.itemId, e.reason, e.requestedBy]) },
      links: [{ label: 'Open admin review', to: '/admin' }],
      sources: ['scorecard.exception_requests'],
    };
  }
  if (is(['fix', 'top', 'recommend'], 'recommendations')) {
    const top = open
      .map(({ f, i }) => ({ f, i, gain: round1(f.points * dimDef(i.pillar, f.dim).weight * PILLAR_WEIGHTS[i.pillar]) }))
      .sort((a, b) => b.gain - a.gain)
      .slice(0, 3);
    return {
      text: `These three fixes give the biggest lift, about +${round1(top.reduce((a, b) => a + b.gain, 0))} points on the team score:`,
      table: { head: ['Fix', 'Line item', 'Gain'], rows: top.map(t => [t.f.recommendation, t.i.name, `+${t.gain}`]) },
      sql: `SELECT recommendation, item_name, team_gain\nFROM scorecard.recommendations\nWHERE ${teamSqlFilter} AND status = 'open'\nORDER BY team_gain DESC\nLIMIT 3;`,
      links: [{ label: 'All recommendations', to: '/recommendations' }],
      sources: ['scorecard.recommendations', 'system.access.table_lineage'],
    };
  }
  if (is(['description', 'ontology', 'document'], 'findings')) {
    const rows = teamItems.filter(i => i.pillar === 'Data' && (i.dims.O ?? 100) < 60);
    return {
      text: `${rows.length} tables score below 60 on Ontology, meaning the table or its most-used columns lack descriptions of at least 50 characters.`,
      table: { head: ['Table', 'Ontology', 'Owner'], rows: rows.map(i => [i.name, i.dims.O, i.owner]) },
      sql: `SELECT table_name, ontology_score, owner\nFROM scorecard.data_dimensions\nWHERE ${teamSqlFilter} AND ontology_score < 60;`,
      sources: ['information_schema.tables', 'information_schema.columns', 'system.query.history'],
    };
  }
  if (context.kind === 'pillar' && s.includes('calculat')) {
    return {
      text: `${context.pillar} is worth ${PILLAR_WEIGHTS[context.pillar] * 100}% of the team score. Each line item is scored on these weighted dimensions, and the pillar is the average of its items.`,
      table: { head: ['Dimension', 'Weight', 'Checks'], rows: DIMS[context.pillar].map(d => [`${d.key} · ${d.name}`, `${Math.round(d.weight * 100)}%`, d.hint]) },
    };
  }
  if (is(['drop', 'why', 'score', 'low', 'drag'], 'scores') || scope === 'scores') {
    const worst = [...items].sort((a, b) => itemScore(a, excepted, offset) - itemScore(b, excepted, offset)).slice(0, 3);
    const subject = context.kind === 'pillar' ? `${team.short} ${context.pillar}` : team.short;
    const value = context.kind === 'pillar' ? summary.pillars[context.pillar].adjusted : summary.adjusted;
    return {
      text: `${subject} is at ${value} (grade ${grade(value)}) for ${monthLabel}. ${context.kind === 'team' ? `Data is weighted 50%, so low Data scores, mainly Ontology, are the biggest drag.${summary.cap < 100 ? ` A hard gate also caps the grade at ${grade(summary.cap)}.` : ''}` : ''} The lowest line items are:`,
      table: { head: ['Line item', 'Pillar', 'Score', 'Biggest gap'], rows: worst.map(i => [i.name, i.pillar, itemScore(i, excepted, offset), findingsFor(i)[0].check]) },
      sql: `SELECT item_name, pillar, score, top_gap\nFROM scorecard.line_items\nWHERE ${teamSqlFilter} AND month = '${monthId}'\nORDER BY score ASC\nLIMIT 3;`,
      links: worst.map(i => ({ label: i.name, to: `/item/${i.id}` })),
      sources: ['scorecard.line_items', 'system.billing.usage', 'system.lakeflow.job_run_timeline'],
    };
  }
  return {
    text: `I can answer questions about ${team.short}'s scores, findings, recommendations and exceptions. Pick a topic or try one of the suggestions.`,
  };
}
