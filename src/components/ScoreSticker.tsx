import { useEffect, useState } from 'react';
import { grade } from '../data/model';

const LABELS: Record<string, string> = {
  A: 'Deal with it',
  B: 'Pog',
  C: 'This is fine',
  D: 'Side eye',
  E: 'Dumpster fire',
};

function Face({ letter }: { letter: string }) {
  if (letter === 'A') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="60" cy="62" r="26" fill="#1e8158" stroke="#241428" strokeWidth="3" />
          <path d="M46 74c5 8 23 8 28 0" fill="none" stroke="#f4fff8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="49" cy="60" r="2.4" fill="#f4fff8" />
          <circle cx="71" cy="60" r="2.4" fill="#f4fff8" />
        </g>
        <g className="score-sticker__prop">
          <rect x="39" y="53" width="17" height="12" fill="#241428" />
          <rect x="64" y="53" width="17" height="12" fill="#241428" />
          <rect x="56" y="56" width="8" height="4" fill="#241428" />
          <rect x="42" y="55" width="6" height="4" fill="#9ad7ff" />
          <rect x="67" y="55" width="6" height="4" fill="#9ad7ff" />
        </g>
        <circle className="score-sticker__spark" style={{ '--x': '-22px', '--y': '-18px' } as React.CSSProperties} cx="60" cy="64" r="3.5" fill="#d71982" />
        <rect className="score-sticker__spark" style={{ '--x': '24px', '--y': '-16px' } as React.CSSProperties} x="57" y="61" width="7" height="7" fill="#f8c500" />
        <circle className="score-sticker__spark" style={{ '--x': '18px', '--y': '16px' } as React.CSSProperties} cx="60" cy="64" r="3" fill="#7c33b5" />
      </>
    );
  }
  if (letter === 'B') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="60" cy="62" r="26" fill="#62c47a" stroke="#241428" strokeWidth="3" />
          <ellipse cx="49" cy="58" rx="8" ry="9" fill="#fff" stroke="#241428" strokeWidth="2.5" />
          <ellipse cx="71" cy="58" rx="8" ry="9" fill="#fff" stroke="#241428" strokeWidth="2.5" />
          <circle cx="50" cy="59" r="3.2" fill="#241428" />
          <circle cx="72" cy="59" r="3.2" fill="#241428" />
          <ellipse cx="60" cy="76" rx="7" ry="5.5" fill="#115639" />
          <ellipse cx="60" cy="75" rx="3" ry="2" fill="#f7fff9" />
        </g>
        <g className="score-sticker__spark" style={{ '--x': '-6px', '--y': '-10px' } as React.CSSProperties}>
          <path d="M30 40l4 8 8-2-6 6 2 8-8-4-6 6 1-8-8-2 8-2z" fill="#f8c500" />
        </g>
      </>
    );
  }
  if (letter === 'C') {
    return (
      <>
        <g className="score-sticker__buddy">
          <ellipse cx="40" cy="48" rx="7" ry="9" fill="#f8c500" stroke="#241428" strokeWidth="3" />
          <ellipse cx="74" cy="48" rx="7" ry="9" fill="#f8c500" stroke="#241428" strokeWidth="3" />
          <circle cx="57" cy="62" r="24" fill="#f8c500" stroke="#241428" strokeWidth="3" />
          <circle cx="49" cy="60" r="2.3" fill="#241428" />
          <circle cx="65" cy="60" r="2.3" fill="#241428" />
          <path d="M48 72h16" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__prop">
          <path d="M80 68h11v10a5.5 5.5 0 0 1-11 0z" fill="#fff" stroke="#241428" strokeWidth="2.5" />
          <path d="M91 72h4v5h-4" fill="none" stroke="#241428" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M84 62c1-5 3-5 3 0" fill="none" stroke="#7c33b5" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g className="score-sticker__extra">
          <path d="M28 84c2-8 6-8 6 0 2-10 7-10 7 0 2-8 6-8 6 0v6H28z" fill="#ef8736" stroke="#241428" strokeWidth="2" strokeLinejoin="round" />
          <path d="M78 86c2-7 5-7 5 0 1-8 6-8 6 0v5H78z" fill="#da294b" stroke="#241428" strokeWidth="2" strokeLinejoin="round" />
        </g>
      </>
    );
  }
  if (letter === 'D') {
    return (
      <>
        <g className="score-sticker__buddy">
          <circle cx="60" cy="62" r="26" fill="#ef8736" stroke="#241428" strokeWidth="3" />
          <path d="M46 76c5 5 18 4 24-2" fill="none" stroke="#241428" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="score-sticker__prop">
          <ellipse cx="50" cy="60" rx="6" ry="7" fill="#fff" stroke="#241428" strokeWidth="2.5" />
          <ellipse cx="68" cy="60" rx="6" ry="7" fill="#fff" stroke="#241428" strokeWidth="2.5" />
          <circle cx="53" cy="60" r="2.4" fill="#241428" />
          <circle cx="71" cy="60" r="2.4" fill="#241428" />
        </g>
        <circle className="score-sticker__extra" cx="80" cy="50" r="3.5" fill="#7ec8f0" stroke="#241428" strokeWidth="2" />
      </>
    );
  }
  return (
    <>
      <g className="score-sticker__buddy">
        <circle cx="60" cy="54" r="18" fill="#da294b" stroke="#241428" strokeWidth="3" />
        <circle cx="54" cy="52" r="2.2" fill="#fff5f7" />
        <circle cx="66" cy="52" r="2.2" fill="#fff5f7" />
        <path d="M53 62c3 4 11 4 14 0" fill="none" stroke="#fff5f7" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="score-sticker__prop">
        <path d="M36 70h48l-7 22H43z" fill="#5c6570" stroke="#241428" strokeWidth="3" strokeLinejoin="round" />
        <path d="M32 70h56" stroke="#241428" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="score-sticker__extra">
        <path d="M44 70c1-9 5-9 6 0 1-11 6-11 6 0 1-8 5-8 5 0v4H44z" fill="#f8c500" stroke="#241428" strokeWidth="2" strokeLinejoin="round" />
        <path d="M64 72c1-8 4-8 5 0 1-10 5-10 5 0v4H64z" fill="#ef8736" stroke="#241428" strokeWidth="2" strokeLinejoin="round" />
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
