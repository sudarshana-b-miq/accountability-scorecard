import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowsClockwise, BellSimple, CaretRight, Code, Cpu, Database, DownloadSimple, MagnifyingGlass, Sparkle, SquaresFour, UsersThree } from '@miq/fiber-ui/icons';
import { useGenie } from '../genie/GenieProvider';
import { ButtonV2, Card, Chip, Dropdown, IconButton, InfoPopover, Input, Pill, ScoreRing, Tabs } from '../fiber';
import { PILLAR_WEIGHTS, codalBand, findingsFor, grade, itemScore, itemsForTeam, money, teamById, teamFilterOptions, teamSummary } from '../data/model';
import type { Item, Pillar } from '../data/model';
import { useStore } from '../state/Store';
import { CompositeInfo, PillarInfo } from '../components/ScoreInfo';
import { NotifyModal } from '../components/NotifyModal';
import { ScoreSticker } from '../components/ScoreSticker';
import { PillarPill, ScoreCell } from '../components/bits';

type PillarTab = 'All' | Pillar;
const GRADE_FILTERS: { key: string; label: string }[] = [
  { key: 'E', label: 'E · <40' },
  { key: 'D', label: 'D · 40–59' },
  { key: 'C', label: 'C · 60–74' },
  { key: 'B', label: 'B · 75–89' },
  { key: 'A', label: 'A · 90+' },
];
const PILLAR_TABS: PillarTab[] = ['All', 'Code', 'Compute', 'Data'];
const PILLAR_TAB_ICON: Record<PillarTab, ReactNode> = {
  All: <SquaresFour size={16} />,
  Code: <Code size={16} />,
  Compute: <Cpu size={16} />,
  Data: <Database size={16} />,
};

function SpendDelta({ pct, direction }: { pct: number; direction?: string | null }) {
  if (!pct && !direction) return null;
  const up = direction === 'INCREASE' || pct > 0;
  const cls = up ? 'down' : 'up';
  return (
    <span className={`delta ${cls}`}>
      {up ? '↑' : '↓'} {Math.abs(Math.round(pct))}% Spend
      <span className="vs">Vs Prior Window</span>
    </span>
  );
}

