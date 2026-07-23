'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { CalendarDays, Clock, Languages, MapPin, Pencil, Award } from 'lucide-react';
import type { FreelancerProfile } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RatingStars } from '@/components/rating';

/**
 * The freelancer's clock, ticking in their own `timezone`.
 *
 * Returns `null` on the first render and fills in from an effect: the server
 * and the visitor's browser would otherwise disagree about "now" and React
 * would flag a hydration mismatch.
 */
function useLocalTime(timezone: string | null, locale: string): string | null {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    if (!timezone) {
      setTime(null);
      return;
    }

    const render = () => {
      try {
        setTime(
          new Intl.DateTimeFormat(locale, {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
          }).format(new Date()),
        );
      } catch {
        // A hand-typed zone that isn't a real IANA id — drop the row rather
        // than crashing the whole sidebar.
        setTime(null);
      }
    };

    render();
    const id = setInterval(render, 30_000);
    return () => clearInterval(id);
  }, [timezone, locale]);

  return time;
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-sm font-medium">{value}</span>
    </div>
  );
}

/** Compact facts card + the owner's "Edit profile" entry point. */
export function ProfileSidebar({
  profile,
  onEdit,
}: {
  profile: FreelancerProfile;
  onEdit: () => void;
}) {
  const t = useTranslations('freelancer');
  const format = useFormatter();
  const locale = useLocale();
  const localTime = useLocalTime(profile.timezone, locale);

  return (
    <Card className="lg:sticky lg:top-20">
      <CardContent className="divide-y pt-5">
        {profile.country && <Row icon={MapPin} label={t('country')} value={profile.country} />}
        {profile.language && (
          <Row icon={Languages} label={t('language')} value={profile.language} />
        )}
        {localTime && (
          <Row
            icon={Clock}
            label={t('localTime')}
            value={<span className="font-mono tabular-nums">{localTime}</span>}
          />
        )}
        <Row
          icon={CalendarDays}
          label={t('memberSince')}
          // Numeric rather than a named month on purpose: Chrome ships no
          // Uzbek month names, so `month: 'long'` renders as "2026 M07" on
          // the app's default locale. Numeric reads correctly everywhere.
          value={format.dateTime(new Date(profile.memberSince), {
            year: 'numeric',
            month: '2-digit',
          })}
        />
        {profile.attempts > 0 && (
          <Row
            icon={Award}
            label={t('testScore')}
            value={<RatingStars percentage={profile.bestPercentage} size="sm" />}
          />
        )}

        {profile.isOwner && (
          <div className="pt-4">
            <Button variant="outline" onClick={onEdit} className="w-full">
              <Pencil className="h-4 w-4" />
              {t('editProfile')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
