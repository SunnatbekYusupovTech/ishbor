'use client';

import { useTranslations, useFormatter, useNow } from 'next-intl';
import {
  Phone,
  Send,
  Building2,
  Wallet,
  Clock,
  Award,
  Target,
  Repeat,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import type { Job } from '@/types/domain';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LevelBadge, StackBadge } from '@/components/badges';
import { RatingStars, Avatar } from '@/components/rating';

export function JobDetailDialog({
  job,
  children,
}: {
  job: Job;
  children: React.ReactNode;
}) {
  const t = useTranslations('jobs');
  const tl = useTranslations('levels');
  const format = useFormatter();
  // Stable "now" shared by server/client render — avoids relativeTime hydration mismatch.
  const now = useNow();

  const isResume = job.type === 'resume';
  const subtitle = isResume ? job.postedByName : job.company ?? job.postedByName;
  const roleLabel = isResume ? t('seeker') : t('employer');
  const rating = job.rating;
  const hasRating = !!rating && (rating.attempts > 0 || rating.bestPercentage > 0);

  return (
    <Dialog>
      {children}
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {/* Accent header band — indigo for employers, emerald for seekers */}
        <div
          className={
            isResume
              ? 'bg-gradient-to-br from-success/15 via-success/5 to-transparent px-6 pb-5 pt-6'
              : 'bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pb-5 pt-6'
          }
        >
          <DialogHeader className="space-y-0 text-left">
            <div className="flex items-start gap-4">
              <Avatar name={subtitle} size="lg" />
              <div className="min-w-0 flex-1">
                <span
                  className={
                    isResume
                      ? 'inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success'
                      : 'inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary'
                  }
                >
                  {roleLabel}
                </span>
                <DialogTitle className="mt-1.5 text-xl leading-tight">{job.title}</DialogTitle>
                <DialogDescription className="mt-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{subtitle}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[65vh] space-y-5 overflow-y-auto px-6 pb-6 pt-5">
          {/* Rating panel */}
          {hasRating && rating ? (
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Award className="h-4 w-4 text-amber-500" />
                  {t('rating')}
                </span>
                <RatingStars percentage={rating.bestPercentage} size="md" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat icon={<ShieldCheck className="h-4 w-4" />} value={
                  rating.verificationLevel === 'none' ? t('notVerified') : tl(rating.verificationLevel)
                } label={t('verified')} />
                <Stat icon={<Target className="h-4 w-4" />} value={`${rating.bestPercentage}%`} label={t('bestScore')} />
                <Stat icon={<Repeat className="h-4 w-4" />} value={String(rating.attempts)} label={t('attempts')} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-3 text-center text-xs text-muted-foreground">
              {t('noRating')}
            </div>
          )}

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2">
            <LevelBadge level={job.level} />
            <StackBadge stack={job.stack} />
            {job.salary && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                <Wallet className="h-3.5 w-3.5" />
                {job.salary}
              </span>
            )}
          </div>

          {/* Location */}
          {job.location && (
            <div>
              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('filterLocation')}
              </h4>
              <p className="flex items-center gap-1.5 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {job.location}
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('description')}
            </h4>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {job.description}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('contact')}
            </h4>
            {job.contactTelegram || job.contactPhone ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                {job.contactTelegram && (
                  <a
                    href={`https://t.me/${job.contactTelegram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" />
                    {job.contactTelegram}
                  </a>
                )}
                {job.contactPhone && (
                  <a
                    href={`tel:${job.contactPhone}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent"
                  >
                    <Phone className="h-4 w-4" />
                    {job.contactPhone}
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noContact')}</p>
            )}
          </div>

          <p className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format.relativeTime(new Date(job.createdAt), now)} · {t('postedBy', { name: job.postedByName })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-lg bg-background p-2">
      <div className="flex items-center justify-center text-muted-foreground">{icon}</div>
      <p className="mt-1 truncate text-sm font-bold leading-tight">{value}</p>
      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
