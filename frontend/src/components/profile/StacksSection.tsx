'use client';

import { useTranslations } from 'next-intl';
import { Award, ArrowRight, ListChecks } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { Direction, FreelancerProfile } from '@/types/domain';
import { RatingStars } from '@/components/rating';
import { DirectionProgress } from '@/components/DirectionProgress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const DIRECTIONS: Direction[] = ['frontend', 'backend', 'fullstack', 'mobile'];

/**
 * Per-direction verification tiers — visible to every visitor (a skill
 * showcase), with the `primaryDirection` picker and "take the test" CTA
 * shown only to the profile owner.
 */
export function StacksSection({
  profile,
  onPickDirection,
}: {
  profile: FreelancerProfile;
  /** Owner-only: persists the "who am I" pick via `api.updateMe`. */
  onPickDirection: (direction: Direction) => void;
}) {
  const t = useTranslations('profile');
  const ts = useTranslations('stacks');
  const hasResult = profile.attempts > 0;

  return (
    <Card id="stacks" className="scroll-mt-24">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('verification')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.isOwner && (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('primaryDirection')}
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('primaryDirectionHint')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DIRECTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onPickDirection(d)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    profile.primaryDirection === d
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-accent',
                  )}
                >
                  {ts(d)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className={cn(
            'grid gap-2.5 sm:grid-cols-2',
            profile.isOwner && 'border-t pt-4',
          )}
        >
          {DIRECTIONS.map((d) => (
            <DirectionProgress
              key={d}
              direction={d}
              tier={profile.verificationLevels[d]}
              highlighted={profile.primaryDirection === d}
            />
          ))}
        </div>

        {hasResult ? (
          <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Award className="h-3.5 w-3.5" />
                {t('bestResult')}
              </p>
              <RatingStars percentage={profile.bestPercentage} className="mt-1.5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('bestResult')} %
              </p>
              <p className="mt-1.5 text-lg font-bold tabular-nums">{profile.bestPercentage}%</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" />
                {t('attempts')}
              </p>
              <p className="mt-1.5 text-lg font-bold tabular-nums">{profile.attempts}</p>
            </div>
          </div>
        ) : (
          profile.isOwner && (
            <p className="border-t pt-4 text-sm text-muted-foreground">{t('noResult')}</p>
          )
        )}

        {profile.isOwner && (
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/test">
              {t('takeTest')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
