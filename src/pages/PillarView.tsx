import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellSimple, CaretRight, MagnifyingGlass, UsersThree } from '@miq/fiber-ui/icons';
import { ButtonV2, Card, Dropdown, IconButton, Input } from '../fiber';
import { ALL_TEAMS_ID, findingsFor, itemScore, itemsForTeam, money, teamById, teamFilterOptions, teamsInScope } from '../data/model';
import type { Item, Pillar, Team } from '../data/model';
import { useStore } from '../state/Store';
import { useGenie } from '../genie/GenieProvider';
import { GenieIcon } from '../components/GenieIcon';
import { NotifyModal } from '../components/NotifyModal';
import { ScoreCell } from '../components/bits';
import { PAGE_SIZE, pageCount, paginate } from '../utils/pagination';

const COPY: Record<Pillar, { title: string; lead: string; list: string }> = {
  Data: {
    title: 'Data Quality',
    lead: 'How well the tables this team owns are named, described, governed and traceable.',
    list: 'Tables',
  },
  Code: {
    title: 'Code Secrets',
    lead: 'Hard-coded credentials found in notebooks, and how severe they are.',
    list: 'Notebooks',
  },
  Compute: {
    title: 'Compute Health',
    lead: 'Whether jobs finish, what they cost, and where clusters are oversized.',
    list: 'Jobs And Clusters',
  },
};

function compactMoney(value: number) {
  if (Math.abs(value) < 1000) return money(value);
  return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
}

