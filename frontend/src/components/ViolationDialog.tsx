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
import type { ViolationType } from '@/types/test';

type ViolationKind = 'tab-switch' | ViolationType;

interface ViolationDialogProps {
  open: boolean;
  type: ViolationKind;
  onAcknowledge: () => void;
  count: number;
  maxCount: number | null;
}

const bodyKeyByType: Record<ViolationKind, string> = {
  'tab-switch': 'violationBody',
  'copy-paste': 'violationBodyCopyPaste',
  'right-click': 'violationBodyRightClick',
  'screenshot-key': 'violationBodyScreenshot',
  devtools: 'violationBodyDevtools',
  'bot-detected': 'violationBodyBot',
};

/**
 * Mandatory anti-cheat warning shown after a detected violation (tab-switch,
 * clipboard misuse, right-click, or a PrintScreen key press). Non-dismissible
 * via the close affordance — the candidate must acknowledge before continuing.
 */
export function ViolationDialog({
  open,
  type,
  onAcknowledge,
  count,
  maxCount,
}: ViolationDialogProps) {
  const t = useTranslations('proctor');
  const remaining = maxCount !== null ? Math.max(0, maxCount - count) : null;

  return (
    <Dialog open={open}>
      <DialogContent hideClose className="border-destructive/50">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center text-destructive">{t('violationTitle')}</DialogTitle>
          <DialogDescription className="text-center">
            {t(bodyKeyByType[type])}
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
