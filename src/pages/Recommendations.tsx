import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BellSimple, CheckCircle, Lightning, MagnifyingGlass, TrendUp, XCircle } from '@miq/fiber-ui/icons';
import { Badge, ButtonV2, Callout, Card, Chip, DataTable, Input, Pill, SidePanel, Stepper, Tabs } from '../fiber';
import type { Column, Tone } from '../fiber';
import { ITEMS, PILLAR_WEIGHTS, checkSource, dimDef, findingsFor, itemById, teamById } from '../data/model';
import type { Finding, Item, Pillar } from '../data/model';
import { STAGES, useStore } from '../state/Store';
import type { Stage } from '../state/Store';
import { Toolbar } from '../components/Toolbar';
import { NotifyModal } from '../components/NotifyModal';
import { RejectModal } from '../components/RejectModal';
import { PillarIcon, STAGE_TONE } from '../components/bits';

type Priority = 'P1' | 'P2' | 'P3';
interface Rec extends Finding {
  item: Item;
  priority: Priority;
  gain: number;
  effort: 'Low' | 'Medium' | 'High';
  sla: string;
  stage: Stage;
}

const PRIORITY_TONE: Record<Priority, Tone> = { P1: 'error', P2: 'warning', P3: 'info' };

function effortFor(f: Finding): Rec['effort'] {
  if (['O', 'C', 'G', 'P', 'H'].includes(f.dim)) return 'Low';
  if (['D', 'Q', 'L'].includes(f.dim)) return 'High';
  return 'Medium';
}

