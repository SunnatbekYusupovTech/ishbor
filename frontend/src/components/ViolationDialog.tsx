'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ViolationDialogProps {
  open: boolean;
  onAcknowledge: () => void;
  tabSwitchCount: number;
  maxTabSwitches: number | null;
}

/**
 * Mandatory anti-cheat warning shown after a detected tab/visibility violation.
 * Non-dismissible via the close affordance — the candidate must acknowledge.
 */
export function ViolationDialog({
  open,
  onAcknowledge,
  tabSwitchCount,
  maxTabSwitches,
}: ViolationDialogProps) {
  const t = useTranslations('proctor');
  const remaining = maxTabSwitches !== null ? Math.max(0, maxTabSwitches - tabSwitchCount) : null;

  return (
    <Dialog open={open}>
      <DialogContent hideClose className="border-destructive/50">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center text-destructive">{t('violationTitle')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('violationBody')}
            {remaining !== null && <> {t('violationRemaining', { remaining })}</>}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" className="w-full" onClick={onAcknowledge}>
            {t('acknowledge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
