import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowsClockwise, BellSimple, CaretRight, Code, Cpu, Database, DownloadSimple, MagnifyingGlass, SquaresFour, UsersThree } from '@miq/fiber-ui/icons';
import { useGenie } from '../genie/GenieProvider';
import { ButtonV2, Card, Chip, Dropdown, IconButton, InfoPopover, Input, Pill, ScoreRing, Tabs } from '../fiber';
import { PILLAR_WEIGHTS, findingsFor, grade, itemScore, itemsForTeam, money, teamById, teamFilterOptions, teamSummary } from '../data/model';
import type { Item, Pillar } from '../data/model';
import { useStore } from '../state/Store';
import { CompositeInfo, PillarInfo } from '../components/ScoreInfo';
import { NotifyModal } from '../components/NotifyModal';
import { GenieIcon } from '../components/GenieIcon';
import { ScoreSticker } from '../components/ScoreSticker';
import { PillarPill, ScoreCell } from '../components/bits';
import { exportElementAsPdf } from '../utils/exportPdf';
import { PAGE_SIZE, pageCount, paginate } from '../utils/pagination';

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

function formatPoints(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function compactMoney(value: number) {
  if (Math.abs(value) < 1000) return money(value);
  return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;
}

function SpendDelta({ pct, direction }: { pct: number; direction?: string | null }) {
  if (!pct && !direction) return null;
  const up = direction === 'INCREASE' || pct > 0;
  const cls = up ? 'down' : 'up';
  return (
    <span className={`delta ${cls}`}>{up ? '↑' : '↓'} {Math.abs(Math.round(pct))}% spend vs prior window</span>
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
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

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
  const totalPages = pageCount(sorted.length);
  const visibleRows = useMemo(() => (exporting ? sorted : paginate(sorted, page)), [sorted, page, exporting]);

  useEffect(() => setPage(1), [teamId, tab, query, gradeFilter, ownerFilter, sort]);
  useEffect(() => setPage(current => Math.min(current, totalPages)), [totalPages]);

  const exportPdf = async () => {
    const element = document.getElementById('scorecard-pdf');
    if (!element) return;
    setExporting(true);
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await exportElementAsPdf(element, `accountability-scorecard-${team.short.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
      toast({ tone: 'success', title: 'PDF downloaded', body: 'The scorecard was exported with the current layout and filters.' });
    } catch {
      toast({ tone: 'error', title: 'PDF export failed', body: 'Please try the export again.' });
    } finally {
      setExporting(false);
    }
  };

  const toggleSort = (key: typeof sort.key) =>
    setSort(current => (current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const pillarCount = (p: PillarTab) => (p === 'All' ? teamItems.length : teamItems.filter(i => i.pillar === p).length);

  const drag = (['Code', 'Compute', 'Data'] as Pillar[])
    .map(pillar => ({
      pillar,
      lost: Math.round((100 - summary.pillars[pillar].adjusted) * PILLAR_WEIGHTS[pillar] * 10) / 10,
    }))
    .sort((a, b) => b.lost - a.lost);
  const dragMax = Math.max(1, ...drag.map(row => row.lost));
  const weakest = [...teamItems]
    .map(item => ({ item, score: itemScore(item, excepted, month.offset) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 6);

  return (
    <div id="scorecard-pdf" className={refreshing ? 'page is-refreshing' : 'page'}>
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
          <ButtonV2 data-hide-from-pdf variant="secondary" startIcon={<DownloadSimple size={16} />} loading={exporting} onClick={exportPdf}>
            Export PDF
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
            Overall Score
            <InfoPopover title="How The Overall Score Is Calculated" width={440}>
              <CompositeInfo />
            </InfoPopover>
          </div>
          <div className="composite__body">
            <ScoreRing value={summary.adjusted} size={148} caption={false} />
            <div className="composite__side">
              <div className="composite__name">
                <span className="composite__score">
                  <span className="composite__score-label">Score</span>
                  {Math.round(summary.adjusted)}
                </span>
                <ScoreSticker score={summary.adjusted} />
              </div>
              <span className="muted sm">{teamItems.length} Resources Across 3 Pillars</span>
              {metrics.compute && <SpendDelta pct={metrics.compute.spendChangePct} direction={metrics.compute.spendDirection} />}
            </div>
          </div>
        </Card>

        {(['Code', 'Compute', 'Data'] as Pillar[]).map(p => {
          const s = summary.pillars[p];
          const compute = metrics.compute;
          const facts: [string, string][] =
            p === 'Data' && metrics.data
              ? [
                  ['Assets', String(metrics.data.totalAssets)],
                  ['Governed', String(metrics.data.governedCount)],
                  ['No docs', String(metrics.data.assetsMissingComment)],
                ]
              : p === 'Compute' && compute
                ? [
                    ['Success', compute.jobRuns ? `${Math.round((1 - compute.failedRuns / compute.jobRuns) * 1000) / 10}%` : '—'],
                    ['Spend', compactMoney(compute.spendCurrentUsd)],
                    ['Past SLA', String(compute.chronicPastSla)],
                  ]
                : p === 'Code' && metrics.code
                  ? [
                      ['Secrets', String(metrics.code.totalFindings)],
                      ['High risk', String(metrics.code.highCount)],
                      ['Notebooks', String(metrics.code.notebooksAffected)],
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
              <div className="kpi-body">
                <div className="kpi-figure">
                  <span className={`kpi-grade grade-${grade(s.adjusted).toLowerCase()}`}>{grade(s.adjusted)}</span>
                  <span className="kpi-score">{s.adjusted}</span>
                </div>
                <div className="meter">
                  <span style={{ width: `${s.adjusted}%` }} className={`pillar-fill pillar-fill--${p.toLowerCase()}`} />
                </div>
              </div>
              <div className="kpi-facts">
                {facts.map(([label, value]) => (
                  <div key={label} className="kpi-fact">
                    <b>{value}</b>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <section className="section home-focus">
        <div className="section-head">
          <h2 className="h2">Where The Score Is Lost</h2>
          <p>
            {drag[0].pillar} accounts for {formatPoints(drag[0].lost)} of the points still available on the overall score. Open the shortest resource bars first.
          </p>
        </div>
        <div className="chart-grid">
          <div className="home-focus__stack">
          <Card className="pillar-card">
            <div className="chart-card__head">
              <div className="kpi-label">Points Lost On The Overall Score</div>
              <p className="muted xs">Gap to 100, multiplied by the pillar weight. Data is 50%. Code and Compute are 25% each.</p>
            </div>
            <div className="bar-chart">
              {drag.map(row => (
                <div key={row.pillar} className="bar-chart__row">
                  <span className="bar-chart__label bar-chart__label--dot">
                    <span className={`pillar-dot pillar-dot--${row.pillar.toLowerCase()}`} />
                    <span className="bar-chart__name">{row.pillar}</span>
                  </span>
                  <span className="bar-chart__track">
                    <span style={{ width: `${Math.max(2, (row.lost / dragMax) * 100)}%`, background: `var(--f-pillar-${row.pillar.toLowerCase()})` }} />
                  </span>
                  <span className="bar-chart__value">{formatPoints(row.lost)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="pillar-card">
            <div className="chart-card__head">
              <div className="kpi-label">Score Caps</div>
              <p className="muted xs">
                {summary.cap < 100 ? `A cap is on. The overall grade cannot go above ${grade(summary.cap)} until it clears.` : 'No caps are on. The overall score is not being held back.'}
              </p>
            </div>
            <div className="gate-list">
              {summary.gates.map(gate => (
                <div key={gate.label} className={`gate-row${gate.ok ? ' is-ok' : ' is-on'}`}>
                  <span className="gate-row__mark">{gate.ok ? '✓' : '!'}</span>
                  <span className="gate-row__label">{gate.label.split('·')[0].trim()}</span>
                  <span className="gate-row__state">{gate.ok ? 'Clear' : gate.cap ? `Caps At ${grade(gate.cap)}` : 'Watch'}</span>
                </div>
              ))}
            </div>
          </Card>
          </div>
          <Card className="pillar-card">
            <div className="chart-card__head">
              <div className="kpi-label">Lowest Scoring Resources</div>
              <p className="muted xs">Score out of 100. The shortest bar is the first resource to fix.</p>
            </div>
            {weakest.length === 0 ? (
              <p className="muted sm">No resources for this team yet.</p>
            ) : (
              <div className="bar-chart bar-chart--names">
                {weakest.map(({ item, score }) => (
                  <button key={item.id} type="button" className="bar-chart__row" onClick={() => navigate(`/item/${item.id}`)}>
                    <span className="bar-chart__label bar-chart__label--dot" title={item.name}>
                      <span className={`pillar-dot pillar-dot--${item.pillar.toLowerCase()}`} />
                      <span className="bar-chart__name">{item.name}</span>
                    </span>
                    <span className="bar-chart__track">
                      <span style={{ width: `${Math.max(2, score)}%`, background: `var(--f-pillar-${item.pillar.toLowerCase()})` }} />
                    </span>
                    <span className="bar-chart__value">{score}</span>
                  </button>
                ))}
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
                      ['issues', 'Issues'],
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
                  visibleRows.map(i => (
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
                            <GenieIcon size={18} />
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
          {!exporting && sorted.length > PAGE_SIZE && (
            <div className="table-pagination">
              <span className="muted sm">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
              </span>
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
