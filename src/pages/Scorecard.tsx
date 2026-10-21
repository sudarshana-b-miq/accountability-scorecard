import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowsClockwise, BellSimple, CaretRight, Code, Cpu, Database, DownloadSimple, MagnifyingGlass, Sparkle, SquaresFour, UsersThree } from '@miq/fiber-ui/icons';
import { useGenie } from '../genie/GenieProvider';
import { ButtonV2, Card, Chip, DataTable, Dropdown, IconButton, InfoPopover, Input, Pill, ScoreRing, Tabs } from '../fiber';
import type { Column } from '../fiber';
import { ITEMS, MONTHS, PILLAR_WEIGHTS, TEAMS, codalBand, findingsFor, grade, itemScore, teamById, teamSummary, toneOf } from '../data/model';
import type { Item, Pillar } from '../data/model';
import { useStore } from '../state/Store';
import { TrendChart } from '../components/TrendChart';
import type { TrendPoint } from '../components/TrendChart';
import { CompositeInfo, PillarInfo } from '../components/ScoreInfo';
import { NotifyModal } from '../components/NotifyModal';
import { PillarPill, ScoreCell, StatusPill, itemStatus } from '../components/bits';

type PillarTab = 'All' | Pillar;
const GRADE_FILTERS: { key: string; label: string; sample: number }[] = [
  { key: 'E', label: 'E · <40', sample: 20 },
  { key: 'D', label: 'D · 40–59', sample: 45 },
  { key: 'C', label: 'C · 60–74', sample: 65 },
  { key: 'B', label: 'B · 75–89', sample: 80 },
  { key: 'A', label: 'A · 90+', sample: 95 },
];
const PILLAR_TABS: PillarTab[] = ['All', 'Code', 'Compute', 'Data'];
const PILLAR_TAB_ICON: Record<PillarTab, ReactNode> = {
  All: <SquaresFour size={16} />,
  Code: <Code size={16} />,
  Compute: <Cpu size={16} />,
  Data: <Database size={16} />,
};
const TREND_MONTHS = [
  { label: 'Apr', offset: -14 },
  { label: 'May', offset: -12 },
  { label: 'Jun', offset: -10 },
  { label: 'Jul', offset: -7 },
  { label: 'Aug', offset: -4 },
  { label: 'Sep', offset: 0 },
];

function Trend({ delta }: { delta: number }) {
  const cls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const text = delta === 0 ? 'no change' : `${delta > 0 ? '↑' : '↓'} ${delta > 0 ? '+' : '−'}${Math.abs(delta)} pts`;
  return (
    <span className={`delta ${cls}`}>
      {text}
      <span className="vs">vs last month</span>
    </span>
  );
}

