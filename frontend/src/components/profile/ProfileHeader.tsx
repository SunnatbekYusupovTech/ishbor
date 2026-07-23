'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { BadgeCheck, Briefcase, Pencil, Star } from 'lucide-react';
import type { FreelancerProfile } from '@/types/domain';
import { Avatar } from '@/components/rating';
import { VerifiedBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { displayTier, cn } from '@/lib/utils';
import { resolveImageUrl } from '@/lib/images';

/**
 * Cover + avatar + identity block. The avatar deliberately overlaps the cover
 * (negative margin) — the cover is a plain `<img>` rather than `next/image`
 * because the URL is user-supplied and `next/image` would require every
 * possible host to be allow-listed in `next.config` up front.
 */
export function ProfileHeader({
  profile,
  onEdit,
}: {
  profile: FreelancerProfile;
  onEdit: () => void;
}) {
  const t = useTranslations('freelancer');
  const [coverFailed, setCoverFailed] = useState(false);
  const tier = displayTier(profile.verificationLevels, profile.primaryDirection);
  // Uploaded covers are stored origin-less (`/uploads/…`); external ones pass through.
  const coverSrc = resolveImageUrl(profile.coverUrl);
  const showCover = !!coverSrc && !coverFailed;

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow">
      <div className="relative h-32 w-full sm:h-44 lg:h-56">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element -- see doc comment above
          <img
            src={coverSrc!}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          // Deterministic fallback so a profile without a cover still reads as
          // designed rather than broken.
          <div className="h-full w-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
        )}
      </div>

      <div className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
          <div className="relative">
            <Avatar name={profile.name} src={profile.avatarUrl} size="xl" className="ring-4" />
            {profile.isOnline && (
              <span
                title={t('online')}
                className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-card bg-success sm:h-5 sm:w-5"
              />
            )}
          </div>

          {profile.isOwner && (
            <Button variant="outline" size="sm" onClick={onEdit} className="mb-1">
              <Pencil className="h-4 w-4" />
              {t('editProfile')}
            </Button>
          )}
        </div>

        <div className="mt-3.5 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{profile.name}</h1>
            {tier !== 'none' && (
              <BadgeCheck className="h-5 w-5 shrink-0 text-primary" aria-label={t('verified')} />
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                profile.isOnline
                  ? 'bg-success/10 text-success'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  profile.isOnline ? 'bg-success' : 'bg-muted-foreground/60',
                )}
              />
              {profile.isOnline ? t('online') : t('offline')}
            </span>
          </div>

          {profile.username && (
            <p className="font-mono text-sm text-muted-foreground">@{profile.username}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {profile.specialization && (
              <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
                {profile.specialization}
              </p>
            )}
            <VerifiedBadge level={tier} />
            {profile.reviewCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold tabular-nums text-foreground">
                  {profile.reviewAverage.toFixed(1)}
                </span>
                <span>{t('reviewCount', { count: profile.reviewCount })}</span>
              </span>
            )}
          </div>

          {profile.skills.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-1.5">
              {profile.skills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium"
                >
                  {skill}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
