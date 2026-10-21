import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Info, PaperPlaneTilt, WarningCircle } from '@miq/fiber-ui/icons';
import type { Tone } from '../fiber';
import { MONTHS, TEAMS, findingById, itemById, replaceScorecardData, type LiveScorecard } from '../data/model';

export type Stage = 'Detected' | 'Notified' | 'Accepted' | 'Implemented' | 'Verified';
export const STAGES: Stage[] = ['Detected', 'Notified', 'Accepted', 'Implemented', 'Verified'];

export type ExceptionStatus = 'pending' | 'approved' | 'rejected';

export interface ExceptionRequest {
  id: string;
  itemId: string;
  findingId: string;
  reason: string;
  comment: string;
  durationDays: number;
  status: ExceptionStatus;
  requestedBy: string;
  requestedAt: string;
  decidedBy?: string;
  decidedAt?: string;
  adminComment?: string;
}

export type NoticeKind = 'approval' | 'sent' | 'approved' | 'rejected' | 'published' | 'refresh';

export interface Notice {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  time: string;
  read: boolean;
  link?: string;
}

interface ToastMsg {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
}

const CURRENT_USER = { name: 'sudarshana.b', initials: 'SB', isAdmin: true };

const SEED_EXCEPTIONS: ExceptionRequest[] = [
  {
    id: 'EXC-1039',
    itemId: 'ingest_raw_events',
    findingId: 'ingest_raw_events:L1',
    reason: 'Not applicable',
    comment: 'These S3 paths are vendor drop zones that are read once by Auto Loader. A UC external location is being set up by the platform team.',
    durationDays: 180,
    status: 'pending',
    requestedBy: 'arjun.n',
    requestedAt: '20 Oct 2026, 16:05',
  },
  {
    id: 'EXC-1037',
    itemId: 'core_audience_dim',
    findingId: 'core_audience_dim:C0',
    reason: 'False positive',
    comment: 'The flagged columns are vendor-supplied names we must keep for contract compatibility. They are aliased to snake_case in the gold view.',
    durationDays: 30,
    status: 'pending',
    requestedBy: 'li.wei',
    requestedAt: '19 Oct 2026, 11:20',
  },
  {
    id: 'EXC-1031',
    itemId: 'databricks_usage_cost_daily',
    findingId: 'databricks_usage_cost_daily:O0',
    reason: 'Planned fix',
    comment: 'Descriptions are being generated from the billing glossary in ticket DP-2190, due end of October.',
    durationDays: 90,
    status: 'approved',
    requestedBy: 'meera.r',
    requestedAt: '02 Oct 2026, 09:12',
    decidedBy: 'sudarshana.b',
    decidedAt: '03 Oct 2026, 10:40',
    adminComment: 'Approved for 90 days. Link DP-2190 when it closes.',
  },
  {
    id: 'EXC-1028',
    itemId: 'yahoo_campaigns',
    findingId: 'yahoo_campaigns:A0',
    reason: 'Accepted risk',
    comment: 'The column only contains hashed emails, so masking is not required.',
    durationDays: 90,
    status: 'rejected',
    requestedBy: 'rahul.k',
    requestedAt: '28 Sep 2026, 14:00',
    decidedBy: 'sudarshana.b',
    decidedAt: '29 Sep 2026, 09:30',
    adminComment: 'Hashed emails are still personal data under our policy. Please apply the standard mask.',
  },
];

const SEED_NOTICES: Notice[] = [
  { id: 'n1', kind: 'approval', title: 'EXC-1039 awaits your review', body: 'Upstream lineage on ingest_raw_events · requested by arjun.n', time: '18 h ago', read: false, link: '/admin?request=EXC-1039' },
  { id: 'n2', kind: 'approval', title: 'EXC-1037 awaits your review', body: 'Naming on core_audience_dim · requested by li.wei', time: '2 days ago', read: false, link: '/admin?request=EXC-1037' },
  { id: 'n3', kind: 'approved', title: 'Exception approved', body: 'Databricks_Usage_Cost_Daily · description finding excluded until 01 Jan 2027', time: '18 days ago', read: true, link: '/item/databricks_usage_cost_daily' },
  { id: 'n4', kind: 'published', title: 'September scorecard published', body: 'Monthly snapshot is locked and available for all teams', time: '01 Oct', read: true, link: '/' },
];