export function Scorecard() {
  const { teamId, setTeamId, month, excepted, stageOf, pendingByFinding, isPastMonth, refresh, refreshing, toast } = useStore();
  const navigate = useNavigate();
  const { askAbout } = useGenie();
  const [params, setParams] = useSearchParams();
  const pillarParam = params.get('pillar') as PillarTab | null;
  const tab: PillarTab = pillarParam && PILLAR_TABS.includes(pillarParam) ? pillarParam : 'All';
  const setTab = (t: PillarTab) => setParams(t === 'All' ? {} : { pillar: t }, { replace: true });
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState('any');
  const [statusFilter, setStatusFilter] = useState('any');
  const [notify, setNotify] = useState<Item | null>(null);

  const team = teamById(teamId);
  const summary = teamSummary(teamId, excepted, month.offset);
  const prevMonth = MONTHS[MONTHS.findIndex(m => m.id === month.id) + 1];
  const prev = prevMonth ? teamSummary(teamId, excepted, prevMonth.offset) : null;
  const teamItems = ITEMS.filter(i => i.team === teamId);
  const owners = useMemo(() => [...new Set(teamItems.map(i => i.owner))].sort(), [teamItems]);
  const trend: TrendPoint[] = TREND_MONTHS.map(m => {
    const s = teamSummary(teamId, excepted, m.offset);
    return { label: m.label, values: { Code: s.pillars.Code.adjusted, Compute: s.pillars.Compute.adjusted, Data: s.pillars.Data.adjusted } };
  });

  const rows = useMemo(
    () =>
      teamItems
        .filter(i => tab === 'All' || i.pillar === tab)
        .filter(i => !query || `${i.name} ${i.path} ${i.owner}`.toLowerCase().includes(query.toLowerCase()))
        .filter(i => !gradeFilter || grade(itemScore(i, excepted, month.offset)) === gradeFilter)
        .filter(i => ownerFilter === 'any' || i.owner === ownerFilter)
        .filter(i => {
          if (statusFilter === 'any') return true;
          return itemStatus(i, stageOf, excepted, pendingByFinding).label === statusFilter;
        }),
    [teamItems, tab, query, gradeFilter, ownerFilter, statusFilter, excepted, month.offset, stageOf, pendingByFinding],
  );

  const statusOptions = useMemo(() => {
    const labels = new Set(teamItems.map(i => itemStatus(i, stageOf, excepted, pendingByFinding).label));
    return [...labels].sort();
  }, [teamItems, stageOf, excepted, pendingByFinding]);

  const columns: Column<Item>[] = [
    {
      key: 'name',
      header: 'Line item',
      width: 260,
      sortValue: i => i.name,
      render: i => (
        <div className="item-cell">
          <div className="item-cell__name">{i.name}</div>
          <div className="item-cell__sub">
            {i.type} · {i.path}
          </div>
        </div>
      ),
    },
    {
      key: 'pillar',
      header: 'Pillar',
      width: 120,
      sortValue: i => i.pillar,
      render: i => <PillarPill pillar={i.pillar} />,
    },
    { key: 'owner', header: 'Owner', width: 110, sortValue: i => i.owner, render: i => <span className="muted">{i.owner}</span> },
    {
      key: 'score',
      header: 'Score',
      width: 180,
      sortValue: i => itemScore(i, excepted, month.offset),
      render: i => <ScoreCell score={itemScore(i, excepted, month.offset)} layout="bar" />,
    },
    {
      key: 'issues',
      header: 'Open issues',
      width: 100,
      align: 'center',
      sortValue: i => findingsFor(i).filter(f => f.result !== 'Pass' && !excepted.has(f.id)).length,
      render: i => {
        const open = findingsFor(i).filter(f => f.result !== 'Pass' && !excepted.has(f.id)).length;
        return <span className="issues-cell">{open}</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: 140,
      sortValue: i => itemStatus(i, stageOf, excepted, pendingByFinding).label,
      render: i => <StatusPill {...itemStatus(i, stageOf, excepted, pendingByFinding)} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 120,
      render: i => (
        <div className="row-actions" onClick={e => e.stopPropagation()}>
          <IconButton label="Ask Genie about this item" size="sm" onClick={() => askAbout({ kind: 'item', itemId: i.id })}>
            <Sparkle size={18} />
          </IconButton>
          <IconButton label="Notify owner or team" size="sm" onClick={() => setNotify(i)} disabled={isPastMonth}>
            <BellSimple size={18} />
          </IconButton>
          <IconButton label="Open breakdown" size="sm" onClick={() => navigate(`/item/${i.id}`)}>
            <CaretRight size={18} />
          </IconButton>
        </div>
      ),
    },
  ];

  const pillarCount = (p: PillarTab) => (p === 'All' ? teamItems.length : teamItems.filter(i => i.pillar === p).length);

  const lowest = (['Code', 'Compute', 'Data'] as Pillar[]).reduce((a, b) => (summary.pillars[b].adjusted < summary.pillars[a].adjusted ? b : a));
  const teamDelta = prev ? summary.adjusted - prev.adjusted : 0;
  const headline = `${team.short} scores ${summary.adjusted} (grade ${grade(summary.adjusted)})${prev ? `, ${teamDelta === 0 ? 'flat' : `${teamDelta > 0 ? 'up' : 'down'} ${Math.abs(teamDelta)} pts`} vs last month` : ''}. Lowest pillar: ${lowest} at ${summary.pillars[lowest].adjusted}.`;

  return (
    <div className={refreshing ? 'page is-refreshing' : 'page'}>
      <div className="page-head page-hero">
        <div>
          <span className="page-eyebrow">MiQ · Data platform accountability</span>
          <h1 className="h1">Accountability Scorecard</h1>
          <p className="page-sub">
            {team.name} · {teamItems.length} line items · owner channel {team.channel}
          </p>
        </div>
        <div className="page-actions">
          <Pill tone="neutral">As of {month.published}</Pill>
          <Dropdown value={teamId} onChange={setTeamId} label="Team" icon={<UsersThree size={16} />} width={280} options={TEAMS.map(t => ({ value: t.id, label: t.name }))} />
          <IconButton label={refreshing ? 'Refreshing…' : 'Refresh scores'} outlined onClick={refresh} disabled={refreshing}>
            <ArrowsClockwise size={18} className={refreshing ? 'spin' : undefined} />
          </IconButton>
          <ButtonV2 variant="secondary" startIcon={<DownloadSimple size={16} />} onClick={() => toast({ tone: 'success', title: 'Export ready', body: 'scorecard.csv has been downloaded.' })}>
            Export
          </ButtonV2>
        </div>
      </div>

      <div className="score-grid">
        <Card className="composite">
          <div className="kpi-label">
            Team score
            <InfoPopover title="How the team score is calculated" width={440}>
              <CompositeInfo />
            </InfoPopover>
          </div>
          <div className="composite__body">
            <ScoreRing value={summary.adjusted} size={140} />
            <div className="kpi-stack">
              <span className="composite__team">{team.short}</span>
              <span className="muted sm">
                {teamItems.length} line items across 3 pillars
              </span>
              {prev && <Trend delta={teamDelta} />}
            </div>
          </div>
        </Card>

        {(['Code', 'Compute', 'Data'] as Pillar[]).map(p => {
          const s = summary.pillars[p];
          const prevS = prev?.pillars[p];
          return (
            <Card key={p} interactive selected={tab === p} onClick={() => setTab(tab === p ? 'All' : p)} className={`kpi-card kpi-card--${p.toLowerCase()}`}>
              <div className="kpi-label">
                <span className={`pillar-dot pillar-dot--${p.toLowerCase()}`} />
                {p}
                <InfoPopover title={`How the ${p} score is calculated`}>
                  <PillarInfo pillar={p} />
                </InfoPopover>
              </div>
              <div className="kpi-figure">
                <span className={`kpi-grade tone-${toneOf(s.adjusted)}`}>{grade(s.adjusted)}</span>
                <span className="kpi-score">{s.adjusted}</span>
              </div>
              {prevS && <Trend delta={s.adjusted - prevS.adjusted} />}
              <div className="meter">
                <span style={{ width: `${s.adjusted}%` }} className={`pillar-fill pillar-fill--${p.toLowerCase()}`} />
              </div>
              <div className="muted xs">
                {s.count} items · {PILLAR_WEIGHTS[p] * 100}% of team score
                {p === 'Data' && ` · ${codalBand(s.adjusted)}`}
              </div>
            </Card>
          );
        })}
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="h2">Team scorecard</h2>
          <p>{headline}</p>
        </div>
        <Card padded={false}>
          <div className="card-head">
            <div>
              <h3 className="card-title">
                {team.short} pillar trend, {trend[0].label} – {trend[trend.length - 1].label} 2026
              </h3>
              <p className="card-sub">Team pillar scores by month</p>
            </div>
            <span className="card-head__end">
              <InfoPopover title="How this chart is built">Each line is the team mean of that pillar's 0–100 score for the month. Six months shown up to the current period.</InfoPopover>
            </span>
          </div>
          <TrendChart points={trend} />
        </Card>
      </section>

      <section className="section">
        <Card padded={false}>
          <div className="table-head">
            <div className="table-head__title">
              <h2 className="h2">Line items</h2>
              <p className="table-head__meta">
                {teamItems.length} items · sorted by score, lowest first
              </p>
            </div>
            <Input icon={<MagnifyingGlass size={16} />} placeholder="Search name, path or owner" value={query} onChange={e => setQuery(e.target.value)} width={280} />
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
                <Chip key={g.key} selected={gradeFilter === g.key} onClick={() => setGradeFilter(gradeFilter === g.key ? null : g.key)} dotTone={toneOf(g.sample)}>
                  {g.label}
                </Chip>
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
              <Dropdown
                value={statusFilter}
                onChange={setStatusFilter}
                label="Status"
                width={180}
                options={[{ value: 'any', label: 'Any' }, ...statusOptions.map(s => ({ value: s, label: s }))]}
              />
            </div>
          </div>
          <DataTable columns={columns} rows={rows} rowKey={i => i.id} onRowClick={i => navigate(`/item/${i.id}`)} defaultSort={{ key: 'score', dir: 'asc' }} />
        </Card>
      </section>

      <NotifyModal item={notify} onClose={() => setNotify(null)} />
    </div>
  );
}