function BarChart({ rows, suffix = '' }: { rows: { label: string; value: number; display?: string }[]; suffix?: string }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  if (rows.length === 0) return <p className="muted sm">No data for this selection yet.</p>;
  return (
    <div className="bar-chart">
      {rows.map(row => (
        <div key={row.label} className="bar-chart__row">
          <span className="bar-chart__label" title={row.label}>{row.label}</span>
          <span className="bar-chart__track">
            <span style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }} />
          </span>
          <span className="bar-chart__value">{row.display ?? `${Math.round(row.value)}${suffix}`}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Card className="pillar-card">
      <div className="chart-card__head">
        <div className="kpi-label">{title}</div>
        <p className="muted xs">{hint}</p>
      </div>
      {children}
    </Card>
  );
}

function teamLabel(team: Team) {
  return team.short || team.name;
}

export function PillarView({ pillar }: { pillar: Pillar }) {
  const { teamId, setTeamId, excepted, month, isPastMonth, refreshedAt } = useStore();
  const { askAbout } = useGenie();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [notify, setNotify] = useState<Item | null>(null);
  const copy = COPY[pillar];
  const team = teamById(teamId);
  const comparing = teamId === ALL_TEAMS_ID;
  const teams = teamsInScope(teamId);

  const items = useMemo(
    () => itemsForTeam(teamId).filter(item => item.pillar === pillar),
    [teamId, pillar, refreshedAt],
  );

  const rows = useMemo(() => {
    const filtered = items.filter(item => !query || `${item.name} ${item.path} ${item.owner}`.toLowerCase().includes(query.toLowerCase()));
    return [...filtered].sort((a, b) => itemScore(a, excepted, month.offset) - itemScore(b, excepted, month.offset));
  }, [items, query, excepted, month.offset]);

  useEffect(() => setPage(1), [teamId, pillar, query]);
  const totalPages = pageCount(rows.length);
  useEffect(() => setPage(current => Math.min(current, totalPages)), [totalPages]);
  const visible = paginate(rows, page);

  const scoreRows = [...teams]
    .map(entry => ({ label: teamLabel(entry), value: entry.scores?.[pillar] ?? 0 }))
    .sort((a, b) => a.value - b.value);

  const charts = chartsFor(pillar, comparing, teams, items);

  const stats = statsFor(pillar, teams, items);

  return (
    <div className={`page pillar-page pillar-page--${pillar.toLowerCase()}`}>
      <div className="page-head page-hero">
        <div>
          <span className="page-eyebrow">MiQ · {pillar} Accountability</span>
          <h1 className="h1">{copy.title}</h1>
          <p className="page-sub">{copy.lead} · {comparing ? 'All teams' : team.name}</p>
        </div>
        <div className="page-actions">
          <Dropdown value={teamId} onChange={setTeamId} label="Team" icon={<UsersThree size={16} />} width={280} options={teamFilterOptions()} />
        </div>
      </div>

      <div className="stat-grid">
        {stats.map(stat => (
          <Card key={stat.label} className="pillar-card">
            <div className="stat-card">
              <span className="kpi-label">
                <span className={`pillar-dot pillar-dot--${pillar.toLowerCase()}`} />
                {stat.label}
              </span>
              <span className="stat-card__value">{stat.value}</span>
              <span className="stat-card__hint">{stat.hint}</span>
            </div>
          </Card>
        ))}
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">{comparing ? 'Team Comparison' : team.name}</h2>
          <p>{comparing ? 'Lowest scores are listed first, so the teams that need attention are at the top.' : 'The shortest bar is the first thing to fix.'}</p>
        </div>
        <div className="chart-grid">
          <ChartCard title={comparing ? `${pillar} Score By Team` : charts.left.title} hint={comparing ? '0–100 after the monthly caps. A 90+, B 80+, C 70+, D 60+.' : charts.left.hint}>
            <BarChart rows={comparing ? scoreRows : charts.left.rows} />
          </ChartCard>
          <ChartCard title={charts.right.title} hint={charts.right.hint}>
            <BarChart rows={charts.right.rows} />
          </ChartCard>
        </div>
      </section>

      <section className="section">
        <Card padded={false}>
          <div className="table-head">
            <div className="table-head__title">
              <h2 className="h2">{copy.list}</h2>
              <p className="table-head__meta">{rows.length} Shown · Sorted By Score, Lowest First</p>
            </div>
            <Input icon={<MagnifyingGlass size={16} />} placeholder="Search Name, Path Or Owner" value={query} onChange={event => setQuery(event.target.value)} width={280} />
          </div>
          <div className="line-table-wrap">
            <table className="line-table">
              <colgroup>
                <col className="line-table__name" />
                <col className="line-table__owner" />
                <col className="line-table__score" />
                <col className="line-table__issues" />
                <col className="line-table__actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Owner</th>
                  <th>Score</th>
                  <th className="is-center">Issues</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="line-table__empty">Nothing in {pillar.toLowerCase()} matches this team.</td>
                  </tr>
                ) : (
                  visible.map(item => (
                    <tr key={item.id} onClick={() => navigate(`/item/${item.id}`)}>
                      <td>
                        <div className="item-cell">
                          <div className="item-cell__name">{item.name}</div>
                          <div className="item-cell__sub">{item.type} · {item.path}</div>
                        </div>
                      </td>
                      <td><div className="owner-cell" title={item.owner}>{item.owner}</div></td>
                      <td><ScoreCell score={itemScore(item, excepted, month.offset)} layout="bar" /></td>
                      <td className="is-center"><span className="issues-cell">{findingsFor(item).filter(finding => finding.result !== 'Pass' && !excepted.has(finding.id)).length}</span></td>
                      <td>
                        <div className="row-actions" onClick={event => event.stopPropagation()}>
                          <ButtonV2 className="alert-btn" size="sm" startIcon={<BellSimple size={16} weight="fill" />} disabled={isPastMonth} onClick={() => setNotify(item)}>Alert</ButtonV2>
                          <IconButton label="Ask Genie about this resource" size="sm" onClick={() => askAbout({ kind: 'item', itemId: item.id })}><GenieIcon size={18} /></IconButton>
                          <IconButton label="Open breakdown" size="sm" onClick={() => navigate(`/item/${item.id}`)}><CaretRight size={18} /></IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {rows.length > PAGE_SIZE && (
            <div className="table-pagination">
              <span className="muted sm">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}</span>
              <div className="table-pagination__controls">
                <ButtonV2 variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(current => current - 1)}>Previous</ButtonV2>
                <span className="table-pagination__page">Page {page} of {totalPages}</span>
                <ButtonV2 variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(current => current + 1)}>Next</ButtonV2>
              </div>
            </div>
          )}
        </Card>
      </section>
      <NotifyModal item={notify} onClose={() => setNotify(null)} />
    </div>
  );
}

