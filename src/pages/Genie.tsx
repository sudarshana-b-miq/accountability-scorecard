import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowSquareOut, Sparkle, Trash, X } from '@miq/fiber-ui/icons';
import { AIPrompt, Badge, ButtonV2, Card, IconButton, ScoreRing } from '../fiber';
import { grade, itemScore, itemsForTeam, teamById, teamSummary, toneOf } from '../data/model';
import type { Pillar } from '../data/model';
import { useStore } from '../state/Store';
import { Toolbar } from '../components/Toolbar';
import { PillarIcon, ScoreCell } from '../components/bits';
import { useGenie } from '../genie/GenieProvider';
import { ChatThread, GenieAvatar } from '../genie/ChatThread';
import { contextLabel } from '../genie/engine';

export function Genie() {
  const { teamId, excepted, month } = useStore();
  const { messages, thinking, ask, stop, clear, context, setContext, askAbout } = useGenie();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const team = teamById(teamId);
  const items = itemsForTeam(teamId);
  const summary = teamSummary(teamId, excepted, month.offset);
  const label = contextLabel(context, teamId);

  return (
    <div className="page">
      <Toolbar compact />
      <div className="genie">
        <Card padded={false} className="genie__chat">
          <div className="genie__head">
            <GenieAvatar size={32} />
            <div style={{ flex: 1 }}>
              <div className="b">Scorecard Genie</div>
              <div className="muted xs">Databricks AI/BI Genie · scorecard space</div>
            </div>
            <IconButton label="Clear conversation" size="sm" onClick={clear} disabled={!messages.length}>
              <Trash size={18} />
            </IconButton>
            <IconButton label="Open in Databricks" size="sm">
              <ArrowSquareOut size={18} />
            </IconButton>
          </div>
          <div className="genie__body">
            <ChatThread fullscreen />
          </div>
          <div className="genie__foot">
            <AIPrompt
              value={input}
              onChange={setInput}
              onSubmit={q => {
                ask(q);
                setInput('');
              }}
              isLoading={thinking}
              onStop={stop}
              placeholder={`Ask Genie about ${label}…`}
              bottomLeftSlot={
                <span className="ctx-chip">
                  <Sparkle size={12} weight="fill" />
                  {label}
                  {context.kind !== 'team' && (
                    <button type="button" aria-label="Reset context" onClick={() => setContext({ kind: 'team' })}>
                      <X size={10} weight="bold" />
                    </button>
                  )}
                </span>
              }
            />
          </div>
        </Card>

        <div className="genie__side">
          <Card className="row-gap" style={{ gap: 20 }}>
            <ScoreRing value={summary.adjusted} size={132} caption={false} />
            <div>
              <div className="muted sm">{team.name}</div>
              <div className="h1" style={{ margin: '2px 0 6px' }}>
                {summary.adjusted}
                <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}>
                  /100
                </span>
              </div>
              <Badge tone={toneOf(summary.adjusted)} size="lg">
                Score {summary.adjusted}
              </Badge>
            </div>
          </Card>
          <div className="muted xs">Click a card or line item to ask Genie about it directly.</div>
          <div className="pillar-mini">
            {(['Code', 'Compute', 'Data'] as Pillar[]).map(p => (
              <Card key={p} interactive selected={context.kind === 'pillar' && context.pillar === p} onClick={() => askAbout({ kind: 'pillar', pillar: p })}>
                <div className="row-gap muted sm">
                  <PillarIcon pillar={p} /> {p}
                </div>
                <div className="h2" style={{ margin: '6px 0' }}>
                  {summary.pillars[p].adjusted}
                </div>
                <Badge tone={toneOf(summary.pillars[p].adjusted)}>{grade(summary.pillars[p].adjusted)}</Badge>
              </Card>
            ))}
          </div>
          <Card padded={false}>
            <div className="table-head" style={{ paddingBottom: 8 }}>
              <span className="h2">Line items</span>
              <ButtonV2 variant="tertiary" size="sm" onClick={() => navigate('/')}>
                View all
              </ButtonV2>
            </div>
            {[...items]
              .sort((a, b) => itemScore(a, excepted, month.offset) - itemScore(b, excepted, month.offset))
              .map(i => (
                <button
                  key={i.id}
                  type="button"
                  className={context.kind === 'item' && context.itemId === i.id ? 'list-row is-selected' : 'list-row'}
                  onClick={() => askAbout({ kind: 'item', itemId: i.id })}
                >
                  <PillarIcon pillar={i.pillar} />
                  <span className="list-row__name">{i.name}</span>
                  <ScoreCell score={itemScore(i, excepted, month.offset)} width={150} />
                </button>
              ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
