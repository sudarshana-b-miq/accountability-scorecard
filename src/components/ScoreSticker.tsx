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
          <circle cx="60" cy="62" r="26" fill="#1e8158" stroke="#241428" strokeWidth="3" />
          <path d="M42 46l4-10 6 7 8-12 8 12 6-7 4 10z" fill="#f8c500" stroke="#241428" strokeWidth="3" strokeLinejoin="round" />
          <path d="M48 72c4 7 20 7 24 0" fill="none" stroke="#f4fff8" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__prop">
          <rect x="44" y="54" width="14" height="10" rx="3" fill="#241428" />
          <rect x="62" y="54" width="14" height="10" rx="3" fill="#241428" />
          <path d="M58 59h4" stroke="#241428" strokeWidth="3" />
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
          <circle cx="60" cy="64" r="26" fill="#62c47a" stroke="#241428" strokeWidth="3" />
          <circle cx="51" cy="60" r="3" fill="#115639" />
          <circle cx="69" cy="60" r="3" fill="#115639" />
          <path d="M50 72c2 7 7 10 10 10s8-3 10-10c-5 3-15 3-20 0z" fill="#115639" />
        </g>
        <g className="score-sticker__prop">
          <path d="M46 46l14-16 14 16z" fill="#d71982" stroke="#241428" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="60" cy="28" r="3.5" fill="#f8c500" stroke="#241428" strokeWidth="2" />
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
          <circle cx="60" cy="62" r="26" fill="#f8c500" stroke="#241428" strokeWidth="3" />
          <path d="M46 52c2-4 6-4 8 0M66 52c2-4 6-4 8 0" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
          <path d="M50 74h20" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__prop">
          <circle cx="52" cy="62" r="6.5" fill="none" stroke="#241428" strokeWidth="3" />
          <circle cx="68" cy="62" r="6.5" fill="none" stroke="#241428" strokeWidth="3" />
          <path d="M58.5 62h3" stroke="#241428" strokeWidth="3" />
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
          <circle cx="56" cy="64" r="26" fill="#ef8736" stroke="#241428" strokeWidth="3" />
          <path d="M42 54l8 4M64 54l-8 4" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="62" r="2.6" fill="#241428" />
          <circle cx="64" cy="62" r="2.6" fill="#241428" />
          <path d="M46 76c4-5 14-5 18 0" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__prop">
          <circle cx="82" cy="46" r="10" fill="#fff6ee" stroke="#241428" strokeWidth="3" />
          <path d="M89 53l10 12" stroke="#241428" strokeWidth="4" strokeLinecap="round" />
        </g>
        <circle className="score-sticker__extra" cx="74" cy="50" r="3.5" fill="#7ec8f0" stroke="#241428" strokeWidth="2" />
      </>
    );
  }
  return (
    <>
      <g className="score-sticker__buddy">
        <circle cx="54" cy="64" r="26" fill="#da294b" stroke="#241428" strokeWidth="3" />
        <circle cx="46" cy="60" r="3.4" fill="#fff5f7" />
        <circle cx="64" cy="60" r="3.4" fill="#fff5f7" />
        <circle cx="46" cy="61" r="1.6" fill="#241428" />
        <circle cx="64" cy="61" r="1.6" fill="#241428" />
        <path d="M44 74c4-5 14-5 18 0" fill="none" stroke="#fff5f7" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="score-sticker__prop">
        <path d="M84 82V54" stroke="#241428" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M84 54h16l-3 11H84z" fill="#fff" stroke="#241428" strokeWidth="3" strokeLinejoin="round" />
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
      <svg viewBox="18 16 84 84" role="img" aria-label={`${LABELS[letter]}, grade ${letter}`}>
        <Face letter={letter} />
      </svg>
    </span>
  );
}