function sumOf(teams: Team[], read: (team: Team) => number) {
  return teams.reduce((total, team) => total + read(team), 0);
}

function statsFor(pillar: Pillar, teams: Team[], items: Item[]) {
  if (pillar === 'Data') {
    return [
      { label: 'Tables Scored', value: sumOf(teams, team => team.metrics?.data?.totalAssets ?? 0).toLocaleString(), hint: 'Owned tables and views' },
      { label: 'Missing Descriptions', value: sumOf(teams, team => team.metrics?.data?.assetsMissingComment ?? 0).toLocaleString(), hint: 'Add a useful table comment' },
      { label: 'Catalog-Grade', value: sumOf(teams, team => team.metrics?.data?.catalogGradeCount ?? 0).toLocaleString(), hint: 'The band to aim for' },
      { label: 'Below Documented', value: sumOf(teams, team => team.metrics?.data?.publishedCount ?? 0).toLocaleString(), hint: 'These are the first to lift' },
    ];
  }
  if (pillar === 'Code') {
    const pastSla = items.filter(item => item.meta?.includes('SLA breached')).length;
    return [
      { label: 'Secrets Found', value: sumOf(teams, team => team.metrics?.code?.totalFindings ?? 0).toLocaleString(), hint: 'Target is zero' },
      { label: 'High Severity', value: sumOf(teams, team => team.metrics?.code?.highCount ?? 0).toLocaleString(), hint: 'Live credentials, such as API keys' },
      { label: 'Notebooks', value: sumOf(teams, team => team.metrics?.code?.notebooksAffected ?? 0).toLocaleString(), hint: 'Notebooks with at least one secret' },
      { label: 'Past SLA', value: pastSla.toLocaleString(), hint: 'Still open more than 7 days later' },
    ];
  }
  const runs = sumOf(teams, team => team.metrics?.compute?.jobRuns ?? 0);
  const failed = sumOf(teams, team => team.metrics?.compute?.failedRuns ?? 0);
  const success = runs ? `${Math.round((1 - failed / runs) * 1000) / 10}%` : '—';
  return [
    { label: 'Spend', value: compactMoney(sumOf(teams, team => team.metrics?.compute?.spendCurrentUsd ?? 0)), hint: 'Current window' },
    { label: 'Job Success', value: success, hint: 'Share of runs that finished' },
    { label: 'Past SLA', value: sumOf(teams, team => team.metrics?.compute?.chronicPastSla ?? 0).toLocaleString(), hint: 'Jobs still failing past their deadline' },
    { label: 'Possible Savings', value: compactMoney(sumOf(teams, team => team.metrics?.compute?.rsSavingsUsd ?? 0)), hint: 'If oversized jobs were right-sized' },
  ];
}

