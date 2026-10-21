import { useEffect, useState } from 'react';
import { grade } from '../data/model';

const LABELS: Record<string, string> = {
  A: 'Undefeated',
  B: 'Victory lap',
  C: 'This is fine',
  D: 'Still looking',
  E: 'Send help',
};

function Face({ letter }: { letter: string }) {
  if (letter === 'A') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="60" cy="70" r="30" fill="#1e8158" stroke="#241428" strokeWidth="3" />
          <path d="M40 52l5-12 7 8 8-14 8 14 7-8 5 12z" fill="#f8c500" stroke="#241428" strokeWidth="3" strokeLinejoin="round" />
          <path d="M46 80c5 8 23 8 28 0" fill="none" stroke="#f4fff8" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__prop">
          <rect x="40" y="60" width="16" height="11" rx="3" fill="#241428" />
          <rect x="64" y="60" width="16" height="11" rx="3" fill="#241428" />
          <path d="M56 65h8" stroke="#241428" strokeWidth="3" />
          <path d="M36 64h4M80 64h4" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle className="score-sticker__spark" style={{ '--x': '-26px', '--y': '-20px' } as React.CSSProperties} cx="60" cy="68" r="4" fill="#d71982" />
        <rect className="score-sticker__spark" style={{ '--x': '26px', '--y': '-16px' } as React.CSSProperties} x="56" y="64" width="8" height="8" fill="#7c33b5" />
        <circle className="score-sticker__spark" style={{ '--x': '22px', '--y': '18px' } as React.CSSProperties} cx="60" cy="68" r="3" fill="#f8c500" />
      </>
    );
  }
  if (letter === 'B') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="58" cy="72" r="30" fill="#62c47a" stroke="#241428" strokeWidth="3" />
          <circle cx="48" cy="68" r="3.2" fill="#115639" />
          <circle cx="68" cy="68" r="3.2" fill="#115639" />
          <path d="M46 80c2 8 8 12 12 12s10-4 12-12c-6 4-18 4-24 0z" fill="#115639" />
        </g>
        <g className="score-sticker__prop">
          <path d="M44 50l14-20 14 20z" fill="#d71982" stroke="#241428" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="58" cy="28" r="4" fill="#f8c500" stroke="#241428" strokeWidth="2" />
        </g>
        <g className="score-sticker__extra">
          <path d="M90 86c10-2 16-12 14-22" fill="none" stroke="#1f7a45" strokeWidth="4" strokeLinecap="round" />
          <path d="M96 58l8 8 8-6" fill="none" stroke="#1f7a45" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </>
    );
  }
  if (letter === 'C') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="52" cy="72" r="30" fill="#f8c500" stroke="#241428" strokeWidth="3" />
          <path d="M40 62c2-4 6-4 8 0M58 62c2-4 6-4 8 0" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
          <path d="M42 82h20" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__prop">
          <circle cx="44" cy="70" r="7" fill="none" stroke="#241428" strokeWidth="3" />
          <circle cx="62" cy="70" r="7" fill="none" stroke="#241428" strokeWidth="3" />
          <path d="M51 70h4" stroke="#241428" strokeWidth="3" />
        </g>
        <g className="score-sticker__extra">
          <path d="M96 88V70" stroke="#7c33b5" strokeWidth="4" strokeLinecap="round" />
          <path d="M88 70h16l-2 16H90z" fill="#fff" stroke="#241428" strokeWidth="3" />
          <path d="M94 62c0-6 4-6 4 0M102 60c0-8 4-6 4 2" fill="none" stroke="#7c33b5" strokeWidth="3" strokeLinecap="round" />
        </g>
      </>
    );
  }
  if (letter === 'D') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="54" cy="74" r="30" fill="#ef8736" stroke="#241428" strokeWidth="3" />
          <path d="M40 64l8 4M66 64l-8 4" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
          <circle cx="46" cy="72" r="3" fill="#241428" />
          <circle cx="64" cy="72" r="3" fill="#241428" />
          <path d="M44 86c4-6 16-6 20 0" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__prop">
          <circle cx="86" cy="52" r="12" fill="#fff6ee" stroke="#241428" strokeWidth="3" />
          <path d="M94 60l12 14" stroke="#241428" strokeWidth="5" strokeLinecap="round" />
        </g>
        <circle className="score-sticker__extra" cx="78" cy="58" r="4" fill="#7ec8f0" stroke="#241428" strokeWidth="2" />
      </>
    );
  }
  return (
    <>
      <g className="score-sticker__buddy">
        <circle cx="52" cy="74" r="30" fill="#da294b" stroke="#241428" strokeWidth="3" />
        <circle cx="42" cy="70" r="4" fill="#fff5f7" />
        <circle cx="64" cy="70" r="4" fill="#fff5f7" />
        <circle cx="42" cy="71" r="2" fill="#241428" />
        <circle cx="64" cy="71" r="2" fill="#241428" />
        <path d="M42 86c4-6 16-6 20 0" fill="none" stroke="#fff5f7" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="score-sticker__prop">
        <path d="M88 90V58" stroke="#241428" strokeWidth="4" strokeLinecap="round" />
        <path d="M88 58h22l-4 14H88z" fill="#fff" stroke="#241428" strokeWidth="3" strokeLinejoin="round" />
      </g>
    </>
  );
}

export function ScoreSticker({ score }: { score: number }) {
  const letter = grade(score);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    setPlaying(true);
    const timer = window.setTimeout(() => setPlaying(false), 1150);
    return () => window.clearTimeout(timer);
  }, [letter]);

  return (
    <span className={`score-sticker score-sticker--${letter.toLowerCase()}${playing ? ' is-playing' : ''}`} title={LABELS[letter]}>
      <svg viewBox="0 0 120 120" role="img" aria-label={`${LABELS[letter]}, grade ${letter}`}>
        <Face letter={letter} />
      </svg>
    </span>
  );
}
