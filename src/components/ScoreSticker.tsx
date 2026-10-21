import { useEffect, useState } from 'react';
import { grade } from '../data/model';

const LABELS: Record<string, string> = {
  A: 'Superstar',
  B: 'On a roll',
  C: 'Getting there',
  D: 'Needs attention',
  E: "Let's recover",
};

function Face({ letter }: { letter: string }) {
  if (letter === 'A') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="60" cy="68" r="32" fill="#1e8158" stroke="#241428" strokeWidth="3" />
          <g className="score-sticker__prop">
            <path d="M40 50l6-14 8 10 6-16 6 16 8-10 6 14z" fill="#f8c500" stroke="#241428" strokeWidth="3" />
          </g>
          <circle cx="49" cy="66" r="3.5" fill="#f4fff8" />
          <circle cx="71" cy="66" r="3.5" fill="#f4fff8" />
          <path d="M46 78c5 7 23 7 28 0" fill="none" stroke="#f4fff8" strokeWidth="3" strokeLinecap="round" />
        </g>
        <circle className="score-sticker__spark" style={{ '--x': '-28px', '--y': '-22px' } as React.CSSProperties} cx="60" cy="68" r="4" fill="#d71982" />
        <rect className="score-sticker__spark" style={{ '--x': '28px', '--y': '-18px' } as React.CSSProperties} x="56" y="64" width="8" height="8" fill="#7c33b5" />
        <circle className="score-sticker__spark" style={{ '--x': '24px', '--y': '20px' } as React.CSSProperties} cx="60" cy="68" r="3" fill="#f8c500" />
      </>
    );
  }
  if (letter === 'B') {
    return (
      <g className="score-sticker__buddy">
        <circle cx="58" cy="70" r="32" fill="#62c47a" stroke="#241428" strokeWidth="3" />
        <g className="score-sticker__prop">
          <path d="M44 50l14-18 14 18z" fill="#d71982" stroke="#241428" strokeWidth="3" />
          <rect x="40" y="48" width="36" height="7" rx="2" fill="#f8c500" stroke="#241428" strokeWidth="3" />
        </g>
        <circle cx="48" cy="68" r="3.5" fill="#115639" />
        <circle cx="68" cy="68" r="3.5" fill="#115639" />
        <path d="M46 80c4 6 20 6 24 0" fill="none" stroke="#115639" strokeWidth="3" strokeLinecap="round" />
        <path d="M82 74l10-14" stroke="#1f7a45" strokeWidth="4" strokeLinecap="round" />
        <circle cx="94" cy="58" r="4" fill="#1f7a45" />
      </g>
    );
  }
  if (letter === 'C') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="56" cy="70" r="32" fill="#f8c500" stroke="#241428" strokeWidth="3" />
          <g className="score-sticker__prop">
            <rect x="40" y="62" width="14" height="9" rx="4" fill="none" stroke="#241428" strokeWidth="3" />
            <rect x="60" y="62" width="14" height="9" rx="4" fill="none" stroke="#241428" strokeWidth="3" />
            <path d="M54 66h6" stroke="#241428" strokeWidth="3" />
          </g>
          <path d="M44 82h24" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__extra">
          <path d="M98 78V52" stroke="#7c33b5" strokeWidth="4" strokeLinecap="round" />
          <path d="M90 60l8-10 8 10" fill="none" stroke="#7c33b5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </>
    );
  }
  if (letter === 'D') {
    return (
      <g className="score-sticker__buddy">
        <circle cx="56" cy="72" r="32" fill="#ef8736" stroke="#241428" strokeWidth="3" />
        <path d="M44 66l5 5-5 5" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        <path d="M66 66l5 5-5 5" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        <path d="M44 86c4-6 20-6 24 0" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        <g className="score-sticker__prop">
          <path d="M86 46l16 16" stroke="#7a3900" strokeWidth="5" strokeLinecap="round" />
          <circle cx="84" cy="46" r="6" fill="none" stroke="#7a3900" strokeWidth="4" />
        </g>
      </g>
    );
  }
  return (
    <>
      <g className="score-sticker__buddy">
        <circle cx="54" cy="72" r="32" fill="#da294b" stroke="#241428" strokeWidth="3" />
        <circle cx="44" cy="68" r="3.5" fill="#fff5f7" />
        <circle cx="64" cy="68" r="3.5" fill="#fff5f7" />
        <path d="M44 84c4-5 16-5 20 0" fill="none" stroke="#fff5f7" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g className="score-sticker__prop">
        <circle cx="96" cy="46" r="14" fill="none" stroke="#fff" strokeWidth="5" />
        <circle cx="96" cy="46" r="14" fill="none" stroke="#da294b" strokeWidth="5" strokeDasharray="12 10" />
        <circle cx="96" cy="46" r="4" fill="#fff" />
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
