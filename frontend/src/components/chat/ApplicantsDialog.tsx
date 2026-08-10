'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useFormatter, useNow } from 'next-intl';
import {
  MapPin,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ExternalLink,
  Briefcase,
  Star,
  Users,
  UserRoundCheck,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import type { JobApplication, ApplicationStatus } from '@/types/domain';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, RatingStars } from '@/components/rating';
import { VerifiedBadge } from '@/components/badges';
import { cn, displayTier } from '@/lib/utils';
import { resolveImageUrl } from '@/lib/images';

const statusStyles: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

/**
 * The vacancy's own employer reviews every request here — each card carries
 * the seeker's FULL profile form (skills, verification levels, portfolio,
 * reviews, location, ...) alongside the request's status and accept/reject
 * controls, so a request arrives with the candidate's whole picture.
 */
export function ApplicantsDialog({
  jobId,
  jobTitle,
  open,
  onOpenChange,
  onMessage,
}: {
  jobId: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Jump to the request's live chat thread. */
  onMessage: (conversationId: string) => void;
}) {
  const t = useTranslations('chat');
  const format = useFormatter();
  const now = useNow();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .listJobApplications(jobId)
      .then((res) => alive && setApplications(res.applications))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : t('loadError')))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `t` is a stable reference; only the dialog open + job id should refetch.
  }, [open, jobId]);

  const decide = async (id: string, status: ApplicationStatus) => {
    try {
      const res = await api.updateApplication(id, status);
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status: res.status } : a)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('loadError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>{t('applicants')}</DialogTitle>
              <DialogDescription className="truncate">{jobTitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="scrollbar-hide max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl border bg-muted/40" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <UserRoundCheck className="h-10 w-10 opacity-40" />
              <p className="text-sm">{t('noApplicants')}</p>
            </div>
          ) : (
            applications.map((app) =>
              app.seeker ? (
                <ApplicantCard
                  key={app.id}
                  app={app}
                  formatTime={(iso) => format.relativeTime(new Date(iso), now)}
                  onDecide={decide}
                  onMessage={onMessage}
                />
              ) : (
                <p key={app.id} className="text-sm text-muted-foreground">
                  {t('deletedAccount')}
                </p>
              ),
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One request with the seeker's full profile form attached. */
function ApplicantCard({
  app,
  formatTime,
  onDecide,
  onMessage,
}: {
  app: JobApplication;
  formatTime: (iso: string) => string;
  onDecide: (id: string, status: ApplicationStatus) => void;
  onMessage: (conversationId: string) => void;
}) {
  const t = useTranslations('chat');
  const seeker = app.seeker!;
  const handle = seeker.username ?? seeker.id;
  const headline = displayTier(seeker.verificationLevels, seeker.primaryDirection);
  const hasReviews = seeker.reviewCount > 0;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* ── Full profile form header ── */}
      <div className="border-b bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4">
        <div className="flex items-start gap-3.5">
          <Avatar name={seeker.name} src={seeker.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold">{seeker.name}</p>
              {seeker.isOnline && (
                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {t('online')}
                </span>
              )}
            </div>
            {seeker.specialization && (
              <p className="truncate text-sm font-medium text-muted-foreground">{seeker.specialization}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VerifiedBadge level={headline} />
              {seeker.bestPercentage > 0 && <RatingStars percentage={seeker.bestPercentage} size="sm" />}
              <Link
                href={`/u/${handle}` as '/'}
                className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <ExternalLink className="h-3 w-3" />
                @{handle}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {seeker.country && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {seeker.country}
            </span>
          )}
          {seeker.language && (
            <span className="flex items-center gap-1">
              <Globe className="h-3.5 w-3.5" /> {seeker.language}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatTime(app.createdAt)}
          </span>
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        {/* Skills */}
        {seeker.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {seeker.skills.slice(0, 12).map((s) => (
              <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                {s}
              </span>
            ))}
            {seeker.skills.length > 12 && (
              <span className="rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
                +{seeker.skills.length - 12}
              </span>
            )}
          </div>
        )}

        {/* About */}
        {seeker.about && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{seeker.about}</p>
        )}

        {/* Portfolio */}
        {seeker.portfolio.length > 0 && (
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" /> {t('portfolio')}
            </h4>
            <div className="flex gap-2 overflow-hidden">
              {seeker.portfolio.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  title={item.title}
                  className="h-16 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted/40"
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resolveImageUrl(item.imageUrl) ?? undefined} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] text-muted-foreground">
                      {item.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {hasReviews && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-amber-400" />
            {seeker.reviewAverage.toFixed(1)} · {t('reviewsCount', { count: seeker.reviewCount })}
          </p>
        )}

        {/* The request's cover message — also the first chat message. */}
        {app.message && (
          <blockquote className="rounded-xl border-l-2 border-primary bg-muted/40 px-3.5 py-2.5 text-sm italic text-foreground/80">
            “{app.message}”
          </blockquote>
        )}

        {/* Status + actions */}
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold capitalize',
              statusStyles[app.status],
            )}
          >
            {t(`status_${app.status}`)}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMessage(app.conversationId)}
              className="gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t('message')}
            </Button>
            {app.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void onDecide(app.id, 'rejected')}
                  className="gap-1.5 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {t('reject')}
                </Button>
                <Button size="sm" onClick={() => void onDecide(app.id, 'accepted')} className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('accept')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
