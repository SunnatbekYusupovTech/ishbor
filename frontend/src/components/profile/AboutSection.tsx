'use client';

import { useTranslations } from 'next-intl';
import { UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Free-text intro. Hidden entirely for visitors when empty — an empty card
 * would be noise on someone else's profile — but the owner still sees it,
 * with a prompt to fill it in.
 */
export function AboutSection({ about, isOwner }: { about: string | null; isOwner: boolean }) {
  const t = useTranslations('freelancer');

  if (!about && !isOwner) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <UserRound className="h-4 w-4" />
          {t('about')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {about ? (
          // `whitespace-pre-line` keeps the paragraph breaks the user typed.
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {about}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">{t('aboutEmptyOwner')}</p>
        )}
      </CardContent>
    </Card>
  );
}