export function Scorecard() {
  const { teamId, setTeamId, month, excepted, isPastMonth, refresh, refreshing, toast, dataError } = useStore();
  const navigate = useNavigate();
  const { askAbout } = useGenie();
  const [params, setParams] = useSearchParams();
  const pillarParam = params.get('pillar') as PillarTab | null;
  const tab: PillarTab = pillarParam && PILLAR_TABS.includes(pillarParam) ? pillarParam : 'All';
  const setTab = (t: PillarTab) => setParams(t === 'All' ? {} : { pillar: t }, { replace: true });
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState('any');
  const [notify, setNotify] = useState<Item | null>(null);
  const [sort, setSort] = useState<{ key: 'name' | 'pillar' | 'owner' | 'score' | 'issues'; dir: 'asc' | 'desc' }>({ key: 'score', dir: 'asc' });

  const team = teamById(teamId);
  const summary = teamSummary(teamId, excepted, month.offset);
  const teamItems = itemsForTeam(teamId);
  const owners = useMemo(() => [...new Set(teamItems.map(i => i.owner))].sort(), [teamItems]);
  const { metrics } = summary;

  const rows = useMemo(
    () =>
      teamItems
        .filter(i => tab === 'All' || i.pillar === tab)
        .filter(i => !query || `${i.name} ${i.path} ${i.owner}`.toLowerCase().includes(query.toLowerCase()))
        .filter(i => !gradeFilter || grade(itemScore(i, excepted, month.offset)) === gradeFilter)
        .filter(i => ownerFilter === 'any' || i.owner === ownerFilter),
    [teamItems, tab, query, gradeFilter, ownerFilter, excepted, month.offset],
  );

  const openCount = (i: Item) => findingsFor(i).filter(f => f.result !== 'Pass' && !excepted.has(f.id)).length;
  const sorted = useMemo(() => {
    const value = (i: Item): string | number => {
      if (sort.key === 'name') return i.name;
      if (sort.key === 'pillar') return i.pillar;
      if (sort.key === 'owner') return i.owner;
      if (sort.key === 'score') return itemScore(i, excepted, month.offset);
      return openCount(i);
    };
    return [...rows].sort((a, b) => {
      const left = value(a);
      const right = value(b);
      const cmp = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sort, excepted, month.offset]);

  const toggleSort = (key: typeof sort.key) =>
    setSort(current => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const pillarCount = (p: PillarTab) => (p === 'All' ? teamItems.length : teamItems.filter(i => i.pillar === p).length);

  const lowest = (['Code', 'Compute', 'Data'] as Pillar[]).reduce((a, b) => (summary.pillars[b].adjusted < summary.pillars[a].adjusted ? b : a));
  const headline = `${team.short} Scores ${summary.adjusted} (Grade ${grade(summary.adjusted)}). Lowest Pillar: ${lowest} At ${summary.pillars[lowest].adjusted}.`;

  return (
    <div className={refreshing ? 'page is-refreshing' : 'page'}>
      <div className="page-head page-hero">
        <div>
          <span className="page-eyebrow">MiQ · Data Platform Accountability</span>
          <h1 className="h1">Accountability Scorecard</h1>
          <p className="page-sub">
            {team.name} · {teamItems.length} Resources{team.channel ? ` · Owner Channel ${team.channel}` : ''}
          </p>
        </div>
        <div className="page-actions">
          <Pill tone="neutral">As of {month.published}</Pill>
          <Dropdown value={teamId} onChange={setTeamId} label="Team" icon={<UsersThree size={16} />} width={280} options={teamFilterOptions()} />
          <IconButton label={refreshing ? 'Refreshing…' : 'Refresh Scores'} outlined onClick={refresh} disabled={refreshing}>
            <ArrowsClockwise size={18} className={refreshing ? 'spin' : undefined} />
          </IconButton>
          <ButtonV2 variant="secondary" startIcon={<DownloadSimple size={16} />} onClick={() => toast({ tone: 'success', title: 'Export ready', body: 'scorecard.csv has been downloaded.' })}>
            Export
          </ButtonV2>
        </div>
      </div>

      {dataError && (
        <Card>
          <p className="muted">Unable To Load Scorecard Tables: {dataError}. Scores Stay Empty Until Databricks Data Is Available.</p>
        </Card>
      )}

      <div className="score-grid">
        <Card className="composite">
          <div className="kpi-label">
            Team Score
            <InfoPopover title="How The Team Score Is Calculated" width={440}>
              <CompositeInfo />
            </InfoPopover>
          </div>
          <div className="composite__body">
            <ScoreRing value={summary.adjusted} size={176} caption={false} />
            <div className="composite__side">
              <div className="kpi-stack">
                <span className="composite__team">{team.short}</span>
                <span className="score-ring__caption">
                  <span>Score:</span> {Math.round(summary.adjusted)}
                </span>
                <span className="muted sm">
                  {teamItems.length} Resources Across 3 Pillars
                </span>
                {metrics.compute && <SpendDelta pct={metrics.compute.spendChangePct} direction={metrics.compute.spendDirection} />}
              </div>
              <ScoreSticker score={summary.adjusted} />
            </div>
          </div>
        </Card>

        {(['Code', 'Compute', 'Data'] as Pillar[]).map(p => {
          const s = summary.pillars[p];
          const facts: [string, string][] =
            p === 'Data' && metrics.data
              ? [
                  ['Assets', String(metrics.data.totalAssets)],
                  ['Governed', String(metrics.data.governedCount)],
                  ['Band', codalBand(s.adjusted)],
                ]
              : p === 'Compute' && metrics.compute
                ? [
                    ['Failed runs', `${metrics.compute.failedRuns}/${metrics.compute.jobRuns}`],
                    ['Spend', money(metrics.compute.spendCurrentUsd)],
                    ['Chronic', String(metrics.compute.chronicPastSla)],
                  ]
                : p === 'Code' && metrics.code
                  ? [
                      ['Findings', String(metrics.code.totalFindings)],
                      ['Notebooks', String(metrics.code.notebooksAffected)],
                      ['High', String(metrics.code.highCount)],
                    ]
                  : [
                      ['Resources', String(s.count)],
                      ['Weight', `${PILLAR_WEIGHTS[p] * 100}%`],
                    ];
          return (
            <Card key={p} interactive selected={tab === p} onClick={() => setTab(tab === p ? 'All' : p)} className={`kpi-card kpi-card--${p.toLowerCase()}`}>
              <div className="kpi-label">
                <span className={`pillar-dot pillar-dot--${p.toLowerCase()}`} />
                {p}
                <InfoPopover title={`How The ${p} Score Is Calculated`}>
                  <PillarInfo pillar={p} />
                </InfoPopover>
              </div>
              <div className="kpi-figure">
                <span className={`kpi-grade grade-${grade(s.adjusted).toLowerCase()}`}>{grade(s.adjusted)}</span>
                <span className="kpi-score">{s.adjusted}</span>
              </div>
              <div className="kpi-facts">
                {facts.map(([label, value]) => (
                  <div key={label} className="kpi-fact">
                    <span>{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
              <div className="meter">
                <span style={{ width: `${s.adjusted}%` }} className={`pillar-fill pillar-fill--${p.toLowerCase()}`} />
              </div>
            </Card>
          );
        })}
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">Evidence From Accountability Tables</h2>
          <p>{headline}</p>
        </div>
        <div className="score-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <Card>
            <div className="kpi-label">Data · Asset Bands</div>
            <div className="muted sm">
              {metrics.data
                ? `${metrics.data.catalogGradeCount} Catalog-Grade · ${metrics.data.governedCount} Governed · ${metrics.data.documentedCount} Documented · ${metrics.data.assetsMissingComment} Missing Comments`
                : 'No accountability_data_summary Rows For This Team'}
            </div>
            {metrics.data && (
              <div className="muted xs" style={{ marginTop: 8 }}>
                Avg Ontology {Math.round(metrics.data.avgOntology)} · Convention {Math.round(metrics.data.avgConvention)} · Lineage {Math.round(metrics.data.avgLineage)}
              </div>
            )}
          </Card>
          <Card>
            <div className="kpi-label">Compute · Spend Window</div>
            <div className="muted sm">
              {metrics.compute
                ? `${money(metrics.compute.spendCurrentUsd)} Current · ${money(metrics.compute.spendPreviousUsd)} Prior · ${metrics.compute.chronicPastSla} Chronic Past SLA`
                : 'No accountability_compute_summary Rows For This Team'}
            </div>
            {metrics.compute?.windowStart && (
              <div className="muted xs" style={{ marginTop: 8 }}>
                Window {metrics.compute.windowStart} → {metrics.compute.windowEnd}
              </div>
            )}
          </Card>
          <Card>
            <div className="kpi-label">Code · Secret Findings</div>
            <div className="muted sm">
              {metrics.code
                ? `${metrics.code.highCount} High · ${metrics.code.mediumCount} Medium · ${metrics.code.lowCount} Low Across ${metrics.code.notebooksAffected} Notebooks`
                : 'No accountability_code_summary Rows For This Team'}
            </div>
            {summary.gates.length > 0 && (
              <div className="muted xs" style={{ marginTop: 8 }}>
                Gates: {summary.gates.map(g => (g.ok ? '✓' : '✗') + ' ' + g.label.split('·')[0].trim()).join(' · ')}
              </div>
            )}
          </Card>
        </div>
      </section>

      <section className="section">
        <Card padded={false}>
          <div className="table-head">
            <div className="table-head__title">
              <h2 className="h2">Resources</h2>
              <p className="table-head__meta">
                {teamItems.length} Resources · Sorted By Score, Lowest First
              </p>
            </div>
            <Input icon={<MagnifyingGlass size={16} />} placeholder="Search Name, Path Or Owner" value={query} onChange={e => setQuery(e.target.value)} width={280} />
          </div>
          <div className="table-tabs">
            <Tabs
              value={tab}
              onChange={setTab}
              items={PILLAR_TABS.map(p => ({
                value: p,
                label: p,
                count: pillarCount(p),
                icon: PILLAR_TAB_ICON[p],
              }))}
            />
          </div>
          <div className="table-filters">
            <div className="row-gap">
              <span className="muted sm">Score</span>
              <Chip selected={!gradeFilter} onClick={() => setGradeFilter(null)}>
                All
              </Chip>
              {GRADE_FILTERS.map(g => (
                <button
                  key={g.key}
                  type="button"
                  className={`grade-chip grade-${g.key.toLowerCase()}${gradeFilter === g.key ? ' is-selected' : ''}`}
                  onClick={() => setGradeFilter(gradeFilter === g.key ? null : g.key)}
                >
                  <span className="grade-chip__dot" />
                  {g.label}
                </button>
              ))}
            </div>
            <div className="table-filters__end">
              <Dropdown
                value={ownerFilter}
                onChange={setOwnerFilter}
                label="Owner"
                width={160}
                options={[{ value: 'any', label: 'Any' }, ...owners.map(o => ({ value: o, label: o }))]}
              />
            </div>
          </div>
          <div className="line-table-wrap">
            <table className="line-table">
              <colgroup>
                <col className="line-table__name" />
                <col className="line-table__pillar" />
                <col className="line-table__owner" />
                <col className="line-table__score" />
                <col className="line-table__issues" />
                <col className="line-table__actions" />
              </colgroup>
              <thead>
                <tr>
                  {(
                    [
                      ['name', 'Resource'],
                      ['pillar', 'Pillar'],
                      ['owner', 'Owner'],
                      ['score', 'Score'],
                      ['issues', 'Open Issues'],
                    ] as const
                  ).map(([key, label]) => (
                    <th key={key} className={key === 'issues' ? 'is-center' : undefined}>
                      <button type="button" onClick={() => toggleSort(key)}>
                        {label}
                        {sort.key === key && <span className="is-on">{sort.dir === 'desc' ? '↓' : '↑'}</span>}
                      </button>
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="line-table__empty">
                      No Resources Match Your Filters.
                    </td>
                  </tr>
                ) : (
                  sorted.map(i => (
                    <tr key={i.id} onClick={() => navigate(`/item/${i.id}`)}>
                      <td>
                        <div className="item-cell">
                          <div className="item-cell__name">{i.name}</div>
                          <div className="item-cell__sub">
                            {i.type} · {i.path}
                          </div>
                        </div>
                      </td>
                      <td>
                        <PillarPill pillar={i.pillar} />
                      </td>
                      <td>
                        <div className="owner-cell" title={i.owner}>
                          {i.owner}
                        </div>
                      </td>
                      <td>
                        <ScoreCell score={itemScore(i, excepted, month.offset)} layout="bar" />
                      </td>
                      <td className="is-center">
                        <span className="issues-cell">{openCount(i)}</span>
                      </td>
                      <td>
                        <div className="row-actions" onClick={e => e.stopPropagation()}>
                          <ButtonV2
                            className="alert-btn"
                            size="sm"
                            startIcon={<BellSimple size={16} weight="fill" />}
                            onClick={() => setNotify(i)}
                            disabled={isPastMonth}
                          >
                            Alert
                          </ButtonV2>
                          <IconButton label="Ask Genie About This Resource" size="sm" onClick={() => askAbout({ kind: 'item', itemId: i.id })}>
                            <Sparkle size={18} />
                          </IconButton>
                          <IconButton label="Open Breakdown" size="sm" onClick={() => navigate(`/item/${i.id}`)}>
                            <CaretRight size={18} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <NotifyModal item={notify} onClose={() => setNotify(null)} />
    </div>
  );
}
