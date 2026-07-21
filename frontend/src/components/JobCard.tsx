'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { Building2, UserRound, Wallet, ArrowRight, Clock, MapPin } from 'lucide-react';
import type { Job } from '@/types/domain';
import { DialogTrigger } from '@/components/ui/dialog';
import { LevelBadge, StackBadge } from '@/components/badges';
import { RatingStars, Avatar } from '@/components/rating';
import { JobDetailDialog } from '@/components/JobDetailDialog';
import { cn } from '@/lib/utils';

export function JobCard({ job }: { job: Job }) {
  const t = useTranslations('jobs');
  const format = useFormatter();

  const isResume = job.type === 'resume';
  const subtitle = isResume ? job.postedByName : job.company ?? job.postedByName;
  const roleLabel = isResume ? t('seeker') : t('employer');
  const rating = job.rating;
  const hasRating = !!rating && (rating.attempts > 0 || rating.bestPercentage > 0);

  return (
    <JobDetailDialog job={job}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card p-5 text-left transition-all duration-200',
            'hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            isResume ? 'hover:border-emerald-400/60' : 'hover:border-indigo-400/60',
          )}
        >
          {/* Location chip */}
          {job.location && (
            <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {job.location}
            </p>
          )}

          {/* Type accent bar */}
          <span
            className={cn(
              'absolute inset-x-0 top-0 h-1',
              isResume
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                : 'bg-gradient-to-r from-indigo-400 to-violet-500',
            )}
          />

          {/* Header */}
          <div className="flex items-start gap-3">
            <Avatar name={subtitle} size="md" />
            <div className="min-w-0 flex-1">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  isResume
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
                )}
              >
                {isResume ? <UserRound className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                {roleLabel}
              </span>
              <h3 className="mt-1.5 truncate text-base font-semibold leading-tight">{job.title}</h3>
              <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          {/* Rating */}
          {hasRating && rating && (
            <div className="mt-3">
              <RatingStars percentage={rating.bestPercentage} size="sm" />
            </div>
          )}

          {/* Badges */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <LevelBadge level={job.level} />
            <StackBadge stack={job.stack} />
          </div>

          {/* Salary */}
          {job.salary && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-4 w-4" />
              {job.salary}
            </p>
          )}

          {/* Description */}
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {job.description}
          </p>

          {/* Footer */}
          <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format.relativeTime(new Date(job.createdAt))}
            </span>
            <span
              className={cn(
                'flex items-center gap-1 font-semibold transition-colors',
                isResume
                  ? 'text-emerald-600 group-hover:text-emerald-700 dark:text-emerald-400'
                  : 'text-indigo-600 group-hover:text-indigo-700 dark:text-indigo-400',
              )}
            >
              {t('viewDetails')}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>
      </DialogTrigger>
    </JobDetailDialog>
  );
}
