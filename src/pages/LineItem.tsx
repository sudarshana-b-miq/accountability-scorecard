import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BellSimple, CaretRight, CheckCircle, ClockCounterClockwise, Database, HourglassMedium, ShieldCheck, Sparkle, User, XCircle } from '@miq/fiber-ui/icons';
import { useGenie } from '../genie/GenieProvider';
import { Badge, ButtonV2, Card, Chip, DataTable, IconButton, InfoPopover, Pill, ProgressBar, ScoreRing, SegmentedControl } from '../fiber';
import type { Column } from '../fiber';
import { DIMS, checkSource, codalBand, dimScores, findingsFor, grade, itemById, itemScore, teamById, toneOf } from '../data/model';
import type { Finding, Result } from '../data/model';
import { useStore } from '../state/Store';
import { NotifyModal } from '../components/NotifyModal';
import { RejectModal } from '../components/RejectModal';
import { PillarInfo } from '../components/ScoreInfo';
import { GradeBadge, PillarIcon, STAGE_TONE } from '../components/bits';

type ResultFilter = 'All' | Result;

export function LineItem() {
  const { id = '' } = useParams();
  const item = itemById(id);
  const navigate = useNavigate();
  const { askAbout } = useGenie();
  const { excepted, pendingByFinding, exceptions, stageOf, month, isPastMonth } = useStore();
  const [dim, setDim] = useState<string | null>(null);
  const [result, setResult] = useState<ResultFilter>('All');
  const [notify, setNotify] = useState<{ findingId?: string } | null>(null);
  const [reject, setReject] = useState<{ findingId?: string } | null>(null);

  if (!item) {
    return (
      <div className="page">
        <Card>
          <div className="h2">Line item not found</div>
          <p className="muted">It may have been removed from this month's snapshot.</p>
          <ButtonV2 variant="secondary" onClick={() => navigate('/')}>
            Back to scorecard
          </ButtonV2>
        </Card>
      </div>
    );
  }

  const raw = itemScore(item, new Set(), month.offset);
  const adjusted = itemScore(item, excepted, month.offset);
  const dims = dimScores(item, excepted);
  const all = findingsFor(item);
  const scoped = all.filter(f => !dim || f.dim === dim);
  const counts = { All: scoped.length, Fail: scoped.filter(f => f.result === 'Fail').length, Warn: scoped.filter(f => f.result === 'Warn').length, Pass: scoped.filter(f => f.result === 'Pass').length };
  const rows = scoped.filter(f => result === 'All' || f.result === result);
  const history = exceptions.filter(e => e.itemId === item.id);
  const team = teamById(item.team);

  const columns: Column<Finding>[] = [
    { key: 'dim', header: 'Dim', width: 56, sortValue: f => f.dim, render: f => <span className="dim-letter">{f.dim}</span> },
    {
      key: 'check',
      header: 'Check',
      sortValue: f => f.check,
      render: f => (
        <div>
          <div className="b">{f.check}</div>
          <div className="muted xs">{f.evidence}</div>
        </div>
      ),
    },
    {
      key: 'result',
      header: 'Result',
      sortValue: f => f.result,
      render: f => (
        <Badge tone={excepted.has(f.id) ? 'neutral' : f.result === 'Fail' ? 'error' : f.result === 'Warn' ? 'warning' : 'success'}>{excepted.has(f.id) ? 'Excepted' : f.result}</Badge>
      ),
    },
    { key: 'points', header: 'Dimension pts', align: 'right', sortValue: f => f.points, render: f => (f.points ? <b className={excepted.has(f.id) ? 'strike muted' : 'neg'}>−{f.points}</b> : <span className="muted">—</span>) },
    { key: 'rec', header: 'Recommendation', render: f => <span className="sm">{f.recommendation}</span> },
    {
      key: 'state',
      header: 'State',
      render: f => {
        if (f.result === 'Pass') return <span className="muted">—</span>;
        if (excepted.has(f.id)) return <Pill tone="success" icon={<ShieldCheck size={14} />}>Exception approved</Pill>;
        const p = pendingByFinding.get(f.id);
        if (p) return <Pill tone="warning" icon={<HourglassMedium size={14} />}>{p.id} pending</Pill>;
        return <Pill tone={STAGE_TONE[stageOf(f.id)]}>{stageOf(f.id)}</Pill>;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: 96,
      render: f =>
        f.result === 'Pass' || excepted.has(f.id) ? null : (
          <div className="row-actions">
            <IconButton label="Notify about this issue" size="sm" disabled={isPastMonth} onClick={() => setNotify({ findingId: f.id })}>
              <BellSimple size={18} />
            </IconButton>
            <IconButton label={pendingByFinding.has(f.id) ? 'Exception already requested' : 'Reject this finding'} size="sm" tone="error" disabled={isPastMonth || pendingByFinding.has(f.id)} onClick={() => setReject({ findingId: f.id })}>
              <XCircle size={18} />
            </IconButton>
          </div>
        ),
    },
  ];

  return (
    <div className="page">
      <div className="crumbs">
        <Link to="/">
          <ArrowLeft size={14} /> Scorecard
        </Link>
        <CaretRight size={12} />
        <span>{team.short}</span>
        <CaretRight size={12} />
        <span className="b">{item.name}</span>
      </div>

      <Card className="item-hero">
        <ScoreRing value={adjusted} tone={toneOf(adjusted)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-gap" style={{ flexWrap: 'wrap' }}>
            <span className="item-hero__icon">
              <PillarIcon pillar={item.pillar} size={18} />
            </span>
            <h1 className="h1" style={{ margin: 0 }}>
              {item.name}
            </h1>
            <GradeBadge score={adjusted} />
            {item.pillar === 'Data' && <Pill tone="brand">{codalBand(adjusted)}</Pill>}
          </div>
          <div className="muted" style={{ margin: '6px 0 12px' }}>
            {item.type} · {item.path}
          </div>
          <div className="row-gap" style={{ flexWrap: 'wrap' }}>
            <Pill tone="neutral" icon={<User size={14} />}>
              {item.owner}
            </Pill>
            <Pill tone="neutral" icon={<Database size={14} />}>
              {team.short}
            </Pill>
            {item.meta?.map(m => (
              <Pill key={m} tone="neutral">
                {m}
              </Pill>
            ))}
          </div>
        </div>
        <div className="item-hero__side">
          <div className="raw-adj">
            <div>
              <span className="muted xs">Raw</span>
              <b>{raw}</b>
            </div>
            <div>
              <span className="muted xs">Adjusted</span>
              <b>{adjusted}</b>
            </div>
          </div>
          <div className="row-gap">
            <ButtonV2 variant="tertiary" startIcon={<Sparkle size={16} weight="fill" />} onClick={() => askAbout({ kind: 'item', itemId: item.id }, 'Why is this score low?')}>
              Ask Genie
            </ButtonV2>
            <ButtonV2 variant="secondary" startIcon={<BellSimple size={16} />} disabled={isPastMonth} onClick={() => setNotify({})}>
              Notify
            </ButtonV2>
            <ButtonV2 variant="dangerSecondary" startIcon={<XCircle size={16} />} disabled={isPastMonth} onClick={() => setReject({})}>
              Reject finding
            </ButtonV2>
          </div>
        </div>
      </Card>

      <div className="section-title">
        <span className="h2">{item.pillar} breakdown</span>
        <InfoPopover title="How this score is calculated" width={420}>
          <PillarInfo pillar={item.pillar} />
        </InfoPopover>
        <span className="muted sm">Click a dimension to filter the findings</span>
      </div>
      <div className="dim-grid" style={{ gridTemplateColumns: `repeat(${DIMS[item.pillar].length}, 1fr)` }}>
        {DIMS[item.pillar].map(d => {
          const s = dims[d.key];
          const open = all.filter(f => f.dim === d.key && f.result !== 'Pass' && !excepted.has(f.id)).length;
          return (
            <Card key={d.key} interactive selected={dim === d.key} onClick={() => setDim(x => (x === d.key ? null : d.key))} className="dim-card">
              <div className="row-gap" style={{ justifyContent: 'space-between' }}>
                <span className="dim-letter dim-letter--lg">{d.key}</span>
                <span className="muted xs">{Math.round(d.weight * 100)}%</span>
              </div>
              <div className="dim-card__name">{d.name}</div>
              <div className="dim-card__score">
                <b>{s}</b>
                <Badge tone={toneOf(s)}>{grade(s)}</Badge>
              </div>
              <ProgressBar value={s} tone={toneOf(s)} />
              <div className="muted xs" style={{ marginTop: 8 }}>
                {open ? `${open} open issue${open > 1 ? 's' : ''}` : 'No open issues'} · {d.hint}
              </div>
            </Card>
          );
        })}
      </div>

      <Card padded={false}>
        <div className="table-head">
          <div>
            <div className="h2">Findings</div>
            <div className="muted sm">
              Evidence from {Array.from(new Set(all.filter(f => !dim || f.dim === dim).map(f => checkSource(f.dim, 0, item, f)))).slice(0, 3).join(', ')}
            </div>
          </div>
          <div className="row-gap">
            {dim && (
              <Chip selected onClick={() => setDim(null)}>
                Dimension {dim} ✕
              </Chip>
            )}
            <SegmentedControl
              value={result}
              onChange={setResult}
              options={(['All', 'Fail', 'Warn', 'Pass'] as ResultFilter[]).map(r => ({ value: r, label: r, count: counts[r] }))}
            />
          </div>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={f => f.id} mutedKeys={excepted} defaultSort={{ key: 'points', dir: 'desc' }} emptyText="No findings match this filter." />
      </Card>

      <Card>
        <div className="row-gap" style={{ marginBottom: 12 }}>
          <ClockCounterClockwise size={18} />
          <span className="h2">Exception history</span>
        </div>
        {history.length === 0 ? (
          <div className="muted">No exceptions have been requested for this line item.</div>
        ) : (
          <div className="timeline">
            {history.map(e => {
              const f = all.find(x => x.id === e.findingId);
              return (
                <div key={e.id} className="timeline__row">
                  <span className={`timeline__dot tone-${e.status === 'approved' ? 'success' : e.status === 'rejected' ? 'error' : 'warning'}`}>
                    {e.status === 'approved' ? <CheckCircle size={14} weight="fill" /> : e.status === 'rejected' ? <XCircle size={14} weight="fill" /> : <HourglassMedium size={14} weight="fill" />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="row-gap" style={{ flexWrap: 'wrap' }}>
                      <b>{e.id}</b>
                      <span>· {f?.check}</span>
                      <Badge tone={e.status === 'approved' ? 'success' : e.status === 'rejected' ? 'error' : 'warning'}>{e.status}</Badge>
                    </div>
                    <div className="muted sm">
                      {e.reason} · requested by {e.requestedBy} on {e.requestedAt}
                      {e.decidedBy && ` · ${e.status} by ${e.decidedBy} on ${e.decidedAt}`}
                    </div>
                    <div className="quote">“{e.comment}”</div>
                    {e.adminComment && <div className="quote quote--admin">Admin: “{e.adminComment}”</div>}
                  </div>
                  {e.status === 'pending' && (
                    <ButtonV2 variant="tertiary" size="sm" onClick={() => navigate(`/admin?request=${e.id}`)}>
                      Review
                    </ButtonV2>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {notify && <NotifyModal item={item} findingId={notify.findingId} onClose={() => setNotify(null)} />}
      {reject && <RejectModal item={item} findingId={reject.findingId} onClose={() => setReject(null)} />}
    </div>
  );
}
