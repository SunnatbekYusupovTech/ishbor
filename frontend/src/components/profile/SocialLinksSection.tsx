'use client';

import { useTranslations } from 'next-intl';
import { Link2 } from 'lucide-react';
import { SOCIAL_PLATFORMS, type SocialLinks } from '@/types/domain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SOCIAL_META } from '@/components/profile/social-icons';

/**
 * Renders only the networks the freelancer actually filled in (the API
 * already strips empty values). Renders nothing at all when none are set —
 * including for the owner, who reaches them through the edit dialog anyway.
 */
export function SocialLinksSection({ socials }: { socials: SocialLinks }) {
  const t = useTranslations('freelancer');

  // Iterate the canonical order rather than object key order, so the row
  // doesn't reshuffle when a link is added or removed.
  const filled = SOCIAL_PLATFORMS.filter((p) => !!socials[p]);
  if (filled.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Link2 className="h-4 w-4" />
          {t('socials')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2">
          {filled.map((platform) => {
            const { label, color, Icon } = SOCIAL_META[platform];
            return (
              <li key={platform}>
                <a
                  href={socials[platform]}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  // The brand hue is applied via a CSS variable so the hover
                  // rule stays a single utility instead of an inline style
                  // that Tailwind's hover: variant can't reach.
                  style={{ '--social': color } as React.CSSProperties}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:border-[var(--social)] hover:text-[var(--social)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
