import { Code, Cpu, Database } from '@miq/fiber-ui/icons';
import { Badge, Pill, ProgressBar } from '../fiber';
import type { Tone } from '../fiber';
import { grade, toneOf, findingsFor } from '../data/model';
import type { Item, Pillar } from '../data/model';
import type { ExceptionRequest, Stage } from '../state/Store';

export function PillarIcon({ pillar, size = 16 }: { pillar: Pillar; size?: number }) {
  if (pillar === 'Code') return <Code size={size} />;
  if (pillar === 'Compute') return <Cpu size={size} />;
  return <Database size={size} />;
}

export function ScoreCell({ score, width = 160, compact, layout = 'default' }: { score: number; width?: number; compact?: boolean; layout?: 'default' | 'bar' }) {
  const letter = grade(score);
  const tone = toneOf(score);
  if (layout === 'bar' || compact) {
    return (
      <div className={`score-bar tone-${tone}`} style={layout === 'bar' ? { width } : undefined}>
        <span className="score-bar__val">{score}</span>
        <span className="score-bar__track">
          <ProgressBar value={score} tone={tone} />
        </span>
        <span className="score-bar__grade">{letter}</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width }}>
      <Badge tone={tone} size="lg">
        {letter}
      </Badge>
      <ProgressBar value={score} tone={tone} />
      <span className="muted sm" style={{ width: 24, fontVariantNumeric: 'tabular-nums' }}>
        {score}
      </span>
    </div>
  );
}

export function PillarPill({ pillar }: { pillar: Pillar }) {
  return (
    <span className={`pillar-pill pillar-pill--${pillar.toLowerCase()}`}>
      <PillarIcon pillar={pillar} size={14} />
      {pillar}
    </span>
  );
}

export function GradeBadge({ score, size = 'lg' }: { score: number; size?: 'md' | 'lg' }) {
  return (
    <Badge tone={toneOf(score)} size={size}>
      Score {score}
    </Badge>
  );
}

export const STAGE_TONE: Record<Stage, Tone> = {
  Detected: 'error',
  Notified: 'info',
  Accepted: 'warning',
  Implemented: 'brand',
  Verified: 'success',
};

export function itemStatus(item: Item, stageOf: (id: string) => Stage, excepted: Set<string>, pending: Map<string, ExceptionRequest>): { label: string; tone: Tone } {
  const open = findingsFor(item).filter(f => f.result !== 'Pass' && !excepted.has(f.id));
  if (open.some(f => pending.has(f.id))) return { label: 'Exception pending', tone: 'warning' };
  if (open.length === 0) return { label: 'Clean', tone: 'success' };
  const order: Stage[] = ['Detected', 'Notified', 'Accepted', 'Implemented', 'Verified'];
  const lowest = open.map(f => stageOf(f.id)).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0];
  return { label: lowest === 'Detected' ? 'Open' : lowest, tone: STAGE_TONE[lowest] };
}

export function StatusPill({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Pill tone={tone} outlined>
      {label}
    </Pill>
  );
}

export function Section({ title, children, right }: { title: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="f-typo f-typo--overline">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}
