import { useId } from 'react';

export function GenieIcon({ size = 18, solid }: { size?: number; solid?: boolean }) {
  const id = useId();
  const paint = solid ? 'currentColor' : `url(#${id})`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: 'none' }}>
      {!solid && (
        <defs>
          <linearGradient id={id} x1="2" y1="4" x2="22" y2="18" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4f5bea" />
            <stop offset="0.5" stopColor="#a54fd6" />
            <stop offset="1" stopColor="#f04e7d" />
          </linearGradient>
        </defs>
      )}
      <path d="M12 4.5c.4 2.3 1.2 3.1 3.5 3.5-2.3.4-3.1 1.2-3.5 3.5-.4-2.3-1.2-3.1-3.5-3.5 2.3-.4 3.1-1.2 3.5-3.5z" fill={paint} stroke={paint} strokeWidth="1" strokeLinejoin="round" />
      <path d="M2.5 14c0-2.2 2.6-2.6 3.6-.4 1.1 2.4 3.2 3.4 5.9 3.4s4.8-1.1 6-3.4c.6-1.1 1.7-1.7 3.5-1.6" stroke={paint} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 20.5h8" stroke={solid ? 'currentColor' : '#f04e7d'} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
