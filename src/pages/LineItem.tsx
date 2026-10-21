import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BellSimple, CaretRight, CheckCircle, ClockCounterClockwise, Database, HourglassMedium, ShieldCheck, User, XCircle } from '@miq/fiber-ui/icons';
import { useGenie } from '../genie/GenieProvider';
import { Badge, ButtonV2, Card, Chip, DataTable, IconButton, InfoPopover, Pill, ProgressBar, ScoreRing, SegmentedControl } from '../fiber';
import { GenieIcon } from '../components/GenieIcon';
import type { Column } from '../fiber';
import { DIMS, checkSource, codalBand, dimScores, findingsFor, grade, itemById, itemScore, teamById, toneOf } from '../data/model';
import type { Finding, Result } from '../data/model';
import { useStore } from '../state/Store';
import { NotifyModal } from '../components/NotifyModal';
import { RejectModal } from '../components/RejectModal';
import { PillarInfo } from '../components/ScoreInfo';
import { PillarIcon, STAGE_TONE } from '../components/bits';

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
    { key: 'dim', header: 'Dim', width: 64, sortValue: f => f.dim, render: f => <span className="dim-letter">{f.dim}</span> },
    {
      key: 'check',
      header: 'Check',
      width: 300,
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
      width: 104,
      sortValue: f => f.result,
      render: f => (
        <Badge tone={excepted.has(f.id) ? 'neutral' : f.result === 'Fail' ? 'error' : f.result === 'Warn' ? 'warning' : 'success'}>{excepted.has(f.id) ? 'Excepted' : f.result}</Badge>
      ),
    },
    { key: 'points', header: 'Points', align: 'right', width: 96, sortValue: f => f.points, render: f => (f.points ? <b className={excepted.has(f.id) ? 'strike muted' : 'neg'}>−{f.points}</b> : <span className="muted">—</span>) },
    { key: 'rec', header: 'Recommendation', width: 360, render: f => <span className="sm">{f.recommendation}</span> },
    {
      key: 'state',
      header: 'State',
      width: 168,
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

      <Card className={`item-hero item-hero--${item.pillar.toLowerCase()}`}>
        <div className="item-hero__gauge">
          <ScoreRing value={adjusted} size={132} caption={false} />
          <span className="item-hero__gauge-label">Score {adjusted}</span>
        </div>
        <div className="item-hero__main">
          <span className="page-eyebrow">MiQ · {item.pillar} Resource</span>
          <div className="item-hero__title">
            <span className="item-hero__icon">
              <PillarIcon pillar={item.pillar} size={18} />
            </span>
            <h1 className="h1" title={item.name}>{item.name}</h1>
            {item.pillar === 'Data' && <Pill tone="brand">{codalBand(adjusted)}</Pill>}
          </div>
          <div className="item-hero__path" title={item.path}>
            {item.type} · {item.path}
          </div>
          <div className="item-hero__tags">
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
          <div className="item-hero__stats">
            <div>
              <span>Raw</span>
              <b>{raw}</b>
            </div>
            <div>
              <span>Adjusted</span>
              <b>{adjusted}</b>
            </div>
            <div>
              <span>Open Issues</span>
              <b>{all.filter(f => f.result !== 'Pass' && !excepted.has(f.id)).length}</b>
            </div>
          </div>
          <div className="item-hero__actions">
            <ButtonV2 variant="tertiary" startIcon={<GenieIcon size={16} />} onClick={() => askAbout({ kind: 'item', itemId: item.id }, 'Why is this score low?')}>
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

      <section className={`section item-breakdown item-hero--${item.pillar.toLowerCase()}`}>
      <div className="section-head">
        <h2 className="h2">
          {item.pillar} Breakdown
          <InfoPopover title="How This Score Is Calculated" width={420}>
            <PillarInfo pillar={item.pillar} />
          </InfoPopover>
        </h2>
        <p>Each dimension is weighted. Click one to filter the findings below.</p>
      </div>
      <div className="dim-grid" style={{ gridTemplateColumns: `repeat(${DIMS[item.pillar].length}, minmax(0, 1fr))` }}>
        {DIMS[item.pillar].map(d => {
          const s = dims[d.key];
          const open = all.filter(f => f.dim === d.key && f.result !== 'Pass' && !excepted.has(f.id)).length;
          return (
            <Card key={d.key} interactive selected={dim === d.key} onClick={() => setDim(x => (x === d.key ? null : d.key))} className="dim-card">
              <div className="dim-card__top">
                <span className="dim-letter dim-letter--lg">{d.key}</span>
                <span className="dim-card__name">{d.name}</span>
                <span className="dim-card__weight">{Math.round(d.weight * 100)}%</span>
              </div>
              <div className="dim-card__score">
                <b>{s ?? '—'}</b>
                {s != null && <Badge tone={toneOf(s)}>{grade(s)}</Badge>}
              </div>
              <ProgressBar value={s ?? 0} tone={s == null ? 'neutral' : toneOf(s)} />
              <div className="dim-card__foot">
                <b>{open ? `${open} Open Issue${open > 1 ? 's' : ''}` : 'No Open Issues'}</b>
                <span>{d.hint}</span>
              </div>
            </Card>
          );
        })}
      </div>
      </section>

      <Card padded={false}>
        <div className="table-head">
          <div className="table-head__title">
            <h2 className="h2">Findings</h2>
            {scoped.length > 0 && (
              <p className="table-head__meta">
                Evidence From {Array.from(new Set(scoped.map(f => checkSource(f.dim, 0, item, f)))).slice(0, 3).join(', ')}
              </p>
            )}
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
          <span className="h2">Exception History</span>
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
