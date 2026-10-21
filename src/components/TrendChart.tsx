import type { Pillar } from '../data/model';

export type TrendPoint = { label: string; values: Record<Pillar, number> };

const PILLARS: { key: Pillar; label: string; color: string }[] = [
  { key: 'Code', label: 'Code', color: '#7c33b5' },
  { key: 'Compute', label: 'Compute', color: '#d71982' },
  { key: 'Data', label: 'Data', color: '#ff540c' },
];

const W = 960;
const H = 188;
const PAD = { top: 16, right: 48, bottom: 32, left: 40 };

export function TrendChart({ points }: { points: TrendPoint[] }) {
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length < 2 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / 100) * innerH;
  const last = points.length - 1;

  return (
    <>
      <svg className="trend-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Team pillar scores by month">
        {[0, 25, 50, 75, 100].map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="trend-chart__grid" />
            <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" className="trend-chart__axis">
              {v}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <text key={p.label} x={x(i)} y={H - 8} textAnchor="middle" className="trend-chart__axis">
            {p.label}
          </text>
        ))}
        {PILLARS.map((s, seriesIndex) => {
          const rawY = y(points[last].values[s.key]);
          const earlier = PILLARS.slice(0, seriesIndex).map(other => y(points[last].values[other.key]));
          const labelY = earlier.reduce((next, used) => (Math.abs(used - next) < 16 ? used + 16 : next), rawY);
          return (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" points={points.map((p, i) => `${x(i)},${y(p.values[s.key])}`).join(' ')} />
              {points.map((p, i) => (
                <circle key={p.label} cx={x(i)} cy={y(p.values[s.key])} r={i === last ? 4.5 : 3} fill={i === last ? s.color : '#fff'} stroke={s.color} strokeWidth={2}>
                  <title>{`${s.label} · ${p.label}: ${p.values[s.key]}`}</title>
                </circle>
              ))}
              <text x={x(last) + 10} y={labelY + 4} className="trend-chart__end" fill={s.color}>
                {points[last].values[s.key]}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {PILLARS.map(s => (
          <span key={s.key} className="legend-item">
            <span className="pillar-dot" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </>
  );
}
