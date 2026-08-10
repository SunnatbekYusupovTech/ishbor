'use client';

import { useCallback, useState } from 'react';
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
  MessageSquare,
  Users,
  UserRoundCheck,
  CheckCircle2,
  LogIn,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError, tokenStore } from '@/lib/api';
import type { Job, JobDetail, Me } from '@/types/domain';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LevelBadge, StackBadge } from '@/components/badges';
import { RatingStars, Avatar } from '@/components/rating';
import { ApplyDialog } from '@/components/chat/ApplyDialog';
import { ApplicantsDialog } from '@/components/chat/ApplicantsDialog';

export function JobDetailDialog({
  job,
  children,
}: {
  job: Job;
  children: React.ReactNode;
}) {
  const t = useTranslations('jobs');
  const tc = useTranslations('chat');
  const tl = useTranslations('levels');
  const format = useFormatter();
  const router = useRouter();
  // Stable "now" shared by server/client render — avoids relativeTime hydration mismatch.
  const now = useNow();

  // Action state — fetched lazily when the dialog opens (never for every card).
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [applied, setApplied] = useState(false);
  // The thread created by MY apply call — fresher than `detail` (which was
  // fetched before the request existed), so "Xabarlarga o'tish" can deep-link
  // straight into it right after applying.
  const [appliedConversationId, setAppliedConversationId] = useState<string | null>(null);
  const [applicationCount, setApplicationCount] = useState(0);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applicantsOpen, setApplicantsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshActions = useCallback(async () => {
    try {
      const [d, m] = await Promise.all([
        api.getJob(job.id),
        tokenStore.get() ? api.me().catch(() => null) : Promise.resolve(null),
      ]);
      setDetail(d);
      setMe(m);
      setApplied(d.appliedByMe);
      setApplicationCount(d.applicationCount);
      setActionError(null);
    } catch {
      // The listing still renders without the action flags — non-fatal.
    }
  }, [job.id]);

  const onOpenChange = (open: boolean) => {
    if (open) void refreshActions();
  };

  const submitApply = async (message: string) => {
    setSubmitting(true);
    setActionError(null);
    try {
      const res = await api.applyToJob(job.id, message || undefined);
      setApplied(true);
      setAppliedConversationId(res.conversationId);
      setApplyOpen(false);
      setApplicationCount((c) => c + 1);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : tc('loadError'));
    } finally {
      setSubmitting(false);
    }
  };

  const openChat = async (userId: string, jobId?: string) => {
    try {
      const { id } = await api.startConversation(userId, jobId);
      router.push((`/messages?convo=${id}`) as '/');
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : tc('loadError'));
    }
  };

  const goToConversation = (conversationId: string) => {
    router.push((`/messages?convo=${conversationId}`) as '/');
  };

  const isResume = job.type === 'resume';
  const subtitle = isResume ? job.postedByName : job.company ?? job.postedByName;
  const roleLabel = isResume ? t('seeker') : t('employer');
  const rating = job.rating;
  const hasRating = !!rating && (rating.attempts > 0 || rating.bestPercentage > 0);

  const isMyListing = !!me && !!detail?.postedById && me.id === detail.postedById;
  const canApply = !!me && me.role === 'seeker' && detail?.type === 'vacancy' && !isMyListing && !applied;
  const canMessage = !!me && !isMyListing && !!detail?.postedById;

  return (
    <Dialog onOpenChange={onOpenChange}>
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

          {/* ── In-app request / chat / applicants actions ── */}
          {(detail || me) && (
            <div className="space-y-2 border-t pt-4">
              {isMyListing && detail?.type === 'vacancy' && (
                <Button
                  className="w-full gap-1.5"
                  onClick={() => setApplicantsOpen(true)}
                >
                  <Users className="h-4 w-4" />
                  {tc('applicants')} ({applicationCount})
                </Button>
              )}

              {!isMyListing && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {canApply && (
                    <Button
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        setActionError(null);
                        setApplyOpen(true);
                      }}
                    >
                      <UserRoundCheck className="h-4 w-4" />
                      {tc('applyCta')}
                    </Button>
                  )}
                  {applied && (
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={() => {
                        const convoId = appliedConversationId ?? detail?.myApplicationConversationId;
                        if (convoId) goToConversation(convoId);
                        else router.push('/messages' as '/');
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {tc('goToMessages')}
                    </Button>
                  )}
                  {canMessage && (
                    <Button
                      variant={canApply || applied ? 'outline' : 'default'}
                      className="flex-1 gap-1.5"
                      onClick={() => void openChat(detail!.postedById!, job.id)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      {tc('message')}
                    </Button>
                  )}
                </div>
              )}

              {!me && (
                <Button asChild variant="outline" className="w-full gap-1.5">
                  <Link href="/login">
                    <LogIn className="h-4 w-4" />
                    {tc('loginToApply')}
                  </Link>
                </Button>
              )}

              {actionError && <p className="text-xs text-destructive">{actionError}</p>}
            </div>
          )}

          <p className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {format.relativeTime(new Date(job.createdAt), now)} · {t('postedBy', { name: job.postedByName })}
          </p>
        </div>

        <ApplyDialog
          jobTitle={job.title}
          open={applyOpen}
          onOpenChange={setApplyOpen}
          onSubmit={submitApply}
          submitting={submitting}
          error={actionError}
        />
        <ApplicantsDialog
          jobId={job.id}
          jobTitle={job.title}
          open={applicantsOpen}
          onOpenChange={setApplicantsOpen}
          onMessage={goToConversation}
        />
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
