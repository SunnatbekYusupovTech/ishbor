'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useFormatter, useNow } from 'next-intl';
import {
  Building2,
  UserRound,
  Wallet,
  Clock,
  Heart,
  BadgeCheck,
  MessageCircle,
  MessageSquare,
  MapPin,
  MoreHorizontal,
  EyeOff,
  Building,
  Flag,
} from 'lucide-react';
import type { Job } from '@/types/domain';
import { DialogTrigger } from '@/components/ui/dialog';
import { LevelBadge, StackBadge } from '@/components/badges';
import { RatingStars, Avatar } from '@/components/rating';
import { JobDetailDialog } from '@/components/JobDetailDialog';
import { ReportDialog, type ReportReason } from '@/components/ReportDialog';
import { favorites, useIsFavorite } from '@/lib/favorites';
import { hiddenJobs } from '@/lib/hidden';
import { blacklistedCompanies } from '@/lib/companyBlacklist';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api';
import { cn, handleSpotlightMove } from '@/lib/utils';

type CardIntent = 'apply' | 'contact' | null;

export function JobCard({ job, onHide }: { job: Job; onHide?: (id: string) => void }) {
  const t = useTranslations('jobs');
  const tc = useTranslations('chat');
  const tr = useTranslations('report');
  const format = useFormatter();
  const saved = useIsFavorite(job.id);
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [intent, setIntent] = useState<CardIntent>(null);
  // Exit-animation state: on Hide the card fades out (300ms) before the
  // `hiddenJobs` update actually removes it from the feed.
  const [leaving, setLeaving] = useState(false);
  const leavingTimer = useRef<number | null>(null);
  // Stable "now" shared by server/client render — avoids relativeTime hydration mismatch.
  const now = useNow();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Esc closes the More dropdown (matches the spec: outside click / Esc).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => () => {
    if (leavingTimer.current) window.clearTimeout(leavingTimer.current);
  }, []);

  const isResume = job.type === 'resume';
  const subtitle = isResume ? job.postedByName : job.company ?? job.postedByName;
  const roleLabel = isResume ? t('seeker') : t('employer');
  const rating = job.rating;
  const hasRating = !!rating && (rating.attempts > 0 || rating.bestPercentage > 0);
  const verified = !!rating && rating.verificationLevel !== 'none';

  /** Hide the vacancy with a fade-out + Undo toast. */
  const hideVacancy = () => {
    closeMenu();
    setLeaving(true);
    showToast({
      message: t('hiddenToast'),
      actionLabel: t('undo'),
      onAction: () => {
        if (leavingTimer.current) {
          window.clearTimeout(leavingTimer.current);
          leavingTimer.current = null;
          setLeaving(false);
        } else {
          hiddenJobs.unhide(job.id);
        }
      },
    });
    leavingTimer.current = window.setTimeout(() => {
      leavingTimer.current = null;
      if (onHide) onHide(job.id);
      else hiddenJobs.hide(job.id);
    }, 300);
  };

  /** Hide every vacancy of this company — with an Undo toast. */
  const hideCompany = () => {
    closeMenu();
    if (!job.company) return;
    blacklistedCompanies.hide(job.company);
    showToast({
      message: t('companyHiddenToast'),
      actionLabel: t('undo'),
      onAction: () => blacklistedCompanies.unhide(job.company!),
    });
  };

  const submitReport = async (reason: ReportReason, note?: string) => {
    setReportSubmitting(true);
    setReportError(null);
    try {
      await api.reportJob(job.id, reason, note);
      setReportOpen(false);
      showToast({ message: tr('success') });
    } catch (err) {
      setReportError(err instanceof ApiError ? err.message : tr('loadError'));
    } finally {
      setReportSubmitting(false);
    }
  };

  const triggerBase =
    'inline-flex h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';

  return (
    <JobDetailDialog
      job={job}
      onHide={onHide}
      intent={intent}
      onIntentConsumed={() => setIntent(null)}
    >
      <article
        onMouseMove={handleSpotlightMove}
        className={cn(
          'spotlight group relative rounded-2xl border bg-card p-4 shadow-sm transition-opacity duration-300 md:p-5',
          leaving && 'opacity-0 scale-[0.98]',
        )}
      >
        {/* Role badge + posted time */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              isResume ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary',
            )}
          >
            {isResume ? <UserRound className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
            {roleLabel}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format.relativeTime(new Date(job.createdAt), now)}
          </span>
        </div>

        {/* Title opens the detail dialog — wraps instead of truncating so it
            stays fully readable down to a 320px-wide viewport. */}
        <DialogTrigger asChild>
          <button
            type="button"
            className="mt-2.5 block w-full break-words text-left text-2xl font-bold leading-tight tracking-tight transition-colors hover:text-primary focus-visible:outline-none focus-visible:text-primary"
          >
            {job.title}
          </button>
        </DialogTrigger>

        {/* Company + verified check */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Avatar name={subtitle} size="sm" />
          <span className="break-words font-medium text-foreground/80">{subtitle}</span>
          {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
        </div>

        {/* Salary — below the title like the reference hero card */}
        {job.salary && (
          <p className="mt-2 flex items-center gap-1.5 text-lg font-bold text-success">
            <Wallet className="h-4 w-4" />
            {job.salary}
          </p>
        )}

        {/* Spec rows — Daraja / Yo'nalish / Joylashuv (our own data) */}
        <div className="mt-4 space-y-2 border-t pt-3">
          <SpecRow label={t('filterLevel')}>
            <LevelBadge level={job.level} />
          </SpecRow>
          <SpecRow label={t('filterStack')}>
            {job.stacks.map((s) => (
              <StackBadge key={s} stack={s} />
            ))}
          </SpecRow>
          {job.location && (
            <SpecRow label={t('filterLocation')}>
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="break-words">{job.location}</span>
            </SpecRow>
          )}
        </div>

        {hasRating && rating && (
          <div className="mt-3">
            <RatingStars percentage={rating.bestPercentage} size="sm" />
          </div>
        )}

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {job.description}
        </p>

        {/* Footer action bar — Respond / Contact 50/50 + Heart + More */}
        <div className="mt-4 flex items-center gap-2 border-t pt-3">
          {/* Respond — primary (50%): opens the dialog and auto-triggers the apply flow */}
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={() => setIntent('apply')}
              className={cn(triggerBase, 'flex-1 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90')}
            >
              <UserRound className="h-4 w-4" />
              {tc('applyCta')}
            </button>
          </DialogTrigger>

          {/* Contact — light blue (50%): opens the dialog and jumps into the thread */}
          <DialogTrigger asChild>
            <button
              type="button"
              onClick={() => setIntent('contact')}
              className={cn(triggerBase, 'flex-1 bg-primary/10 text-primary hover:bg-primary/15')}
            >
              <MessageCircle className="h-4 w-4" />
              {tc('message')}
            </button>
          </DialogTrigger>

          <button
            type="button"
            onClick={() => favorites.toggle(job.id)}
            aria-label={saved ? t('favorited') : t('favorite')}
            aria-pressed={saved}
            title={saved ? t('favorited') : t('favorite')}
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/15',
              saved && 'bg-primary/10',
            )}
          >
            <Heart className={cn('h-5 w-5', saved && 'fill-current')} />
          </button>

          {/* More — dropdown menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t('more')}
              aria-expanded={menuOpen}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary/15"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={closeMenu}
                  aria-hidden="true"
                />
                <div className="absolute bottom-full right-0 z-20 mb-2 w-72 overflow-hidden rounded-2xl border bg-card shadow-xl">
                  <button
                    type="button"
                    onClick={hideVacancy}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-accent"
                  >
                    {t('hide')}
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {job.company && (
                    <button
                      type="button"
                      onClick={hideCompany}
                      className="flex w-full items-center justify-between gap-3 border-t px-4 py-3 text-sm font-semibold transition-colors hover:bg-accent"
                    >
                      {t('hideCompany')}
                      <Building className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      setReportError(null);
                      setReportOpen(true);
                    }}
                    className="flex w-full items-center justify-between gap-3 border-t px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5"
                  >
                    {t('reportAction')}
                    <Flag className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <ReportDialog
          jobTitle={job.title}
          open={reportOpen}
          onOpenChange={setReportOpen}
          onSubmit={submitReport}
          submitting={reportSubmitting}
          error={reportError}
        />
      </article>
    </JobDetailDialog>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:w-28">
        {label}
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium">
        {children}
      </span>
    </div>
  );
}
