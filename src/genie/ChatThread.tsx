import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowClockwise, Check, Code as CodeIcon, Copy, Database, LockKey, ThumbsDown, ThumbsUp } from '@miq/fiber-ui/icons';
import { ButtonV2, Chip, IconButton } from '../fiber';
import { GenieIcon } from '../components/GenieIcon';
import { useStore } from '../state/Store';
import { useGenie } from './GenieProvider';
import { SCOPES, contextLabel, suggestionsFor } from './engine';

export function GenieAvatar({ size = 28 }: { size?: number }) {
  return (
    <span className="genie-avatar" style={{ width: size, height: size }}>
      <GenieIcon size={Math.round(size * 0.62)} solid />
    </span>
  );
}

export function ChatThread({ fullscreen }: { fullscreen?: boolean }) {
  const { user, teamId } = useStore();
  const { messages, thinking, ask, regenerate, setFeedback, scope, setScope, context } = useGenie();
  const navigate = useNavigate();
  const [showSql, setShowSql] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastGenie = [...messages].reverse().find(m => m.role === 'genie')?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, thinking]);

  const toggleSql = (id: number) =>
    setShowSql(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const copy = (id: number, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(c => (c === id ? null : c)), 1500);
  };

  return (
    <div className={fullscreen ? 'thread thread--full' : 'thread'}>
      <div className="runs-as">
        <LockKey size={16} />
        <span>
          Runs as <b>{user.name}</b>. Genie only sees tables you can query in Unity Catalog.
        </span>
      </div>

      <div className="turn">
        <GenieAvatar />
        <div className="bubble bubble--genie">
          <div>
            Hi, I am <b>Scorecard Genie</b>. Ask me about <b>{contextLabel(context, teamId)}</b>: why a score moved, what to fix first, the evidence behind a finding, or exception status.
          </div>
          <div className="muted xs" style={{ margin: '10px 0 6px' }}>
            Pick a topic to focus answers
          </div>
          <div className="row-gap" style={{ flexWrap: 'wrap', gap: 6 }}>
            {SCOPES.map(s => (
              <Chip key={s.value} selected={scope === s.value} onClick={() => setScope(s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
          {messages.length === 0 && (
            <div className="suggest-grid">
              {suggestionsFor(context).map(s => (
                <button key={s} type="button" className="suggest" onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {messages.map(m =>
        m.role === 'user' ? (
          <div key={m.id} className="turn turn--user">
            <div className="bubble bubble--user">{m.text}</div>
            <span className="avatar avatar--sm" style={{ background: 'var(--f-brand-500)' }}>
              {user.initials}
            </span>
          </div>
        ) : (
          <div key={m.id} className="turn">
            <GenieAvatar />
            <div className="bubble bubble--genie">
              <div>{m.text}</div>
              {m.answer?.table && (
                <table className="mini-table">
                  <thead>
                    <tr>
                      {m.answer.table.head.map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {m.answer.table.rows.map((r, i) => (
                      <tr key={i}>
                        {r.map((c, j) => (
                          <td key={j}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {m.answer?.sql && showSql.has(m.id) && <pre className="sql">{m.answer.sql}</pre>}
              {m.answer?.sources && m.answer.sources.length > 0 && (
                <div className="sources">
                  <span className="muted xs">Sources</span>
                  {m.answer.sources.map(s => (
                    <span key={s} className="source">
                      <Database size={12} /> {s}
                    </span>
                  ))}
                </div>
              )}
              {(m.answer?.links || m.answer?.sql) && (
                <div className="row-gap" style={{ flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {m.answer?.sql && (
                    <ButtonV2 variant="tertiary" size="sm" startIcon={<CodeIcon size={14} />} onClick={() => toggleSql(m.id)}>
                      {showSql.has(m.id) ? 'Hide SQL' : 'Show SQL'}
                    </ButtonV2>
                  )}
                  {m.answer?.links?.map(l => (
                    <ButtonV2 key={l.to + l.label} variant="tertiary" size="sm" onClick={() => navigate(l.to)}>
                      {l.label}
                    </ButtonV2>
                  ))}
                </div>
              )}
              <div className="bubble__actions">
                <IconButton label={copied === m.id ? 'Copied' : 'Copy response'} size="sm" onClick={() => copy(m.id, m.text)}>
                  {copied === m.id ? <Check size={14} /> : <Copy size={14} />}
                </IconButton>
                <IconButton label="Good response" size="sm" active={m.feedback === 'up'} onClick={() => setFeedback(m.id, 'up')}>
                  <ThumbsUp size={14} weight={m.feedback === 'up' ? 'fill' : 'regular'} />
                </IconButton>
                <IconButton label="Bad response" size="sm" active={m.feedback === 'down'} onClick={() => setFeedback(m.id, 'down')}>
                  <ThumbsDown size={14} weight={m.feedback === 'down' ? 'fill' : 'regular'} />
                </IconButton>
                {m.id === lastGenie && (
                  <IconButton label="Regenerate" size="sm" disabled={thinking} onClick={() => regenerate(m.id)}>
                    <ArrowClockwise size={14} />
                  </IconButton>
                )}
              </div>
            </div>
          </div>
        ),
      )}

      {thinking && (
        <div className="turn">
          <GenieAvatar />
          <div className="bubble bubble--genie typing">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
