import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Question } from '@miq/fiber-ui/icons';
import { IconButton, Popover, cx } from '../fiber';
import { useStore } from '../state/Store';
import { GenieDock } from '../genie/GenieDock';
import { HelpInfo } from './ScoreInfo';

const NAV = [
  { label: 'Home', to: '/' },
  { label: 'Code', to: '/code' },
  { label: 'Compute', to: '/compute' },
  { label: 'Data', to: '/data' },
];

function HelpMenu() {
  const [open, setOpen] = useState(false);
  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align="end"
      width={440}
      anchor={
        <IconButton label="Help" inverse tooltipPlacement="bottom" active={open} onClick={() => setOpen(current => !current)}>
          <Question size={18} />
        </IconButton>
      }
    >
      <HelpInfo />
    </Popover>
  );
}

export function AppShell() {
  const { user } = useStore();
  const { pathname } = useLocation();
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
            const active = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to);
            return (
              <Link key={n.label} to={n.to} className={cx('app-nav__link', active && 'is-active')} aria-current={active ? 'page' : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="header-right">
          <HelpMenu />
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
