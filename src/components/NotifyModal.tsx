import { useEffect, useState } from 'react';
import { BellRinging, Clock, EnvelopeSimple, PaperPlaneTilt, SlackLogo } from '@miq/fiber-ui/icons';
import { Badge, ButtonV2, Checkbox, Dropdown, Field, Modal, Radio, Textarea } from '../fiber';
import { findingsFor, grade, itemScore, teamById, toneOf } from '../data/model';
import type { Item } from '../data/model';
import { useStore } from '../state/Store';

export function NotifyModal({ item, findingId, onClose }: { item: Item | null; findingId?: string; onClose: () => void }) {
  const { excepted, sendNotification } = useStore();
  const open = item ? findingsFor(item).filter(f => f.result !== 'Pass' && !excepted.has(f.id)) : [];
  const [scope, setScope] = useState<'all' | 'one'>('all');
  const [issue, setIssue] = useState('');
  const [owner, setOwner] = useState(true);
  const [team, setTeam] = useState(true);
  const [slack, setSlack] = useState(true);
  const [email, setEmail] = useState(true);
  const [message, setMessage] = useState('');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!item) return;
    setScope(findingId ? 'one' : 'all');
    setIssue(findingId ?? '');
    setOwner(true);
    setTeam(!findingId);
    setSlack(true);
    setEmail(true);
    setTried(false);
    const score = itemScore(item, excepted);
    const top = findingsFor(item).filter(f => f.result !== 'Pass').slice(0, 2);
    const one = findingId ? findingsFor(item).find(f => f.id === findingId) : undefined;
    setMessage(
      one
        ? `Hi ${item.owner}, the check "${one.check}" is failing on ${item.name} (−${one.points} pts). Evidence: ${one.evidence}. Suggested fix: ${one.recommendation}.`
        : `Hi ${item.owner}, ${item.name} scored ${score} (${grade(score)}) in this month's scorecard. The biggest wins are: ${top.map(f => `${f.recommendation.toLowerCase()} (+${f.points})`).join(' and ')}. The full breakdown is linked below.`,
    );
  }, [item, findingId, excepted]);

  if (!item) return null;
  const score = itemScore(item, excepted);
  const recipients = [owner && item.owner, team && teamById(item.team).channel].filter(Boolean) as string[];
  const channels = [slack && 'Slack', email && 'email'].filter(Boolean) as string[];
  const issueMissing = scope === 'one' && !issue;
  const valid = recipients.length > 0 && channels.length > 0 && !issueMissing && message.trim().length > 0;

  const submit = () => {
    setTried(true);
    if (!valid) return;
    sendNotification({ itemId: item.id, findingIds: scope === 'all' ? open.map(f => f.id) : [issue], recipients, channels });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={<BellRinging size={20} />}
      title="Send notification"
      subtitle="Notify the owner or the team. The recommendation moves to the “Notified” stage."
      footerStart={
        <span className="muted sm row-gap">
          <Clock size={14} /> Reminder in 7 days if there is no response
        </span>
      }
      footer={
        <>
          <ButtonV2 variant="secondary" onClick={onClose}>
            Cancel
          </ButtonV2>
          <ButtonV2 startIcon={<PaperPlaneTilt size={16} />} onClick={submit}>
            Send notification
          </ButtonV2>
        </>
      }
    >
      <div className="summary-box">
        <Badge tone={toneOf(score)} size="lg">
          {score} · {grade(score)}
        </Badge>
        <div>
          <div className="b">{item.name}</div>
          <div className="muted xs">
            {item.path} · {open.length} open issues
          </div>
        </div>
      </div>

      <Field label="What to send" required error={tried && issueMissing ? 'Choose the issue to send.' : undefined}>
        <div className="row-gap" style={{ gap: 20 }}>
          <Radio checked={scope === 'all'} onChange={() => setScope('all')} label={`All open issues (${open.length})`} />
          <Radio checked={scope === 'one'} onChange={() => setScope('one')} label="A specific issue" />
        </div>
        {scope === 'one' && (
          <Dropdown
            value={issue}
            onChange={setIssue}
            placeholder="Select an issue…"
            error={tried && issueMissing}
            options={open.map(f => ({ value: f.id, label: f.check, description: `${f.result} · −${f.points} pts · ${f.evidence}` }))}
          />
        )}
      </Field>

      <Field label="Send to" required error={tried && recipients.length === 0 ? 'Choose at least one recipient.' : undefined}>
        <div className="grid-2">
          <Checkbox card checked={owner} onChange={setOwner} label="Owner" description={`${item.owner}@miqdigital.com`} />
          <Checkbox card checked={team} onChange={setTeam} label="Team" description={`${teamById(item.team).short} · ${teamById(item.team).channel}`} />
        </div>
      </Field>

      <Field label="Channel" required error={tried && channels.length === 0 ? 'Choose at least one channel.' : undefined}>
        <div className="row-gap" style={{ gap: 24 }}>
          <Checkbox checked={slack} onChange={setSlack} label={<span className="row-gap"><SlackLogo size={16} /> Slack</span>} />
          <Checkbox checked={email} onChange={setEmail} label={<span className="row-gap"><EnvelopeSimple size={16} /> Email</span>} />
        </div>
      </Field>

      <Field label="Message" helper="A link to the breakdown and the recommendations is added automatically" counter={`${message.length}/1000`}>
        <Textarea value={message} maxLength={1000} onChange={e => setMessage(e.target.value)} rows={4} />
      </Field>
    </Modal>
  );
}
