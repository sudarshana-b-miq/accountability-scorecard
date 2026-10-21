import { Link, Outlet, useLocation } from 'react-router-dom';
import { Question } from '@miq/fiber-ui/icons';
import { IconButton, cx } from '../fiber';
import { useStore } from '../state/Store';
import { GenieDock } from '../genie/GenieDock';

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
