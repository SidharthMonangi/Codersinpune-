export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <rect x="2" y="2" width="44" height="44" rx="10" fill="#F59E0B" />
      <path d="M12 34 L30 16" stroke="#0E1A2B" strokeWidth="6" strokeLinecap="round" />
      <circle cx="34" cy="14" r="5" fill="#0E1A2B" />
      <circle cx="12" cy="34" r="3" fill="#0E1A2B" opacity=".45" />
    </svg>
  );
}

