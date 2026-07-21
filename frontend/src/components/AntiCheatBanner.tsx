'use client';

import { useTranslations } from 'next-intl';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface AntiCheatBannerProps {
  tabSwitchCount: number;
  maxTabSwitches: number | null;
  /** Non-tab-switch violations: copy/paste, right-click, PrintScreen, ... */
  violationCount?: number;
  maxViolations?: number | null;
  connected: boolean;
}

/** Live integrity indicator: connection health + tab-switch/violation budget (shadcn Alert). */
export function AntiCheatBanner({
  tabSwitchCount,
  maxTabSwitches,
  violationCount = 0,
  maxViolations = null,
  connected,
}: AntiCheatBannerProps) {
  const t = useTranslations('proctor');
  const tabRemaining =
    maxTabSwitches !== null ? Math.max(0, maxTabSwitches - tabSwitchCount) : null;
  const violationRemaining =
    maxViolations !== null ? Math.max(0, maxViolations - violationCount) : null;
  const remaining =
    tabRemaining !== null && violationRemaining !== null
      ? Math.min(tabRemaining, violationRemaining)
      : (tabRemaining ?? violationRemaining);
  const danger = remaining !== null && remaining <= 1;

  return (
    <Alert variant={danger ? 'destructive' : 'warning'} className="flex items-center gap-3 py-2.5">
      {danger ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      <AlertDescription className="flex flex-1 flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-destructive')}
            aria-hidden
          />
          {connected ? t('active') : t('reconnecting')}
        </span>
        <span className="font-medium">
          {t('tabSwitches', {
            count: tabSwitchCount,
            max: maxTabSwitches === null ? t('limitUnknown') : String(maxTabSwitches),
          })}
          {maxViolations !== null &&
            ` · ${t('violations', { count: violationCount, max: maxViolations })}`}
          {remaining !== null && ` — ${t('warningsLeft', { remaining })}`}
        </span>
      </AlertDescription>
    </Alert>
  );
}
