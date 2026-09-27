export function Bomb({ size = 160, lit = true, className = "" }: { size?: number; lit?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <radialGradient id="bomb-body" cx="38%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#5a5a7a" />
          <stop offset="45%" stopColor="#23213a" />
          <stop offset="100%" stopColor="#0b0a16" />
        </radialGradient>
        <radialGradient id="bomb-spark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="35%" stopColor="#ffe066" />
          <stop offset="100%" stopColor="#ff6b00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="186" rx="52" ry="8" fill="rgb(0 0 0 / .3)" />
      <circle cx="96" cy="118" r="66" fill="url(#bomb-body)" stroke="#0b0a16" strokeWidth="5" />
      <ellipse cx="72" cy="92" rx="18" ry="11" fill="#fff" opacity=".35" transform="rotate(-35 72 92)" />
      <circle cx="62" cy="108" r="5" fill="#fff" opacity=".3" />
      <rect x="112" y="42" width="34" height="26" rx="6" fill="#3b3957" stroke="#0b0a16" strokeWidth="5" transform="rotate(38 129 55)" />
      <path d="M140 40 C 150 22, 168 30, 170 16" fill="none" stroke="#c9a36a" strokeWidth="7" strokeLinecap="round" />
      <path d="M140 40 C 150 22, 168 30, 170 16" fill="none" stroke="#7a5a2a" strokeWidth="7" strokeLinecap="round" strokeDasharray="4 8" />
      {lit && (
        <g className="pb-spark">
          <circle cx="171" cy="14" r="18" fill="url(#bomb-spark)" />
          <path d="M171 0 L174 11 L185 14 L174 17 L171 28 L168 17 L157 14 L168 11 Z" fill="#fff6c2" />
        </g>
      )}
      {/* cute face */}
      <ellipse cx="80" cy="120" rx="7" ry="10" fill="#fff" />
      <ellipse cx="112" cy="120" rx="7" ry="10" fill="#fff" />
      <circle cx="81" cy="123" r="4" fill="#0b0a16" />
      <circle cx="113" cy="123" r="4" fill="#0b0a16" />
      <path d="M86 146 Q96 154 106 146" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
