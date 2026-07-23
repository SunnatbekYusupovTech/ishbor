'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { MessageSquare, Star, Trash2 } from 'lucide-react';
import type { ProfileReview } from '@/types/domain';
import { api, ApiError, tokenStore } from '@/lib/api';
import { Avatar } from '@/components/rating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, inputCls } from '@/components/form-field';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** Static 1–5 star display (reviews are whole stars, unlike the % rating). */
function Stars({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn('flex', className)} aria-label={`${rating}/5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            'h-4 w-4',
            i < rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  );
}

/**
 * Reviews left by other users. A visitor may leave exactly one review per
 * profile — posting again replaces it server-side (unique `(target, author)`
 * index), which is why the button reads "edit" once they have one.
 */
export function ReviewsSection({
  handle,
  reviews,
  isOwner,
  onChange,
}: {
  /** `@username` or id — whichever the page was opened with. */
  handle: string;
  reviews: ProfileReview[];
  isOwner: boolean;
  onChange: (reviews: ProfileReview[]) => void;
}) {
  const t = useTranslations('freelancer');
  const [writing, setWriting] = useState(false);
  const [deleting, setDeleting] = useState<ProfileReview | null>(null);

  const signedIn = !!tokenStore.get();
  const mine = reviews.find((r) => r.isMine) ?? null;
  const average = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const handleSaved = (review: ProfileReview) => {
    onChange(
      reviews.some((r) => r.id === review.id)
        ? reviews.map((r) => (r.id === review.id ? review : r))
        : [review, ...reviews],
    );
    setWriting(false);
  };

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-1.5 text-base font-semibold">
            <MessageSquare className="h-4 w-4" />
            {t('reviews')}
            {reviews.length > 0 && (
              <span className="ml-1 flex items-center gap-1 text-sm font-normal text-muted-foreground">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="font-semibold tabular-nums text-foreground">
                  {average.toFixed(1)}
                </span>
                · {t('reviewCount', { count: reviews.length })}
              </span>
            )}
          </h2>

          {/* You can't review yourself — the API rejects it with a 403. */}
          {!isOwner && signedIn && (
            <Button size="sm" variant={mine ? 'outline' : 'default'} onClick={() => setWriting(true)}>
              {mine ? t('editReview') : t('leaveReview')}
            </Button>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed px-4 py-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">{t('reviewsEmpty')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isOwner ? t('reviewsEmptyOwner') : t('reviewsEmptyHint')}
            </p>
          </div>
        ) : (
          <ul className="mt-5 divide-y">
            {reviews.map((review) => (
              <ReviewRow key={review.id} review={review} onDelete={() => setDeleting(review)} />
            ))}
          </ul>
        )}
      </CardContent>

      {writing && (
        <ReviewFormDialog
          handle={handle}
          existing={mine}
          onClose={() => setWriting(false)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <DeleteReviewDialog
          review={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={(id) => {
            onChange(reviews.filter((r) => r.id !== id));
            setDeleting(null);
          }}
        />
      )}
    </Card>
  );
}

function ReviewRow({ review, onDelete }: { review: ProfileReview; onDelete: () => void }) {
  const t = useTranslations('freelancer');
  const format = useFormatter();

  return (
    <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <Avatar name={review.authorName} src={review.authorAvatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="break-words font-semibold">{review.authorName}</span>
          <span className="text-xs text-muted-foreground">
            {/* Numeric — Chrome has no Uzbek month names (see ProfileSidebar). */}
            {format.dateTime(new Date(review.createdAt), {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })}
          </span>
        </div>
        <Stars rating={review.rating} className="mt-1" />
        <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">
          {review.text}
        </p>
        {review.isMine && (
          <button
            type="button"
            onClick={onDelete}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-destructive underline-offset-2 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('deleteReview')}
          </button>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */

function ReviewFormDialog({
  handle,
  existing,
  onClose,
  onSaved,
}: {
  handle: string;
  existing: ProfileReview | null;
  onClose: () => void;
  onSaved: (review: ProfileReview) => void;
}) {
  const t = useTranslations('freelancer');
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [text, setText] = useState(existing?.text ?? '');
  const [textError, setTextError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setTextError(t('errReviewTextRequired'));
      return;
    }
    setTextError(null);
    setError(null);
    setSaving(true);
    try {
      onSaved(await api.addReview(handle, { rating, text: text.trim() }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? t('editReview') : t('leaveReview')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} noValidate className="space-y-4">
          <fieldset>
            <legend className="mb-1 block text-sm font-medium">{t('ratingLabel')}</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value}/5`}
                  aria-pressed={rating === value}
                  className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <Star
                    className={cn(
                      'h-7 w-7',
                      value <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30',
                    )}
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <Field label={t('reviewText')} error={textError ?? undefined}>
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setTextError(null);
              }}
              rows={4}
              maxLength={1000}
              aria-invalid={!!textError}
              className={cn(inputCls, 'resize-y')}
            />
          </Field>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteReviewDialog({
  review,
  onClose,
  onDeleted,
}: {
  review: ProfileReview;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const t = useTranslations('freelancer');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteReview(review.id);
      onDeleted(review.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('deleteError'));
      setDeleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('deleteReview')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('deleteReviewConfirm')}</p>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting}>
            {deleting ? t('saving') : t('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
