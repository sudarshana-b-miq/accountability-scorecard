import { useEffect, useState } from 'react';
import { Info, LockSimple, PaperPlaneTilt, ShieldCheck, XCircle } from '@miq/fiber-ui/icons';
import { Badge, ButtonV2, Callout, Dropdown, Field, Modal, SegmentedControl, Textarea } from '../fiber';
import { findingsFor } from '../data/model';
import type { Item } from '../data/model';
import { useStore } from '../state/Store';

const REASONS = [
  { value: 'False positive', label: 'False positive', description: 'The check is wrong for this asset' },
  { value: 'Not applicable', label: 'Not applicable', description: 'The rule does not apply here' },
  { value: 'Accepted risk', label: 'Accepted risk', description: 'Known and accepted by the team' },
  { value: 'Planned fix', label: 'Planned fix', description: 'Remediation already scheduled' },
];

const MIN = 20;

function expiry(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function RejectModal({ item, findingId, onClose }: { item: Item | null; findingId?: string; onClose: () => void }) {
  const { excepted, pendingByFinding, requestException } = useStore();
  const [finding, setFinding] = useState('');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [duration, setDuration] = useState<'30' | '90' | '180'>('90');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    setFinding(findingId ?? '');
    setReason('');
    setComment('');
    setDuration('90');
    setTried(false);
  }, [item, findingId]);

  if (!item) return null;
  const eligible = findingsFor(item).filter(f => f.result !== 'Pass' && !excepted.has(f.id) && !pendingByFinding.has(f.id));
  const selected = findingsFor(item).find(f => f.id === finding);
  const commentLen = comment.trim().length;
  const errors = {
    finding: !finding ? 'Choose the finding to reject.' : undefined,
    reason: !reason ? 'Choose a reason.' : undefined,
    comment: commentLen === 0 ? `A comment is required (minimum ${MIN} characters).` : commentLen < MIN ? `Add ${MIN - commentLen} more characters (minimum ${MIN}).` : undefined,
  };
  const valid = !errors.finding && !errors.reason && !errors.comment;

  const submit = () => {
    setTried(true);
    if (!valid) return;
    requestException({ findingId: finding, reason, comment: comment.trim(), durationDays: Number(duration) });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={<XCircle size={20} color="#DA294B" />}
      title="Reject finding"
      subtitle="Request an exception. A workspace admin has to approve it before the score changes."
      footerStart={
        <span className="muted sm row-gap">
          <LockSimple size={14} /> Visible to admins and the owner
        </span>
      }
      footer={
        <>
          <ButtonV2 variant="secondary" onClick={onClose}>
            Cancel
          </ButtonV2>
          <ButtonV2 startIcon={<PaperPlaneTilt size={16} />} onClick={submit} disabled={tried && !valid}>
            Send for approval
          </ButtonV2>
        </>
      }
    >
      {findingId && selected ? (
        <div className="summary-box">
          <span className="dim-letter">{selected.dim}</span>
          <div style={{ flex: 1 }}>
            <div className="b">{selected.check}</div>
            <div className="muted xs">
              {item.name} · {selected.evidence}
            </div>
          </div>
          <Badge tone="error" size="lg">
            −{selected.points} pts
          </Badge>
        </div>
      ) : (
        <Field label="Finding" required error={tried ? errors.finding : undefined}>
          <Dropdown
            value={finding}
            onChange={setFinding}
            placeholder={eligible.length ? 'Select a finding on this line item…' : 'No findings can be rejected'}
            disabled={!eligible.length}
            error={tried && !!errors.finding}
            options={eligible.map(f => ({ value: f.id, label: `${f.dim} · ${f.check}`, description: `${f.result} · −${f.points} pts · ${f.evidence}` }))}
          />
        </Field>
      )}

      <Field label="Reason" required error={tried ? errors.reason : undefined}>
        <Dropdown value={reason} onChange={setReason} placeholder="Select a reason…" error={tried && !!errors.reason} options={REASONS} />
      </Field>

      <Field label="Comment" required error={tried ? errors.comment : undefined} helper="Explain why this finding should not count" counter={`${comment.length}/500`}>
        <Textarea
          value={comment}
          maxLength={500}
          rows={4}
          error={tried && !!errors.comment}
          placeholder="For example: the table is being migrated to liquid clustering in DP-2231, due 30 Nov…"
          onChange={e => setComment(e.target.value)}
        />
      </Field>

      <Field label="Exception duration" required helper={`Expires ${expiry(Number(duration))}. The finding counts again after that.`}>
        <SegmentedControl
          value={duration}
          onChange={setDuration}
          options={[
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: '180', label: '180 days' },
          ]}
        />
      </Field>

      <Field label="Approver">
        <div className="summary-box" style={{ padding: '10px 12px' }}>
          <ShieldCheck size={18} />
          <span>
            Workspace admins · <b>eng-data-platform</b> (3 people)
          </span>
        </div>
      </Field>

      <Callout tone="info" icon={<Info size={18} weight="fill" />}>
        The raw score and evidence are kept. If approved, this finding is excluded from the <b>policy-adjusted</b> score only, and the audit trail records the approver, reason and expiry.
      </Callout>
    </Modal>
  );
}
