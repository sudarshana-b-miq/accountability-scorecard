import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowsOutSimple, CaretDown, ChatCircleText, Trash, X } from '@miq/fiber-ui/icons';
import { AIPrompt, IconButton, useClickOutside } from '../fiber';
import { GenieIcon } from '../components/GenieIcon';
import { useStore } from '../state/Store';
import { useGenie } from './GenieProvider';
import { ChatThread, GenieAvatar } from './ChatThread';
import { contextLabel } from './engine';

export function GenieDock() {
  const { teamId } = useStore();
  const { open, setOpen, messages, thinking, ask, stop, clear, context, setContext, focusTick } = useGenie();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, open, () => setOpen(false));

  useEffect(() => {
    const match = pathname.match(/^\/item\/(.+)$/);
    if (match) setContext({ kind: 'item', itemId: decodeURIComponent(match[1]) });
    else if (context.kind === 'item' && pathname !== '/genie') setContext({ kind: 'team' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (focusTick) ref.current?.querySelector('textarea')?.focus();
  }, [focusTick]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (pathname === '/genie') return null;
  const label = contextLabel(context, teamId);

  return (
    <div className="genie-dock" ref={ref} onFocusCapture={() => messages.length > 0 && setOpen(true)}>
      {open && (
        <div className="genie-dock__panel" role="dialog" aria-label="Scorecard Genie">
          <div className="genie-dock__head">
            <GenieAvatar size={30} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="b">Scorecard Genie</div>
              <div className="muted xs">Databricks AI/BI Genie · scorecard space</div>
            </div>
            <IconButton label="Clear conversation" size="sm" onClick={clear} disabled={!messages.length}>
              <Trash size={18} />
            </IconButton>
            <IconButton
              label="Open full screen"
              size="sm"
              onClick={() => {
                setOpen(false);
                navigate('/genie');
              }}
            >
              <ArrowsOutSimple size={18} />
            </IconButton>
            <IconButton label="Minimise" size="sm" onClick={() => setOpen(false)}>
              <CaretDown size={18} />
            </IconButton>
          </div>
          <div className="genie-dock__body">
            <ChatThread />
          </div>
        </div>
      )}

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
          <span className="ctx-chip" title="Genie answers in this context">
            <GenieIcon size={13} solid />
            {label}
            {context.kind !== 'team' && !pathname.startsWith('/item/') && (
              <button type="button" aria-label="Reset context" onClick={() => setContext({ kind: 'team' })}>
                <X size={10} weight="bold" />
              </button>
            )}
          </span>
        }
        bottomRightSlot={state => (
          <>
            {!state.isEmpty && (
              <IconButton label="Clear" size="sm" onClick={() => setInput('')}>
                <X size={16} />
              </IconButton>
            )}
            <IconButton label={open ? 'Hide conversation' : 'Show conversation'} size="sm" active={open} onClick={() => setOpen(!open)}>
              <ChatCircleText size={16} />
            </IconButton>
          </>
        )}
      />
    </div>
  );
}
