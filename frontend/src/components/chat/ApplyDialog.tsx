'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, UserRoundCheck } from 'lucide-react';
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

/**
 * Seeker → employer request dialog. The cover message doubles as the first
 * message of the auto-created chat thread; the employer sees the seeker's
 * FULL profile form alongside it (see `ApplicantsDialog`).
 */
export function ApplyDialog({
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
  onSubmit: (message: string) => Promise<void>;
  submitting: boolean;
  /** Submission error — shown INSIDE the modal (it would be hidden behind it otherwise). */
  error: string | null;
}) {
  const t = useTranslations('chat');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) setMessage('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserRoundCheck className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>{t('applyTitle')}</DialogTitle>
              <DialogDescription className="truncate">{jobTitle}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={t('applyPlaceholder')}
          className="w-full resize-none rounded-xl border bg-card px-3.5 py-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
        />
        <p className="text-xs text-muted-foreground">{t('applyHint')}</p>
        <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
          {message.length.toLocaleString()}/1000
        </p>

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
            onClick={() => void onSubmit(message.trim())}
            disabled={submitting}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            {submitting ? t('sending') : t('applyCta')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
