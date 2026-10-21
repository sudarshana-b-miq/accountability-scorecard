import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle, HourglassMedium, Info, ShieldCheck, Warning, XCircle } from '@miq/fiber-ui/icons';
import { Badge, ButtonV2, Callout, Card, DataTable, Field, MetricsCard, Modal, Pill, SidePanel, Tabs, Textarea } from '../fiber';
import type { Column, Tone } from '../fiber';
import { checkSource, dimDef, findingById, itemById, itemScore, teamById, teamSummary } from '../data/model';
import { useStore } from '../state/Store';
import type { ExceptionRequest, ExceptionStatus } from '../state/Store';

type TabKey = 'pending' | 'approved' | 'rejected' | 'all';
const STATUS_TONE: Record<ExceptionStatus, Tone> = { pending: 'warning', approved: 'success', rejected: 'error' };

export function AdminReview() {
  const { exceptions, excepted, decideException, user } = useStore();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>('pending');
  const [adminComment, setAdminComment] = useState('');
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const selectedId = params.get('request');
  const current = exceptions.find(e => e.id === selectedId) ?? null;

  useEffect(() => {
    setAdminComment('');
    setTried(false);
    setConfirm(false);
    if (current && current.status !== 'pending') setTab(t => (t === 'pending' ? 'all' : t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const counts = {
    pending: exceptions.filter(e => e.status === 'pending').length,
    approved: exceptions.filter(e => e.status === 'approved').length,
    rejected: exceptions.filter(e => e.status === 'rejected').length,
    all: exceptions.length,
  };
  const rows = tab === 'all' ? exceptions : exceptions.filter(e => e.status === tab);

  const open = (id: string | null) => {
    if (id) setParams({ request: id });
    else setParams({});
  };

  const impact = useMemo(() => {
    if (!current) return null;
    const item = itemById(current.itemId)!;
    const finding = findingById(current.findingId)!;
    const without = new Set(excepted);
    without.delete(current.findingId);
    const withIt = new Set(without);
    withIt.add(current.findingId);
    return {
      item,
      finding,
      itemBefore: itemScore(item, without),
      itemAfter: itemScore(item, withIt),
      teamBefore: teamSummary(item.team, without).adjusted,
      teamAfter: teamSummary(item.team, withIt).adjusted,
    };
  }, [current, excepted]);

  const reject = () => {
    setTried(true);
    if (!current || adminComment.trim().length < 10) return;
    decideException(current.id, 'rejected', adminComment.trim());
    open(null);
  };
  const approve = () => {
    if (!current) return;
    decideException(current.id, 'approved', adminComment.trim() || 'Approved.');
    setConfirm(false);
    open(null);
  };

  const columns: Column<ExceptionRequest>[] = [
    { key: 'id', header: 'Request', width: 110, sortValue: e => e.id, render: e => <b>{e.id}</b> },
    {
      key: 'finding',
      header: 'Finding',
      render: e => {
        const f = findingById(e.findingId);
        const i = itemById(e.itemId);
        return (
          <div>
            <div className="b">{f?.check}</div>
            <div className="muted xs">
              {i?.name} · {i && teamById(i.team).short}
            </div>
          </div>
        );
      },
    },
    { key: 'reason', header: 'Reason', sortValue: e => e.reason, render: e => <Pill tone="neutral">{e.reason}</Pill> },
    { key: 'impact', header: 'Impact', align: 'right', sortValue: e => findingById(e.findingId)?.points ?? 0, render: e => <b className="pos">+{findingById(e.findingId)?.points}</b> },
    { key: 'by', header: 'Requested by', sortValue: e => e.requestedBy, render: e => <span className="muted">{e.requestedBy}</span> },
    { key: 'at', header: 'Requested', render: e => <span className="muted">{e.requestedAt}</span> },
    { key: 'duration', header: 'Duration', render: e => <span className="muted">{e.durationDays} days</span> },
    { key: 'status', header: 'Status', sortValue: e => e.status, render: e => <Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge> },
    {
      key: 'act',
      header: '',
      align: 'right',
      render: e => (
        <ButtonV2 size="sm" variant={e.status === 'pending' ? 'primary' : 'secondary'} onClick={ev => { ev.stopPropagation(); open(e.id); }}>
          {e.status === 'pending' ? 'Review' : 'View'}
        </ButtonV2>
      ),
    },
  ];

  const commentErr = tried && adminComment.trim().length < 10 ? 'A comment of at least 10 characters is required to reject.' : undefined;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="h1">Admin review</h1>
          <div className="muted">
            Approve or reject exception requests. Approved exceptions only change the policy-adjusted score. Signed in as <b>{user.name}</b> (workspace admin).
          </div>
        </div>
      </div>

      <div className="admin-cards">
        <MetricsCard icon={<HourglassMedium size={18} />} title="Pending" value={counts.pending} footer={<span>Oldest waiting 2 days</span>} onClick={() => setTab('pending')} selected={tab === 'pending'} />
        <MetricsCard icon={<CheckCircle size={18} />} title="Approved" value={counts.approved} footer={<span>Active exceptions</span>} onClick={() => setTab('approved')} selected={tab === 'approved'} />
        <MetricsCard icon={<XCircle size={18} />} title="Rejected" value={counts.rejected} footer={<span>Requesters notified</span>} onClick={() => setTab('rejected')} selected={tab === 'rejected'} />
        <MetricsCard icon={<ShieldCheck size={18} />} title="Median decision time" value="22" suffix="hours" footer={<span>Target under 48 hours</span>} />
      </div>

      <Card padded={false}>
        <div className="table-head">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'pending', label: 'Pending', count: counts.pending },
              { value: 'approved', label: 'Approved', count: counts.approved },
              { value: 'rejected', label: 'Rejected', count: counts.rejected },
              { value: 'all', label: 'All', count: counts.all },
            ]}
          />
        </div>
        <DataTable columns={columns} rows={rows} rowKey={e => e.id} onRowClick={e => open(e.id)} selectedKey={selectedId} emptyText="No requests here. You are all caught up." />
      </Card>

      <SidePanel
        open={!!current && !!impact}
        onClose={() => open(null)}
        width={600}
        title={current ? `${current.id} · Exception request` : ''}
        headerExtra={current && <Badge tone={STATUS_TONE[current.status]}>{current.status}</Badge>}
        subtitle={impact && `${impact.item.name} · ${teamById(impact.item.team).name}`}
        footer={
          current?.status === 'pending' ? (
            <>
              <ButtonV2 variant="secondary" onClick={() => open(null)}>
                Cancel
              </ButtonV2>
              <div className="row-gap">
                <ButtonV2 variant="dangerSecondary" startIcon={<XCircle size={16} />} onClick={reject}>
                  Reject request
                </ButtonV2>
                <ButtonV2 startIcon={<CheckCircle size={16} />} onClick={() => setConfirm(true)}>
                  Approve
                </ButtonV2>
              </div>
            </>
          ) : (
            <>
              <span />
              <ButtonV2 variant="secondary" endIcon={<ArrowRight size={16} />} onClick={() => impact && navigate(`/item/${impact.item.id}`)}>
                Open line item
              </ButtonV2>
            </>
          )
        }
      >
        {current && impact && (
          <div className="stack">
            <Card>
              <div className="row-gap" style={{ justifyContent: 'space-between' }}>
                <div className="row-gap">
                  <span className="dim-letter">{impact.finding.dim}</span>
                  <div>
                    <div className="b">{impact.finding.check}</div>
                    <div className="muted xs">{dimDef(impact.item.pillar, impact.finding.dim).name}</div>
                  </div>
                </div>
                <Badge tone="error" size="lg">
                  −{impact.finding.points} pts
                </Badge>
              </div>
              <div className="evidence">
                <span className="muted xs">Evidence</span>
                <div>{impact.finding.evidence}</div>
                <span className="muted xs">Source: {checkSource(impact.finding.dim, Number(impact.finding.id.slice(-1)))}</span>
              </div>
            </Card>

            <div>
              <div className="f-typo f-typo--overline" style={{ marginBottom: 6 }}>
                Requester's comment
              </div>
              <div className="comment">
                <div className="row-gap" style={{ marginBottom: 6 }}>
                  <span className="avatar avatar--sm">{current.requestedBy.slice(0, 2).toUpperCase()}</span>
                  <b>{current.requestedBy}</b>
                  <span className="muted xs">{current.requestedAt}</span>
                  <Pill tone="neutral">{current.reason}</Pill>
                </div>
                {current.comment}
              </div>
            </div>

            <div>
              <div className="f-typo f-typo--overline" style={{ marginBottom: 6 }}>
                Score impact if approved
              </div>
              <div className="impact">
                <div>
                  <span className="muted xs">Line item</span>
                  <div className="impact__val">
                    {impact.itemBefore} <ArrowRight size={14} /> <b className="pos">{impact.itemAfter}</b>
                  </div>
                </div>
                <div>
                  <span className="muted xs">Team (adjusted)</span>
                  <div className="impact__val">
                    {impact.teamBefore} <ArrowRight size={14} /> <b className="pos">{impact.teamAfter}</b>
                  </div>
                </div>
                <div>
                  <span className="muted xs">Duration</span>
                  <div className="impact__val">{current.durationDays} days</div>
                </div>
              </div>
              <div className="muted xs" style={{ marginTop: 6 }}>
                The raw score stays at {itemScore(impact.item)}. Evidence is retained for audit.
              </div>
            </div>

            {current.status === 'pending' ? (
              <>
                <Field label="Admin comment" helper="Required when rejecting, optional when approving" error={commentErr} counter={`${adminComment.length}/500`}>
                  <Textarea value={adminComment} maxLength={500} rows={3} error={!!commentErr} placeholder="Add context for the requester…" onChange={e => setAdminComment(e.target.value)} />
                </Field>
                {impact.finding.dim === 'S' && (
                  <Callout tone="warning" icon={<Warning size={18} weight="fill" />} title="Security finding">
                    Exceptions on secrets need a security sign-off in addition to admin approval.
                  </Callout>
                )}
              </>
            ) : (
              <Callout tone={current.status === 'approved' ? 'success' : 'error'} icon={current.status === 'approved' ? <CheckCircle size={18} weight="fill" /> : <XCircle size={18} weight="fill" />} title={`${current.status === 'approved' ? 'Approved' : 'Rejected'} by ${current.decidedBy}`}>
                {current.adminComment}
              </Callout>
            )}

            <div>
              <div className="f-typo f-typo--overline" style={{ marginBottom: 6 }}>
                Audit trail
              </div>
              <div className="timeline">
                <div className="timeline__row">
                  <span className="timeline__dot tone-info">
                    <Info size={14} weight="fill" />
                  </span>
                  <div className="sm">
                    <b>{current.requestedBy}</b> requested an exception · <span className="muted">{current.requestedAt}</span>
                  </div>
                </div>
                <div className="timeline__row">
                  <span className="timeline__dot tone-brand">
                    <ShieldCheck size={14} weight="fill" />
                  </span>
                  <div className="sm">Workspace admins notified (eng-data-platform)</div>
                </div>
                {current.decidedBy && (
                  <div className="timeline__row">
                    <span className={`timeline__dot tone-${STATUS_TONE[current.status]}`}>
                      {current.status === 'approved' ? <CheckCircle size={14} weight="fill" /> : <XCircle size={14} weight="fill" />}
                    </span>
                    <div className="sm">
                      <b>{current.decidedBy}</b> {current.status} the request · <span className="muted">{current.decidedAt}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SidePanel>

      <Modal
        open={confirm && !!current}
        onClose={() => setConfirm(false)}
        size="small"
        icon={<ShieldCheck size={20} />}
        title={`Approve ${current?.id}?`}
        footer={
          <>
            <ButtonV2 variant="secondary" onClick={() => setConfirm(false)}>
              Cancel
            </ButtonV2>
            <ButtonV2 startIcon={<CheckCircle size={16} />} onClick={approve}>
              Approve exception
            </ButtonV2>
          </>
        }
      >
        {impact && current && (
          <p style={{ margin: 0 }}>
            <b>{impact.finding.check}</b> on <b>{impact.item.name}</b> will be excluded from the policy-adjusted score for {current.durationDays} days. The team score moves from {impact.teamBefore} to{' '}
            <b className="pos">{impact.teamAfter}</b>.
          </p>
        )}
      </Modal>
    </div>
  );
}
