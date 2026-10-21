import { useEffect, useState } from 'react';
import { ArrowsClockwise, ClockCounterClockwise, DownloadSimple, LockSimple, UsersThree } from '@miq/fiber-ui/icons';
import { ButtonV2, Dropdown, IconButton, Pill } from '../fiber';
import { GenieIcon } from './GenieIcon';
import { teamFilterOptions } from '../data/model';
import { useStore } from '../state/Store';
import { useGenie } from '../genie/GenieProvider';

function ago(ts: number) {
  if (!ts) return 'never';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export function Toolbar({ compact, children }: { compact?: boolean; children?: React.ReactNode }) {
  const { teamId, setTeamId, month, isPastMonth, refresh, refreshing, refreshedAt, toast } = useStore();
  const { askAbout } = useGenie();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick(x => x + 1), 30000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="toolbar">
      <div className="row-gap" style={{ gap: 10 }}>
        <Dropdown
          value={teamId}
          onChange={setTeamId}
          label="Team"
          icon={<UsersThree size={16} />}
          width={compact ? 200 : 280}
          options={teamFilterOptions(compact)}
        />
        {isPastMonth ? (
          <Pill tone="warning" icon={<ClockCounterClockwise size={14} />}>
            Past snapshot · read only
          </Pill>
        ) : (
          !compact && (
            <Pill tone="neutral" icon={<LockSimple size={14} />}>
              Monthly snapshot · published {month.published}
            </Pill>
          )
        )}
        {children}
      </div>
      <div className="row-gap" style={{ gap: 10 }}>
        <span className="muted sm">Refreshed {ago(refreshedAt)}</span>
        <IconButton label={refreshing ? 'Refreshing…' : 'Refresh scores'} outlined onClick={refresh} disabled={refreshing}>
          <ArrowsClockwise size={18} className={refreshing ? 'spin' : undefined} />
        </IconButton>
        {!compact && (
          <>
            <ButtonV2 variant="secondary" startIcon={<DownloadSimple size={16} />} onClick={() => toast({ tone: 'success', title: 'Export ready', body: 'scorecard.csv has been downloaded.' })}>
              Export
            </ButtonV2>
            <ButtonV2 startIcon={<GenieIcon size={16} solid />} onClick={() => askAbout({ kind: 'team' })}>
              Ask Genie
            </ButtonV2>
          </>
        )}
      </div>
    </div>
  );
}
