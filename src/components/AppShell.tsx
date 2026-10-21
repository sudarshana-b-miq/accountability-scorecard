import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BellRinging, ChartLineUp, CheckCircle, Question, ShieldCheck, XCircle } from '@miq/fiber-ui/icons';
import { ButtonV2, IconButton, Popover, Tabs, cx } from '../fiber';
import { useStore } from '../state/Store';
import { GenieDock } from '../genie/GenieDock';
import type { NoticeKind } from '../state/Store';

const NOTICE_ICON: Record<NoticeKind, { icon: React.ReactNode; tone: string }> = {
  approval: { icon: <ShieldCheck size={18} />, tone: 'brand' },
  sent: { icon: <BellRinging size={18} />, tone: 'info' },
  approved: { icon: <CheckCircle size={18} />, tone: 'success' },
  rejected: { icon: <XCircle size={18} />, tone: 'error' },
  published: { icon: <ChartLineUp size={18} />, tone: 'neutral' },
  refresh: { icon: <ChartLineUp size={18} />, tone: 'neutral' },
};

function NotificationsMenu() {
  const { notices, unread, markAllRead, markRead } = useStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'approvals'>('all');
  const navigate = useNavigate();
  const list = tab === 'all' ? notices : notices.filter(n => n.kind === 'approval');
  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align="end"
      width={420}
      anchor={
        <IconButton label="Notifications" inverse tooltipPlacement="bottom" active={open} counter={unread} onClick={() => setOpen(o => !o)}>
          <Bell size={20} />
        </IconButton>
      }
    >
      <div className="menu-head">
        <span className="b" style={{ fontSize: 16 }}>
          Notifications
        </span>
        <ButtonV2 variant="tertiary" size="sm" onClick={markAllRead} disabled={!unread}>
          Mark all as read
        </ButtonV2>
      </div>
      <div style={{ padding: '0 12px' }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: 'All', count: notices.length },
            { value: 'approvals', label: 'Approvals', count: notices.filter(n => n.kind === 'approval' && !n.read).length },
          ]}
        />
      </div>
      <div className="notice-list">
        {list.length === 0 && <div className="muted" style={{ padding: 24, textAlign: 'center' }}>Nothing here yet.</div>}
        {list.map(n => (
          <button
            key={n.id}
            type="button"
            className={cx('notice', !n.read && 'is-unread')}
            onClick={() => {
              markRead(n.id);
              setOpen(false);
              if (n.link) navigate(n.link);
            }}
          >
            <span className={`notice__icon tone-${NOTICE_ICON[n.kind].tone}`}>{NOTICE_ICON[n.kind].icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="notice__title">{n.title}</span>
              <span className="notice__body">{n.body}</span>
              <span className="notice__time">{n.time}</span>
            </span>
            {n.kind === 'approval' && !n.read && <span className="notice__cta">Review</span>}
            {!n.read && <span className="notice__dot" />}
          </button>
        ))}
      </div>
    </Popover>
  );
}

const NAV = [
  { label: 'Home', pillar: null },
  { label: 'Code', pillar: 'Code' },
  { label: 'Compute', pillar: 'Compute' },
  { label: 'Data', pillar: 'Data' },
];

export function AppShell() {
  const { user } = useStore();
  const { pathname, search } = useLocation();
  const activePillar = pathname === '/' ? new URLSearchParams(search).get('pillar') : undefined;
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand-lockup">
          <span className="brand-mark">MiQ</span>
          <span className="brand-divider" />
          <span className="brand-app">Accountability Scorecard</span>
        </Link>
        <nav className="app-nav">
          {NAV.map(n => {
            const active = activePillar !== undefined && activePillar === n.pillar;
            return (
              <Link key={n.label} to={n.pillar ? `/?pillar=${n.pillar}` : '/'} className={cx('app-nav__link', active && 'is-active')} aria-current={active ? 'page' : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="header-right">
          <NotificationsMenu />
          <IconButton label="Help and methodology" inverse tooltipPlacement="bottom">
            <Question size={18} />
          </IconButton>
          <span className="header-avatar" title={user.name}>
            {user.initials}
          </span>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <GenieDock />
    </div>
  );
}
