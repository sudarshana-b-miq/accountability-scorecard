import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStore } from '../state/Store';
import { answerFor } from './engine';
import type { Answer, GenieContext, GenieScope } from './engine';

export interface GenieMessage {
  id: number;
  role: 'user' | 'genie';
  text: string;
  answer?: Answer;
  feedback?: 'up' | 'down';
}

interface GenieValue {
  messages: GenieMessage[];
  thinking: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  context: GenieContext;
  setContext: (context: GenieContext) => void;
  scope: GenieScope;
  setScope: (scope: GenieScope) => void;
  ask: (question: string) => void;
  stop: () => void;
  regenerate: (messageId: number) => void;
  setFeedback: (messageId: number, feedback: 'up' | 'down') => void;
  clear: () => void;
  focusTick: number;
  askAbout: (context: GenieContext, question?: string) => void;
}

const Ctx = createContext<GenieValue | null>(null);

export function useGenie() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGenie must be used inside GenieProvider');
  return v;
}

export function GenieProvider({ children }: { children: React.ReactNode }) {
  const { teamId, excepted, month, exceptions } = useStore();
  const [messages, setMessages] = useState<GenieMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<GenieContext>({ kind: 'team' });
  const [scope, setScope] = useState<GenieScope>('generic');
  const [focusTick, setFocusTick] = useState(0);
  const nextId = useRef(1);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setMessages([]);
    setContext({ kind: 'team' });
  }, [teamId]);

  const respond = useCallback(
    (question: string, ctx: GenieContext, onDone: (answer: Answer) => void) => {
      setThinking(true);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        setThinking(false);
        onDone(answerFor({ question, teamId, excepted, offset: month.offset, monthId: month.id, monthLabel: month.label, exceptions, context: ctx, scope }));
      }, 900);
    },
    [teamId, excepted, month, exceptions, scope],
  );

  const ask = useCallback(
    (question: string, ctx: GenieContext = context) => {
      const text = question.trim();
      if (!text || thinking) return;
      setOpen(true);
      setMessages(m => [...m, { id: nextId.current++, role: 'user', text }]);
      respond(text, ctx, answer => setMessages(m => [...m, { id: nextId.current++, role: 'genie', text: answer.text, answer }]));
    },
    [context, thinking, respond],
  );

  const stop = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    setThinking(false);
    setMessages(m => [...m, { id: nextId.current++, role: 'genie', text: 'Stopped. Ask again when you are ready.' }]);
  }, []);

  const regenerate = useCallback(
    (messageId: number) => {
      const idx = messages.findIndex(m => m.id === messageId);
      const question = [...messages.slice(0, idx)].reverse().find(m => m.role === 'user')?.text;
      if (!question || thinking) return;
      setMessages(m => m.filter(x => x.id !== messageId));
      respond(question, context, answer => setMessages(m => [...m, { id: nextId.current++, role: 'genie', text: answer.text, answer }]));
    },
    [messages, thinking, context, respond],
  );

  const askAbout = useCallback(
    (ctx: GenieContext, question?: string) => {
      setContext(ctx);
      setOpen(true);
      setFocusTick(t => t + 1);
      if (question) ask(question, ctx);
    },
    [ask],
  );

  const value: GenieValue = {
    messages,
    thinking,
    open,
    setOpen,
    context,
    setContext,
    scope,
    setScope,
    ask: q => ask(q),
    stop,
    regenerate,
    setFeedback: (id, feedback) => setMessages(m => m.map(x => (x.id === id ? { ...x, feedback } : x))),
    clear: () => setMessages([]),
    focusTick,
    askAbout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
