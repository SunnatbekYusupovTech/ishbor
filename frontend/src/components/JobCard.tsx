'use client';

import { useTranslations, useFormatter } from 'next-intl';
import {
  Building2,
  UserRound,
  Wallet,
  Clock,
  Heart,
  EyeOff,
  BadgeCheck,
  MessageCircle,
} from 'lucide-react';
import type { Job } from '@/types/domain';
import { DialogTrigger } from '@/components/ui/dialog';
import { LevelBadge, StackBadge } from '@/components/badges';
import { RatingStars, Avatar } from '@/components/rating';
import { JobDetailDialog } from '@/components/JobDetailDialog';
import { favorites, useIsFavorite } from '@/lib/favorites';
import { cn } from '@/lib/utils';

export function JobCard({ job, onHide }: { job: Job; onHide?: (id: string) => void }) {
  const t = useTranslations('jobs');
  const format = useFormatter();
  const saved = useIsFavorite(job.id);

  const isResume = job.type === 'resume';
  const subtitle = isResume ? job.postedByName : job.company ?? job.postedByName;
  const roleLabel = isResume ? t('seeker') : t('employer');
  const rating = job.rating;
  const hasRating = !!rating && (rating.attempts > 0 || rating.bestPercentage > 0);
  const verified = !!rating && rating.verificationLevel !== 'none';

  return (
    <JobDetailDialog job={job}>
      <article
        className={cn(
          'group relative rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 sm:p-5',
          'hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
        )}
      >
        {/* Top-right actions — hide + save (hh eye + heart) */}
        <div className="absolute right-2.5 top-2.5 flex items-center gap-0.5">
          {onHide && (
            <button
              type="button"
              onClick={() => onHide(job.id)}
              aria-label={t('hide')}
              title={t('hide')}
              className="rounded-full p-1.5 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => favorites.toggle(job.id)}
            aria-label={saved ? t('favorited') : t('favorite')}
            aria-pressed={saved}
            title={saved ? t('favorited') : t('favorite')}
            className={cn(
              'rounded-full p-1.5 transition-colors',
              saved
                ? 'text-primary hover:bg-accent'
                : 'text-muted-foreground/70 hover:bg-muted hover:text-primary',
            )}
          >
            <Heart className={cn('h-4 w-4', saved && 'fill-current')} />
          </button>
        </div>

        <div className="flex gap-4">
          {/* Avatar + verified check */}
          <div className="relative shrink-0">
            <Avatar name={subtitle} size="lg" />
            {verified && (
              <span
                className="absolute -bottom-1 -right-1 rounded-full bg-card p-0.5"
                title={t('verifiedTitle')}
              >
                <BadgeCheck className="h-5 w-5 fill-primary text-primary-foreground" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 pr-12">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                isResume
                  ? 'bg-success/10 text-success'
                  : 'bg-primary/10 text-primary',
              )}
            >
              {isResume ? <UserRound className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
              {roleLabel}
            </span>

            {/* Title opens the detail dialog */}
            <DialogTrigger asChild>
              <button
                type="button"
                className="mt-1.5 block max-w-full truncate text-left text-lg font-bold leading-tight tracking-tight transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary"
              >
                {job.title}
              </button>
            </DialogTrigger>

            <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
              <span className="truncate">{subtitle}</span>
              {verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </p>

            {hasRating && rating && (
              <div className="mt-2">
                <RatingStars percentage={rating.bestPercentage} size="sm" />
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <LevelBadge level={job.level} />
              <StackBadge stack={job.stack} />
            </div>

            {job.salary && (
              <p className="mt-3 flex items-center gap-1.5 text-base font-bold text-success">
                <Wallet className="h-4 w-4" />
                {job.salary}
              </p>
            )}

            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          </div>
        </div>

        {/* Footer — time + primary contact action */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format.relativeTime(new Date(job.createdAt))}
          </span>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              <MessageCircle className="h-4 w-4" />
              {t('contactAction')}
            </button>
          </DialogTrigger>
        </div>
      </article>
    </JobDetailDialog>
  );
}
