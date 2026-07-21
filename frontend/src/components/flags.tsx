import type { Locale } from '@/i18n/routing';

/**
 * Compact, crisp SVG flags — used instead of emoji flags, which render as
 * plain region letters (e.g. "GB") on Windows/Chrome and break the premium look.
 * Each flag fills a rounded 20×14 box; the parent clips the corners.
 */
type FlagProps = { className?: string };

function FlagFrame({ children, className }: FlagProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 14"
      className={className}
      role="presentation"
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
    >
      {children}
    </svg>
  );
}

/** United Kingdom (English). Simplified Union Jack. */
function FlagEN({ className }: FlagProps) {
  return (
    <FlagFrame className={className}>
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#fff" strokeWidth="2.6" />
      <path d="M0 0l20 14M20 0L0 14" stroke="#c8102e" strokeWidth="1.2" />
      <path d="M10 0v14M0 7h20" stroke="#fff" strokeWidth="4" />
      <path d="M10 0v14M0 7h20" stroke="#c8102e" strokeWidth="2.2" />
    </FlagFrame>
  );
}

/** Russia (Русский). White / blue / red. */
function FlagRU({ className }: FlagProps) {
  return (
    <FlagFrame className={className}>
      <rect width="20" height="14" fill="#fff" />
      <rect y="4.67" width="20" height="4.66" fill="#0039a6" />
      <rect y="9.33" width="20" height="4.67" fill="#d52b1e" />
    </FlagFrame>
  );
}

/** Uzbekistan (O'zbekcha). Blue / white / green with red fimbriations, crescent + stars. */
function FlagUZ({ className }: FlagProps) {
  return (
    <FlagFrame className={className}>
      <rect width="20" height="14" fill="#1eb53a" />
      <rect width="20" height="4.4" fill="#0099b5" />
      <rect y="4.4" width="20" height="5.2" fill="#fff" />
      <rect y="4.15" width="20" height="0.5" fill="#ce1126" />
      <rect y="9.35" width="20" height="0.5" fill="#ce1126" />
      <g fill="#fff">
        <circle cx="3.7" cy="2.2" r="1.35" />
        <circle cx="4.25" cy="2.2" r="1.35" fill="#0099b5" />
        <circle cx="6.4" cy="1.5" r="0.28" />
        <circle cx="6.4" cy="2.9" r="0.28" />
        <circle cx="7.7" cy="1.5" r="0.28" />
        <circle cx="7.7" cy="2.9" r="0.28" />
        <circle cx="9" cy="1.5" r="0.28" />
        <circle cx="9" cy="2.9" r="0.28" />
      </g>
    </FlagFrame>
  );
}

export const flags: Record<Locale, (props: FlagProps) => React.JSX.Element> = {
  en: FlagEN,
  ru: FlagRU,
  uz: FlagUZ,
};
