export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#bg)" />
      <path d="M13 35 L31 17" stroke="#12161D" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="34.5" cy="13.5" r="5" fill="#12161D" />
      <circle cx="12" cy="36" r="3" fill="#12161D" opacity=".4" />
    </svg>
  );
}