const SEED_STAGES: Record<string, Stage> = {
  'ani_daily_ingest_job:R0': 'Notified',
  'ani_reporting:S0': 'Accepted',
  'ani_shared_cluster:E0': 'Implemented',
  'denormalized_data:C0': 'Verified',
  'yahoo_campaigns:L0': 'Accepted',
  'client_reporting_data:O1': 'Notified',
  'core_models:S0': 'Notified',
};

interface StoreValue {
  user: typeof CURRENT_USER;
  teamId: string;
  setTeamId: (id: string) => void;
  monthId: string;
  setMonthId: (id: string) => void;
  month: (typeof MONTHS)[number];
  isPastMonth: boolean;
  exceptions: ExceptionRequest[];
  excepted: Set<string>;
  pendingByFinding: Map<string, ExceptionRequest>;
  notices: Notice[];
  unread: number;
  stages: Record<string, Stage>;
  stageOf: (findingId: string) => Stage;
  setStage: (findingId: string, stage: Stage) => void;
  requestException: (input: { findingId: string; reason: string; comment: string; durationDays: number }) => string;
  decideException: (id: string, status: 'approved' | 'rejected', adminComment: string) => void;
  sendNotification: (input: { itemId: string; findingIds: string[]; recipients: string[]; channels: string[] }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refreshing: boolean;
  refreshedAt: number;
  dataError?: string;
  refresh: () => void;
  toast: (t: Omit<ToastMsg, 'id'>) => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}

const nowLabel = () =>
  new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ',');

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [teamId, setTeamId] = useState('ani');
  const [monthId, setMonthId] = useState(MONTHS[0].id);
  const [exceptions, setExceptions] = useState<ExceptionRequest[]>(SEED_EXCEPTIONS);
  const [notices, setNotices] = useState<Notice[]>(SEED_NOTICES);
  const [stages, setStages] = useState<Record<string, Stage>>(SEED_STAGES);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(Date.now() - 2 * 3600 * 1000);
  const [dataError, setDataError] = useState<string>();
  const hasLiveData = useRef(false);
  const nextExc = useRef(1042);
  const nextId = useRef(1);

  const toast = useCallback((t: Omit<ToastMsg, 'id'>) => {
    const id = nextId.current++;
    setToasts(x => [...x, { ...t, id }]);
    window.setTimeout(() => setToasts(x => x.filter(y => y.id !== id)), 4500);
  }, []);

  const addNotice = useCallback((n: Omit<Notice, 'id' | 'time' | 'read'>) => {
    const id = `n${Date.now()}${nextId.current++}`;
    setNotices(x => [{ ...n, id, time: 'Just now', read: false }, ...x]);
  }, []);

  const excepted = useMemo(() => new Set(exceptions.filter(e => e.status === 'approved').map(e => e.findingId)), [exceptions]);
  const pendingByFinding = useMemo(() => new Map(exceptions.filter(e => e.status === 'pending').map(e => [e.findingId, e])), [exceptions]);
  const stageOf = useCallback((findingId: string) => stages[findingId] ?? 'Detected', [stages]);
  const setStage = useCallback((findingId: string, stage: Stage) => setStages(s => ({ ...s, [findingId]: stage })), []);

  const requestException: StoreValue['requestException'] = useCallback(
    ({ findingId, reason, comment, durationDays }) => {
      const id = `EXC-${nextExc.current++}`;
      const finding = findingById(findingId)!;
      const item = itemById(finding.itemId)!;
      setExceptions(x => [
        { id, itemId: item.id, findingId, reason, comment, durationDays, status: 'pending', requestedBy: CURRENT_USER.name, requestedAt: nowLabel() },
        ...x,
      ]);
      addNotice({ kind: 'approval', title: `${id} awaits your review`, body: `${finding.check} on ${item.name} · requested by ${CURRENT_USER.name}`, link: `/admin?request=${id}` });
      toast({ tone: 'info', title: `Sent for approval · ${id}`, body: 'Workspace admins have been notified. The score stays the same until a decision is made.' });
      return id;
    },
    [addNotice, toast],
  );

  const decideException: StoreValue['decideException'] = useCallback(
    (id, status, adminComment) => {
      const exc = exceptions.find(e => e.id === id);
      if (!exc) return;
      const item = itemById(exc.itemId)!;
      const finding = findingById(exc.findingId)!;
      setExceptions(x => x.map(e => (e.id === id ? { ...e, status, adminComment, decidedBy: CURRENT_USER.name, decidedAt: nowLabel() } : e)));
      addNotice({
        kind: status,
        title: status === 'approved' ? `Exception ${id} approved` : `Exception ${id} rejected`,
        body: `${item.name} · ${finding.check}${status === 'approved' ? ` · excluded for ${exc.durationDays} days` : ''}`,
        link: `/item/${item.id}`,
      });
      toast({
        tone: status === 'approved' ? 'success' : 'warning',
        title: status === 'approved' ? `${id} approved` : `${id} rejected`,
        body: status === 'approved' ? 'The policy-adjusted score is updated. The raw score and evidence are kept.' : `${exc.requestedBy} has been notified with your comment.`,
      });
    },
    [exceptions, addNotice, toast],
  );

  const sendNotification: StoreValue['sendNotification'] = useCallback(
    ({ itemId, findingIds, recipients, channels }) => {
      const item = itemById(itemId)!;
      setStages(s => {
        const next = { ...s };
        findingIds.forEach(f => {
          if (!next[f] || next[f] === 'Detected') next[f] = 'Notified';
        });
        return next;
      });
      const who = recipients.join(' and ');
      addNotice({
        kind: 'sent',
        title: 'Notification delivered',
        body: `${findingIds.length === 1 ? findingById(findingIds[0])?.check : `${findingIds.length} issues`} on ${item.name} sent to ${who} via ${channels.join(' and ')}`,
        link: `/item/${item.id}`,
      });
      toast({ tone: 'success', title: 'Notification sent', body: `${who} notified via ${channels.join(' and ')}.` });
    },
    [addNotice, toast],
  );

  const loadLiveData = useCallback(async (showSuccess: boolean) => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/scorecard', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Scorecard API returned ${response.status}`);
      const data = await response.json() as LiveScorecard;
      if (!data.teams.length) throw new Error('No active teams were returned');
      replaceScorecardData(data);
      setTeamId(current => TEAMS.some(team => team.id === current) ? current : data.teams[0].id);
      if (!hasLiveData.current) {
        setExceptions([]);
        setStages({});
        setNotices([]);
      }
      hasLiveData.current = true;
      setDataError(undefined);
      setRefreshedAt(data.refreshedAt || Date.now());
      if (showSuccess) {
        toast({ tone: 'success', title: 'Scores refreshed', body: 'Latest Databricks evidence has been loaded.' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load scorecard data';
      setDataError(message);
      if (showSuccess) {
        toast({ tone: 'error', title: 'Refresh failed', body: 'The last available scorecard remains visible.' });
      }
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadLiveData(false);
  }, [loadLiveData]);

  const refresh = useCallback(() => {
    void loadLiveData(true);
  }, [loadLiveData]);

  const month = MONTHS.find(m => m.id === monthId) ?? MONTHS[0];

  const value: StoreValue = {
    user: CURRENT_USER,
    teamId,
    setTeamId,
    monthId,
    setMonthId,
    month,
    isPastMonth: month.offset !== 0,
    exceptions,
    excepted,
    pendingByFinding,
    notices,
    unread: notices.filter(n => !n.read).length,
    stages,
    stageOf,
    setStage,
    requestException,
    decideException,
    sendNotification,
    markRead: id => setNotices(x => x.map(n => (n.id === id ? { ...n, read: true } : n))),
    markAllRead: () => setNotices(x => x.map(n => ({ ...n, read: true }))),
    refreshing,
    refreshedAt,
    dataError,
    refresh,
    toast,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="f-toast-stack" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`f-toast tone-${t.tone}`}>
            {t.tone === 'success' ? <CheckCircle size={20} weight="fill" /> : t.tone === 'warning' ? <WarningCircle size={20} weight="fill" /> : t.tone === 'info' ? <PaperPlaneTilt size={20} weight="fill" /> : <Info size={20} weight="fill" />}
            <div>
              <div className="f-toast__title">{t.title}</div>
              {t.body && <div className="f-toast__body">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
