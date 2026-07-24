'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Award, ArrowRight, Heart, Trophy, Plus, Building2, UserRound, Wallet } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import type { Job, Me } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import { JobDetailDialog } from '@/components/JobDetailDialog';
import { LevelBadge, StackBadge, VerifiedBadge } from '@/components/badges';
import { displayTier, cn, handleSpotlightMove } from '@/lib/utils';

/**
 * Right-hand widget column — only rendered (by `SiteChrome`) on the jobs
 * listing and profile pages, and only once someone's signed in (there's
 * nothing personal to show a guest). Verification summary + a "saved jobs"
 * preview (full mini-cards, not just titles — reuses the same
 * `api.getJobs()` the jobs page already calls, filtered client-side against
 * `useFavorites()` since favorites are only ever stored as bare ids) + a
 * couple of quick links.
 */
export function RightSidebar({ me }: { me: Me | null }) {
  const t = useTranslations('dashboard');
  const tp = useTranslations('profile');
  const tj = useTranslations('jobs');
  const favIds = useFavorites();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!me || favIds.length === 0) {
      setSavedJobs([]);
      return;
    }
    let cancelled = false;
    api
      .getJobs({})
      .then((jobs) => {
        if (cancelled) return;
        const favSet = new Set(favIds);
        setSavedJobs(jobs.filter((j) => favSet.has(j.id)));
      })
      .catch(() => {
        /* Widget just stays empty on failure — not worth an error state here. */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- favIds identity changes on every save/unsave, which is exactly when we want to refetch.
  }, [me, favIds.join(',')]);

  if (!me) return null;

  const tier = displayTier(me.verificationLevels, me.primaryDirection);
  const hasResult = me.attempts > 0;
  const handle = me.username ?? me.id;

  return (
    // Outer column has no explicit height, so it stretches (flex default
    // `align-items: stretch`) to match the row's full height — as tall as
    // the page's content, not just one viewport (see `LeftSidebar` for the
    // same fix/reasoning). The inner div is the sticky+scrollable part.
    <aside className="hidden shrink-0 xl:block xl:w-80 xl:border-l xl:bg-background">
      <div className="scrollbar-hide flex flex-col gap-4 p-4 xl:sticky xl:top-16 xl:max-h-[calc(100dvh-4rem)] xl:overflow-y-auto">
        {/* Verification / stacks summary */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Award className="h-4 w-4" />
            {t('statsTitle')}
          </h2>
          <div className="mt-3 flex items-center justify-between gap-2">
            <VerifiedBadge level={tier} />
            {hasResult && (
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {me.bestPercentage}%
              </span>
            )}
          </div>
          {(!hasResult || tier === 'none') && (
            <Button asChild size="sm" className="mt-3 w-full">
              <Link href="/test">
                {tp('takeTest')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Saved jobs preview — full mini-cards (title/company/level/stack/
            salary), each opening the same detail dialog the main feed uses. */}
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Heart className="h-4 w-4" />
            {t('savedTitle')}
          </h2>
          {savedJobs.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">{t('noSaved')}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {savedJobs.map((job) => (
                <SavedJobMiniCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className={cn('rounded-2xl border bg-card p-4 shadow-sm')}>
          <h2 className="text-sm font-bold">{t('quickLinksTitle')}</h2>
          <div className="mt-3 flex flex-col gap-1">
            {me.role === 'employer' && (
              <Link
                href="/jobs/new"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                {tj('post')}
              </Link>
            )}
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <Trophy className="h-4 w-4 text-muted-foreground" />
              {tp('viewLeaderboard')}
            </Link>
            <Link
              href={`/u/${handle}` as '/'}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent"
            >
              <Award className="h-4 w-4 text-muted-foreground" />
              {tp('title')}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

/** Condensed job card for the saved-jobs widget — same detail dialog as the
 *  main feed's `JobCard`, just sized for a ~320px sidebar column. */
function SavedJobMiniCard({ job }: { job: Job }) {
  const t = useTranslations('jobs');
  const isResume = job.type === 'resume';
  const subtitle = isResume ? job.postedByName : (job.company ?? job.postedByName);

  return (
    <JobDetailDialog job={job}>
      <DialogTrigger asChild>
        <button
          type="button"
          onMouseMove={handleSpotlightMove}
          className="spotlight w-full rounded-xl border bg-background p-3 text-left transition-colors hover:bg-accent"
        >
          <p className="line-clamp-2 text-sm font-bold leading-snug">{job.title}</p>
          <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            {isResume ? <UserRound className="h-3 w-3 shrink-0" /> : <Building2 className="h-3 w-3 shrink-0" />}
            {subtitle}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <LevelBadge level={job.level} />
            <StackBadge stack={job.stack} />
          </div>
          {job.salary && (
            <p className="mt-2 flex items-center gap-1 text-sm font-bold text-success">
              <Wallet className="h-3.5 w-3.5" />
              {job.salary}
            </p>
          )}
          <span className="sr-only">{t('viewDetails')}</span>
        </button>
      </DialogTrigger>
    </JobDetailDialog>
  );
}
