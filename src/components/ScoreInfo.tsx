import { Warning } from '@miq/fiber-ui/icons';
import { Badge } from '../fiber';
import { DIMS, PILLAR_WEIGHTS } from '../data/model';
import type { Pillar } from '../data/model';

const bands: Array<[string, string, 'success' | 'info' | 'warning' | 'error']> = [
  ['A', '90–100', 'success'],
  ['B', '75–89', 'success'],
  ['C', '60–74', 'info'],
  ['D', '40–59', 'warning'],
  ['E', '0–39', 'error'],
];

function Formula({ children }: { children: React.ReactNode }) {
  return <div className="formula">{children}</div>;
}

export function CompositeInfo() {
  return (
    <div className="info-pop">
      <div className="info-pop__title">How the overall score is calculated</div>
      <p className="info-pop__lead">A monthly, evidence-based grade of how well a team builds code, runs compute and governs data. Every point traces back to a Databricks system table.</p>
      <div className="info-pop__label">Team composite</div>
      <Formula>Score = 25% Code + 25% Compute + 50% Data</Formula>
      <p className="info-pop__lead">
        The number is the policy-adjusted overall score for the selected team and monthly snapshot. Each pillar is scored from 0–100, then multiplied by its weight above.
      </p>
      <div className="info-pop__label">Grade bands</div>
      <div className="bands">
        {bands.map(([g, r, t]) => (
          <Badge key={g} tone={t}>
            {g} · {r}
          </Badge>
        ))}
      </div>
      <div className="info-pop__label">Hard gates cap the grade</div>
      <ul className="info-pop__list">
        <li><Warning size={14} weight="fill" color="#DA294B" /> Secret open beyond SLA → max <b>D</b></li>
        <li><Warning size={14} weight="fill" color="#8D6F00" /> Budget overrun, chronic failing jobs, or most assets below Documented → max <b>C</b></li>
      </ul>
      <div className="info-pop__label">Raw vs policy-adjusted</div>
      <p className="info-pop__lead" style={{ margin: 0 }}>The raw score never changes. Admin-approved exceptions only affect the policy-adjusted score, and only until they expire.</p>
      <div className="info-pop__label">How to use it</div>
      <p className="info-pop__lead" style={{ margin: 0 }}>Start with the lowest pillar, then open the lowest-scoring resources. Open issues show the failed checks contributing to each score; Alert sends the responsible owner the evidence and suggested action.</p>
      <div className="info-pop__foot">Sources: system.access · system.lakeflow · system.compute · system.billing · information_schema</div>
    </div>
  );
}

const PILLAR_TEXT: Record<Pillar, string> = {
  Code: 'Scans notebooks and repos for secrets, quality issues, hygiene and vulnerable dependencies.',
  Compute: 'Looks at job reliability, idle or oversized clusters, cost governance and platform hygiene.',
  Data: 'Grades every Unity Catalog asset the team owns for catalog quality, ownership and governance.',
};

const PILLAR_DETAIL: Record<Pillar, { card: string; action: string; source: string }> = {
  Code: {
    card: 'Secrets is the total open secret findings, High risk is the urgent subset, and Notebooks is the number of affected notebooks.',
    action: 'Remove or rotate exposed credentials first, then resolve high-risk findings and bring affected notebooks back into compliant repositories.',
    source: 'accountability_code_summary · accountability_code_findings',
  },
  Compute: {
    card: 'Success is the completed-run success rate, Spend is current-window cost, and Past SLA counts chronically failing jobs that remain unresolved.',
    action: 'Prioritise jobs past SLA, then inspect repeated failures, oversized compute and spend changes against the prior window.',
    source: 'accountability_compute_summary · long_failing_jobs_inventory · system.billing',
  },
  Data: {
    card: 'Assets is the owned Unity Catalog estate, Governed is the count meeting the governed band, and No docs counts assets missing useful descriptions.',
    action: 'Document undocumented assets first, then fix ownership, tags, access controls, lineage and lifecycle gaps shown in the resource breakdown.',
    source: 'accountability_data_summary · accountability_codal_asset_scores · information_schema',
  },
};

export function PillarInfo({ pillar }: { pillar: Pillar }) {
  return (
    <div className="info-pop">
      <div className="info-pop__title">
        {pillar} score
      </div>
      <p className="info-pop__lead">{PILLAR_TEXT[pillar]} Worth {PILLAR_WEIGHTS[pillar] * 100}% of the team score.</p>
      <div className="info-pop__label">What the card shows</div>
      <p className="info-pop__lead">{PILLAR_DETAIL[pillar].card}</p>
      <div className="info-pop__label">Dimensions and weights</div>
      <div className="dim-list">
        {DIMS[pillar].map(d => (
          <div key={d.key} className="dim-list__row">
            <span className="dim-letter">{d.key}</span>
            <span style={{ flex: 1 }}>
              <b>{d.name}</b>
              <span className="muted"> · {d.hint}</span>
            </span>
            <span className="muted">{Math.round(d.weight * 100)}%</span>
          </div>
        ))}
      </div>
      <p className="info-pop__lead" style={{ marginTop: 10, marginBottom: 0 }}>
        The pillar score is the average of the line items below.
        {pillar === 'Data' && ' Bands: Published 0–39, Documented 40–59, Governed 60–79, Catalog-grade 80–100.'}
      </p>
      <div className="info-pop__label">Recommended next step</div>
      <p className="info-pop__lead" style={{ margin: 0 }}>{PILLAR_DETAIL[pillar].action}</p>
      <div className="info-pop__foot">Sources: {PILLAR_DETAIL[pillar].source}</div>
    </div>
  );
}
