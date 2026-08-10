'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Flag, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export const REPORT_REASONS = ['spam', 'inappropriate', 'incorrect-salary', 'fake'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * "Report the vacancy" modal (More menu). The reporter picks one of the
 * predefined reasons and may add a note; submitted to `POST /jobs/:id/report`.
 * The listing itself is never modified — the report is stored for moderators.
 */
export function ReportDialog({
  jobTitle,
  open,
  onOpenChange,
  onSubmit,
  submitting,
  error,
}: {
  jobTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: ReportReason, note?: string) => Promise<void>;
  submitting: boolean;
  /** Submission error — shown INSIDE the modal. */
  error: string | null;
}) {
  const t = useTranslations('report');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setReason(null);
      setNote('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Flag className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription className="truncate">{jobTitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2" role="radiogroup" aria-label={t('title')}>
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => setReason(r)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                reason === r
                  ? 'border-destructive bg-destructive/5 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-destructive/40',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  reason === r ? 'border-destructive' : 'border-muted-foreground/40',
                )}
              >
                {reason === r && <span className="h-2 w-2 rounded-full bg-destructive" />}
              </span>
              {t(`reason.${r}`)}
            </button>
          ))}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t('notePlaceholder')}
          className="w-full resize-none rounded-xl border bg-card px-3.5 py-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => reason && void onSubmit(reason, note.trim() || undefined)}
            disabled={!reason || submitting}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            {submitting ? t('sending') : t('submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
