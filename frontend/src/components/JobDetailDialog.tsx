'use client';

import { useCallback, useEffect, useState, type ElementType } from 'react';
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
  Heart,
  MoreHorizontal,
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
import { favorites, useIsFavorite } from '@/lib/favorites';
import { cn } from '@/lib/utils';

export function JobDetailDialog({
  job,
  onHide,
  intent,
  onIntentConsumed,
  mode = 'dialog',
  children,
}: {
  job: Job;
  onHide?: (id: string) => void;
  /** Preferred action requested by the card (Respond/Contact) — the dialog
   *  validates it against the freshly loaded state and auto-triggers. */
  intent?: 'apply' | 'contact' | null;
  onIntentConsumed?: () => void;
  /** `dialog` — full-screen overlay (default, used in the feed). `page` —
   *  standalone `/jobs/[id]` route: the same hero/body/action content is
   *  rendered inline WITHOUT the overlay. */
  mode?: 'dialog' | 'page';
  children?: React.ReactNode;
}) {
  const t = useTranslations('jobs');
  const tc = useTranslations('chat');
  const tl = useTranslations('levels');
  const format = useFormatter();
  const router = useRouter();
  // Stable "now" shared by server/client render — avoids relativeTime hydration mismatch.
  const now = useNow();
  const saved = useIsFavorite(job.id);

  // Controlled open so the bottom action bar can close the dialog (e.g. after Hide).
  const [open, setOpen] = useState(false);

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

  // Standalone /jobs/[id] page (mode="page"): no user click ever opens a
  // dialog, so the action flags must load on mount instead of in onOpenChange.
  useEffect(() => {
    if (mode === 'page') void refreshActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) void refreshActions();
  };

  // Consume a card-level intent (Respond / Contact) once the action flags are
  // freshly loaded: Respond auto-opens the apply dialog, Contact jumps straight
  // into the thread with the poster. Validated against the loaded state so the
  // dialog still shows the right default CTA when the intent isn't available.
  useEffect(() => {
    if (!open || !intent) return;
    if (!detail || !me) return;
    const isMyListing = !!detail.postedById && me.id === detail.postedById;
    const canApply = me.role === 'seeker' && detail.type === 'vacancy' && !isMyListing && !applied;
    const canMessage = !!detail.postedById && !isMyListing;
    if (intent === 'apply' && canApply) {
      setActionError(null);
      setApplyOpen(true);
    } else if (intent === 'contact' && canMessage) {
      void openChat(detail.postedById!, job.id);
    }
    onIntentConsumed?.();
  }, [open, intent, detail, me, applied]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const goToMessages = () => {
    const convoId = appliedConversationId ?? detail?.myApplicationConversationId;
    if (convoId) goToConversation(convoId);
    else router.push('/messages' as '/');
  };

  const isResume = job.type === 'resume';
  const subtitle = isResume ? job.postedByName : job.company ?? job.postedByName;
  const roleLabel = isResume ? t('seeker') : t('employer');
  const rating = job.rating;
  const hasRating = !!rating && (rating.attempts > 0 || rating.bestPercentage > 0);

  const isMyListing = !!me && !!detail?.postedById && me.id === detail.postedById;
  const canApply = !!me && me.role === 'seeker' && detail?.type === 'vacancy' && !isMyListing && !applied;
  const canMessage = !!me && !isMyListing && !!detail?.postedById;
  const showApplicants = isMyListing && detail?.type === 'vacancy';

  const isPage = mode === 'page';

  const heroCls = isResume
    ? 'bg-gradient-to-br from-success/15 via-success/5 to-transparent px-6 pb-5 pt-6'
    : 'bg-gradient-to-br from-primary/15 via-primary/5 to-transparent px-6 pb-5 pt-6';
  const roleBadgeCls = isResume
    ? 'inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success'
    : 'inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary';

  // The hero uses Radix Dialog* primitives in overlay mode (screen-reader
  // labelling) but plain h1/p/div on the standalone page — the primitives
  // throw outside their Dialog context.
  const HeaderTag: ElementType = isPage ? 'div' : DialogHeader;
  const TitleTag: ElementType = isPage ? 'h1' : DialogTitle;
  const DescriptionTag: ElementType = isPage ? 'p' : DialogDescription;

  const hero = (
    <div className={heroCls}>
      <HeaderTag className="space-y-0 text-left">
        <span className={roleBadgeCls}>{roleLabel}</span>

        <TitleTag className="mt-2 text-2xl font-bold leading-tight">{job.title}</TitleTag>

        <DescriptionTag className="mt-1 flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{subtitle}</span>
        </DescriptionTag>

        {job.salary && (
          <p className="mt-3 flex items-center gap-1.5 text-xl font-bold text-success">
            <Wallet className="h-5 w-5" />
            {job.salary}
          </p>
        )}

        {/* Spec rows */}
        <div className="mt-5 space-y-2.5 border-t pt-4">
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
      </HeaderTag>
    </div>
  );

  const content = (
    <>
      {hero}

      {/* Body */}
      <div className={cn('space-y-5 px-6 py-5', !isPage && 'max-h-[45vh] overflow-y-auto')}>
          {/* Rating panel */}
          {hasRating && rating ? (
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
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

        {/* Bottom action bar — Respond / Contact / Heart / More */}
        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2">
            {showApplicants ? (
              <Button className="h-12 flex-1 gap-1.5" onClick={() => setApplicantsOpen(true)}>
                <Users className="h-5 w-5" />
                {tc('applicants')} ({applicationCount})
              </Button>
            ) : canApply ? (
              <Button
                className="h-12 flex-1 gap-1.5"
                onClick={() => {
                  setActionError(null);
                  setApplyOpen(true);
                }}
              >
                <UserRoundCheck className="h-5 w-5" />
                {tc('applyCta')}
              </Button>
            ) : applied ? (
              <Button variant="outline" className="h-12 flex-1 gap-1.5" onClick={goToMessages}>
                <CheckCircle2 className="h-5 w-5 text-success" />
                {tc('applied')}
              </Button>
            ) : !me ? (
              <Button asChild className="h-12 flex-1 gap-1.5">
                <Link href="/login">
                  <LogIn className="h-5 w-5" />
                  {tc('loginToApply')}
                </Link>
              </Button>
            ) : canMessage ? (
              <Button
                className="h-12 flex-1 gap-1.5"
                onClick={() => void openChat(detail!.postedById!, job.id)}
              >
                <MessageSquare className="h-5 w-5" />
                {tc('message')}
              </Button>
            ) : (
              <div className="h-12 flex-1" />
            )}

            {/* Secondary "Contact" (light-blue) — only when the primary action is Apply */}
            {canApply && canMessage && (
              <Button
                variant="secondary"
                className="h-12 flex-1 gap-1.5 bg-primary/10 text-primary shadow-none hover:bg-primary/15"
                onClick={() => void openChat(detail!.postedById!, job.id)}
              >
                <MessageSquare className="h-5 w-5" />
                {tc('message')}
              </Button>
            )}

            {/* Heart — save */}
            <button
              type="button"
              onClick={() => favorites.toggle(job.id)}
              aria-label={saved ? t('favorited') : t('favorite')}
              aria-pressed={saved}
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                saved
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
              )}
            >
              <Heart className={cn('h-5 w-5', saved && 'fill-current')} />
            </button>

            {/* More — hide listing */}
            {onHide && (
              <div className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    onHide(job.id);
                    setOpen(false);
                  }}
                  aria-label={t('hide')}
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {t('hide')}
                  <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </span>
              </div>
            )}
          </div>

          {actionError && <p className="mt-2 text-xs text-destructive">{actionError}</p>}
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
    </>
  );

  // Standalone /jobs/[id] page — same content, no overlay.
  if (isPage) {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">{content}</DialogContent>
    </Dialog>
  );
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-medium">
        {children}
      </span>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-background p-2">
      <div className="flex items-center justify-center text-muted-foreground">{icon}</div>
      <p className="mt-1 break-words text-center text-sm font-bold leading-tight">{value}</p>
      <p className="break-words text-center text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
