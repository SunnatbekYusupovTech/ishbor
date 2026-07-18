'use client';

import { useTranslations } from 'next-intl';
import type { Level, Stack, VerificationLevel } from '@/types/domain';
import { cn } from '@/lib/utils';

const levelStyles: Record<Level, string> = {
  junior: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  middle: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  senior: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

const stackStyles: Record<Stack, string> = {
  frontend: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  backend: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  fullstack: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  mobile: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
};

const base = 'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize';

export function LevelBadge({ level }: { level: Level }) {
  const t = useTranslations('levels');
  return <span className={cn(base, levelStyles[level])}>{t(level)}</span>;
}

export function StackBadge({ stack }: { stack: Stack }) {
  const t = useTranslations('stacks');
  return <span className={cn(base, stackStyles[stack])}>{t(stack)}</span>;
}

/** Verification badge used on the leaderboard. */
export function VerifiedBadge({ level }: { level: VerificationLevel }) {
  const t = useTranslations('levels');
  if (level === 'none') {
    return <span className={cn(base, 'bg-muted text-muted-foreground')}>{t('none')}</span>;
  }
  return <span className={cn(base, levelStyles[level])}>{t(level)}</span>;
}