export function Recommendations() {
  const { teamId, excepted, stageOf, setStage, pendingByFinding, isPastMonth, toast } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'open' | 'verified' | 'excepted'>('open');
  const [priorities, setPriorities] = useState<Set<Priority>>(new Set());
  const [pillar, setPillar] = useState<Pillar | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [notify, setNotify] = useState<Rec | null>(null);
  const [reject, setReject] = useState<Rec | null>(null);

  const all: Rec[] = useMemo(
    () =>
      ITEMS.filter(i => i.team === teamId).flatMap(item =>
        findingsFor(item)
          .filter(f => f.result !== 'Pass')
          .map(f => {
            const gain = Math.max(1, Math.round(f.points * dimDef(item.pillar, f.dim).weight * PILLAR_WEIGHTS[item.pillar] * 10) / 10);
            const priority: Priority = f.points >= 20 || f.dim === 'S' ? 'P1' : f.points >= 10 ? 'P2' : 'P3';
            return { ...f, item, gain, priority, effort: effortFor(f), sla: priority === 'P1' ? '7 days' : priority === 'P2' ? '30 days' : '90 days', stage: stageOf(f.id) };
          }),
      ),
    [teamId, stageOf],
  );

  const open = all.filter(r => !excepted.has(r.id) && r.stage !== 'Verified');
  const verified = all.filter(r => r.stage === 'Verified');
  const exceptedRecs = all.filter(r => excepted.has(r.id));
  const base = tab === 'open' ? open : tab === 'verified' ? verified : exceptedRecs;
  const rows = base
    .filter(r => priorities.size === 0 || priorities.has(r.priority))
    .filter(r => !pillar || r.item.pillar === pillar)
    .filter(r => !query || `${r.item.name} ${r.check} ${r.recommendation} ${r.item.owner}`.toLowerCase().includes(query.toLowerCase()));

  const potential = Math.round(open.reduce((s, r) => s + r.gain, 0) * 10) / 10;
  const funnel = STAGES.map(s => ({ stage: s, count: all.filter(r => !excepted.has(r.id) && r.stage === s).length }));
  const current = all.find(r => r.id === selected) ?? null;

  const togglePriority = (p: Priority) =>
    setPriorities(s => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });

  const advance = (r: Rec) => {
    const idx = STAGES.indexOf(r.stage);
    if (idx >= STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    setStage(r.id, next);
    toast({ tone: 'success', title: `Moved to ${next}`, body: `${r.recommendation} · ${r.item.name}` });
  };

  const columns: Column<Rec>[] = [
    { key: 'priority', header: 'Priority', width: 90, sortValue: r => r.priority, render: r => <Badge tone={PRIORITY_TONE[r.priority]}>{r.priority}</Badge> },
    {
      key: 'rec',
      header: 'Recommendation',
      sortValue: r => r.recommendation,
      render: r => (
        <div>
          <div className="b">{r.recommendation}</div>
          <div className="muted xs">
            {r.item.name} · {r.dim} · {r.check}
          </div>
        </div>
      ),
    },
    {
      key: 'pillar',
      header: 'Pillar',
      sortValue: r => r.item.pillar,
      render: r => (
        <span className="row-gap muted">
          <PillarIcon pillar={r.item.pillar} /> {r.item.pillar}
        </span>
      ),
    },
    { key: 'gain', header: 'Team score gain', align: 'right', sortValue: r => r.gain, render: r => <b className="pos">+{r.gain}</b> },
    { key: 'effort', header: 'Effort', sortValue: r => ['Low', 'Medium', 'High'].indexOf(r.effort), render: r => <span className="muted">{r.effort}</span> },
    { key: 'owner', header: 'Owner', sortValue: r => r.item.owner, render: r => <span className="muted">{r.item.owner}</span> },
    { key: 'sla', header: 'SLA', render: r => <span className="muted">{r.sla}</span> },
    {
      key: 'stage',
      header: 'Stage',
      sortValue: r => STAGES.indexOf(r.stage),
      render: r =>
        excepted.has(r.id) ? (
          <Pill tone="success">Excepted</Pill>
        ) : pendingByFinding.has(r.id) ? (
          <Pill tone="warning">Exception pending</Pill>
        ) : (
          <Pill tone={STAGE_TONE[r.stage]}>{r.stage}</Pill>
        ),
    },
  ];

  return (
    <div className="page">
      <Toolbar />
      <div className="page-head">
        <div>
          <h1 className="h1">Recommendations</h1>
          <div className="muted">Every failing or warning check becomes an action, ranked by how much it would lift {teamById(teamId).short}'s score.</div>
        </div>
      </div>

      <div className="rec-top">
        <Card className="gain-card">
          <div className="f-metrics__title">
            <TrendUp size={18} /> Potential gain
          </div>
          <div className="f-metrics__value">
            <span className="f-metrics__num">+{potential}</span>
            <span className="f-metrics__suffix">points if all open items are fixed</span>
          </div>
          <div className="row-gap" style={{ marginTop: 8 }}>
            <Badge tone="error">{open.filter(r => r.priority === 'P1').length} P1</Badge>
            <Badge tone="warning">{open.filter(r => r.priority === 'P2').length} P2</Badge>
            <Badge tone="info">{open.filter(r => r.priority === 'P3').length} P3</Badge>
          </div>
        </Card>
        <Card className="funnel">
          <div className="f-metrics__title" style={{ marginBottom: 12 }}>
            Lifecycle
          </div>
          <div className="funnel__row">
            {funnel.map((f, i) => (
              <div key={f.stage} className="funnel__step">
                <div className={`funnel__count tone-${STAGE_TONE[f.stage]}`}>{f.count}</div>
                <div className="funnel__label">{f.stage}</div>
                {i < funnel.length - 1 && <ArrowRight className="funnel__arrow" size={16} />}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padded={false}>
        <div className="table-head">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'open', label: 'Open', count: open.length },
              { value: 'verified', label: 'Verified', count: verified.length },
              { value: 'excepted', label: 'Excepted', count: exceptedRecs.length },
            ]}
          />
          <Input icon={<MagnifyingGlass size={16} />} placeholder="Search recommendations" value={query} onChange={e => setQuery(e.target.value)} width={280} />
        </div>
        <div className="table-filters">
          <div className="row-gap">
            <span className="muted sm">Priority</span>
            {(['P1', 'P2', 'P3'] as Priority[]).map(p => (
              <Chip key={p} selected={priorities.has(p)} dotTone={PRIORITY_TONE[p]} onClick={() => togglePriority(p)}>
                {p}
              </Chip>
            ))}
            <span className="muted sm" style={{ marginLeft: 12 }}>
              Pillar
            </span>
            {(['Code', 'Compute', 'Data'] as Pillar[]).map(p => (
              <Chip key={p} selected={pillar === p} icon={<PillarIcon pillar={p} size={14} />} onClick={() => setPillar(x => (x === p ? null : p))}>
                {p}
              </Chip>
            ))}
          </div>
          <span className="muted sm">{rows.length} shown</span>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={r => r.id} onRowClick={r => setSelected(r.id)} selectedKey={selected} defaultSort={{ key: 'gain', dir: 'desc' }} emptyText="Nothing here. Nice work." />
      </Card>

      <SidePanel
        open={!!current}
        onClose={() => setSelected(null)}
        title={current?.recommendation ?? ''}
        headerExtra={current && <Badge tone={PRIORITY_TONE[current.priority]}>{current.priority}</Badge>}
        subtitle={current && `${current.item.name} · ${current.item.path}`}
        footer={
          current && !excepted.has(current.id) ? (
            <>
              <ButtonV2 variant="dangerSecondary" startIcon={<XCircle size={16} />} disabled={isPastMonth || pendingByFinding.has(current.id)} onClick={() => setReject(current)}>
                Reject
              </ButtonV2>
              <div className="row-gap">
                <ButtonV2 variant="secondary" startIcon={<BellSimple size={16} />} disabled={isPastMonth} onClick={() => setNotify(current)}>
                  Notify
                </ButtonV2>
                <ButtonV2 startIcon={current.stage === 'Implemented' ? <CheckCircle size={16} /> : <ArrowRight size={16} />} disabled={isPastMonth || current.stage === 'Verified'} onClick={() => advance(current)}>
                  {current.stage === 'Verified' ? 'Verified' : `Mark as ${STAGES[STAGES.indexOf(current.stage) + 1]}`}
                </ButtonV2>
              </div>
            </>
          ) : undefined
        }
      >
        {current && (
          <div className="stack">
            <div>
              <div className="row-gap" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="f-typo f-typo--overline">Stage</span>
                <Pill tone={STAGE_TONE[current.stage]}>{current.stage}</Pill>
              </div>
              <Stepper total={STAGES.length} current={STAGES.indexOf(current.stage)} completed={current.stage === 'Verified'} />
              <div className="stage-labels">
                {STAGES.map(s => (
                  <span key={s} className={s === current.stage ? 'b' : 'muted'}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="kv-grid">
              <div>
                <span>Team score gain</span>
                <b className="pos">+{current.gain}</b>
              </div>
              <div>
                <span>Item points</span>
                <b>+{current.points}</b>
              </div>
              <div>
                <span>Effort</span>
                <b>{current.effort}</b>
              </div>
              <div>
                <span>SLA</span>
                <b>{current.sla}</b>
              </div>
              <div>
                <span>Owner</span>
                <b>{current.item.owner}</b>
              </div>
              <div>
                <span>Dimension</span>
                <b>
                  {current.dim} · {dimDef(current.item.pillar, current.dim).name}
                </b>
              </div>
            </div>
            <div>
              <div className="f-typo f-typo--overline" style={{ marginBottom: 6 }}>
                Failing check
              </div>
              <Card>
                <div className="b">{current.check}</div>
                <div className="muted sm" style={{ marginTop: 4 }}>
                  {current.evidence}
                </div>
                <div className="muted xs" style={{ marginTop: 8 }}>
                  Source: {checkSource(current.dim, Number(current.id.slice(-1)))}
                </div>
              </Card>
            </div>
            <Callout tone="brand" icon={<Lightning size={18} weight="fill" />} title="How to fix">
              {current.recommendation}. Once the change lands, the next nightly evidence run re-checks it and moves this item to <b>Verified</b> automatically.
            </Callout>
            <ButtonV2 variant="tertiary" endIcon={<ArrowRight size={16} />} onClick={() => navigate(`/item/${current.item.id}`)}>
              Open line-item breakdown
            </ButtonV2>
          </div>
        )}
      </SidePanel>

      {notify && <NotifyModal item={itemById(notify.item.id)!} findingId={notify.id} onClose={() => setNotify(null)} />}
      {reject && <RejectModal item={itemById(reject.item.id)!} findingId={reject.id} onClose={() => setReject(null)} />}
    </div>
  );
}
