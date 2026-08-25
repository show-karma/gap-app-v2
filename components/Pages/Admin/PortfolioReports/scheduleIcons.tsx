export function CalendarSmall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 8H16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function CalendarBiweekly({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none">
      <rect x="2" y="4" width="14" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 8H16" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5.5" cy="11" r="1.1" fill="currentColor" />
      <circle cx="12.5" cy="11" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" fill="none">
      <path d="M3 5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 5L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 13L5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="13" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
