import { Send, Globe } from 'lucide-react';
import type { SocialPlatform } from '@/types/domain';

/**
 * Brand marks for the profile's social links.
 *
 * lucide-react dropped its brand icons in v1, so the network glyphs are
 * inlined here. Each is authored on the same 24×24 grid and paints with
 * `currentColor`, so they sit on the same optical weight as the lucide icons
 * used elsewhere on the page.
 */

type IconProps = { className?: string };

function TelegramIcon({ className }: IconProps) {
  // The lucide paper plane reads as Telegram and matches the surrounding
  // icon set's stroke weight exactly — no need for a bespoke glyph.
  return <Send className={className} />;
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

function GithubIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23a11.5 11.5 0 0 1 3-.405c1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function BehanceIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6.94 4.5c1.12 0 2.03.15 2.72.44.7.28 1.22.7 1.56 1.25.34.55.51 1.21.51 2 0 .84-.2 1.54-.6 2.1-.28.4-.68.75-1.2 1.05.77.27 1.35.7 1.72 1.3.38.6.57 1.32.57 2.16 0 .69-.14 1.33-.4 1.92a3.6 3.6 0 0 1-1.13 1.4c-.47.36-1.06.62-1.75.78-.44.1-1.1.15-1.99.16H0V4.5h6.94zM3.7 11.05h2.62c.76 0 1.32-.14 1.68-.43.36-.29.54-.7.54-1.24 0-.6-.23-1-.68-1.2-.4-.15-.9-.22-1.53-.22H3.7v3.09zm0 5.84h2.9c.79 0 1.4-.15 1.83-.45.43-.3.65-.79.65-1.48 0-.66-.21-1.13-.63-1.4-.42-.28-1.03-.42-1.83-.42H3.7v3.75zM19.06 5.86h-4.9V4.4h4.9v1.46zM24 13.15c0-.5-.03-.98-.1-1.42a5.2 5.2 0 0 0-.75-2.07 4.5 4.5 0 0 0-1.72-1.6 5.32 5.32 0 0 0-2.5-.56c-1.63 0-2.96.53-3.97 1.6-1 1.05-1.51 2.53-1.51 4.42 0 2.02.56 3.48 1.68 4.38 1.11.9 2.4 1.35 3.86 1.35 1.76 0 3.13-.54 4.11-1.62.63-.68 1-1.35 1.08-2h-2.86c-.17.33-.36.58-.58.77-.4.34-.92.51-1.56.51-.6 0-1.12-.14-1.55-.41-.71-.44-1.09-1.2-1.13-2.29H24v-1.06zm-2.86-.83h-4.63c.1-.7.34-1.24.74-1.65.4-.4.95-.6 1.67-.6.66 0 1.21.19 1.66.58.44.39.69.94.75 1.67z" />
    </svg>
  );
}

function DribbbleIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M5.5 4.9c3.5 3.4 5.9 7.6 7 12.6.3 1.4.5 2.8.5 4.4" />
      <path d="M2.2 13.6c4.4-.7 8.2-.4 11.4 1 1.9.8 3.7 2 5.4 3.6" />
      <path d="M8 2.6c2.6 2.6 5.2 4.4 7.7 5.3 1.9.7 4 1 6.2 1" />
    </svg>
  );
}

/**
 * Display metadata per network. `color` is the brand hue, applied on hover so
 * the resting state stays in the site's neutral palette (one accent rule —
 * see `frontend/CLAUDE.md` → "Dizayn tili").
 */
export const SOCIAL_META: Record<
  SocialPlatform,
  // `ComponentType` rather than a plain function signature, so the lucide
  // icons (forwardRef components) satisfy it alongside the local SVGs.
  { label: string; color: string; Icon: React.ComponentType<IconProps> }
> = {
  telegram: { label: 'Telegram', color: '#229ED9', Icon: TelegramIcon },
  instagram: { label: 'Instagram', color: '#E1306C', Icon: InstagramIcon },
  linkedin: { label: 'LinkedIn', color: '#0A66C2', Icon: LinkedInIcon },
  github: { label: 'GitHub', color: '#24292F', Icon: GithubIcon },
  behance: { label: 'Behance', color: '#1769FF', Icon: BehanceIcon },
  dribbble: { label: 'Dribbble', color: '#EA4C89', Icon: DribbbleIcon },
  website: { label: 'Website', color: '#0069F5', Icon: Globe },
};
