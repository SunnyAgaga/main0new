export function getMonogramInitials(coupleNames: string): [string, string] {
  const parts = coupleNames
    .split(/&|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const first = parts[0]?.[0]?.toUpperCase() ?? 'W';
  const second = parts[1]?.[0]?.toUpperCase() ?? 'P';
  return [first, second];
}

/** A refined, low-detail art-deco monogram badge. Colors inherit from `currentColor`. */
export function Monogram({ initials, className }: { initials: [string, string]; className?: string }) {
  return (
    <svg
      viewBox="0 0 400 480"
      className={className}
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <ellipse cx="200" cy="240" rx="152" ry="182" strokeWidth="1.5" />
      <ellipse cx="200" cy="240" rx="138" ry="168" strokeWidth="0.75" strokeDasharray="1 5" strokeLinecap="round" />

      <path d="M46 46 C74 34, 96 54, 84 78 C104 62, 134 66, 138 92" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M354 46 C326 34, 304 54, 316 78 C296 62, 266 66, 262 92" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M46 434 C74 446, 96 426, 84 402 C104 418, 134 414, 138 388" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M354 434 C326 446, 304 426, 316 402 C296 418, 266 414, 262 388" strokeWidth="1.25" strokeLinecap="round" />

      <path d="M164 20 Q200 4 236 20" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M200 8 L200 26" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M164 460 Q200 476 236 460" strokeWidth="1.25" strokeLinecap="round" />
      <path d="M200 454 L200 472" strokeWidth="1.25" strokeLinecap="round" />

      <text x="200" y="272" textAnchor="middle" className="font-serif" stroke="none" fill="currentColor">
        <tspan fontSize="132" fontWeight="600">{initials[0]}</tspan>
        <tspan fontSize="56" fontWeight="400" dx="10" dy="-6">&amp;</tspan>
        <tspan fontSize="132" fontWeight="600" dx="10" dy="6">{initials[1]}</tspan>
      </text>
    </svg>
  );
}