function chartsFor(pillar: Pillar, comparing: boolean, teams: Team[], items: Item[]) {
  if (pillar === 'Data') {
    return {
      left: {
        title: 'CODAL Check Scores',
        hint: 'Convention, ontology, modelling, access and lineage. 100 is a clean check.',
        rows: codalRows(teams),
      },
      right: comparing
        ? { title: 'Tables Missing A Description', hint: 'Lower is better. These need a table comment.', rows: teams.map(team => ({ label: teamLabel(team), value: team.metrics?.data?.assetsMissingComment ?? 0 })).sort((a, b) => b.value - a.value) }
        : { title: 'Tables By Band', hint: 'Move tables up from Published toward Catalog-grade.', rows: bandRows(teams) },
    };
  }
  if (pillar === 'Code') {
    return {
      left: {
        title: 'Secrets By Severity',
        hint: 'High severity is a live credential and should be rotated first.',
        rows: [
          { label: 'High', value: sumOf(teams, team => team.metrics?.code?.highCount ?? 0) },
          { label: 'Medium', value: sumOf(teams, team => team.metrics?.code?.mediumCount ?? 0) },
          { label: 'Low', value: sumOf(teams, team => team.metrics?.code?.lowCount ?? 0) },
        ],
      },
      right: comparing
        ? { title: 'High-Severity Secrets By Team', hint: 'Teams with the most live credentials.', rows: teams.map(team => ({ label: teamLabel(team), value: team.metrics?.code?.highCount ?? 0 })).sort((a, b) => b.value - a.value) }
        : { title: 'Secret Types Found', hint: 'The credential types the scanner found.', rows: secretTypes(items) },
    };
  }
  return {
    left: {
      title: 'Where Points Are Earned',
      hint: 'A short bar is where this score is being lost.',
      rows: [
        { label: 'Reliability', value: averagePoint(teams, 'reliabilityPts') },
        { label: 'Right-Sizing', value: averagePoint(teams, 'rightSizingPts') },
        { label: 'Spend Trend', value: averagePoint(teams, 'spendTrendPts') },
        { label: 'Auto-Termination', value: averagePoint(teams, 'autoterminationPts') },
        { label: 'Interactive Share', value: averagePoint(teams, 'interactiveSharePts') },
      ],
    },
    right: comparing
      ? { title: 'Spend By Team', hint: 'Current window. The largest bar is the biggest bill.', rows: teams.map(team => ({ label: teamLabel(team), value: team.metrics?.compute?.spendCurrentUsd ?? 0, display: compactMoney(team.metrics?.compute?.spendCurrentUsd ?? 0) })).sort((a, b) => b.value - a.value) }
      : { title: 'Issues By Type', hint: 'What kind of compute problem shows up most.', rows: issueTypes(items) },
  };
}

function codalRows(teams: Team[]) {
  const read = (key: 'avgConvention' | 'avgOntology' | 'avgDataModelling' | 'avgAccess' | 'avgLineage') => {
    const values = teams.map(team => team.metrics?.data?.[key]).filter((value): value is number => value != null);
    return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  };
  return [
    { label: 'Convention', value: read('avgConvention') },
    { label: 'Ontology', value: read('avgOntology') },
    { label: 'Data Modelling', value: read('avgDataModelling') },
    { label: 'Access', value: read('avgAccess') },
    { label: 'Lineage', value: read('avgLineage') },
  ];
}

function bandRows(teams: Team[]) {
  return [
    { label: 'Catalog-Grade', value: sumOf(teams, team => team.metrics?.data?.catalogGradeCount ?? 0) },
    { label: 'Governed', value: sumOf(teams, team => team.metrics?.data?.governedCount ?? 0) },
    { label: 'Documented', value: sumOf(teams, team => team.metrics?.data?.documentedCount ?? 0) },
    { label: 'Published', value: sumOf(teams, team => team.metrics?.data?.publishedCount ?? 0) },
  ];
}

function averagePoint(teams: Team[], key: 'reliabilityPts' | 'rightSizingPts' | 'spendTrendPts' | 'autoterminationPts' | 'interactiveSharePts') {
  const values = teams.map(team => team.metrics?.compute?.[key]).filter((value): value is number => value != null);
  return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
}

function secretTypes(items: Item[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const finding of findingsFor(item)) {
      const name = finding.check.replace(/ secret$/i, '');
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));
}

function issueTypes(items: Item[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const finding of findingsFor(item)) counts.set(finding.check, (counts.get(finding.check) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));
}
