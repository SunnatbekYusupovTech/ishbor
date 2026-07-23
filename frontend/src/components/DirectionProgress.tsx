'use client';

import { useTranslations } from 'next-intl';
import type { Direction, VerificationLevel } from '@/types/domain';
import { TIERS } from '@/types/domain';
import { cn } from '@/lib/utils';

/**
 * Simple width-based "you are here" progress bar for one direction's tier —
 * fill width is the tier's rank out of the 6 non-"none" tiers (0% at
 * "none", 100% at strong-senior). Six faint tick marks show where each
 * tier sits along the bar.
 */
export function DirectionProgress({
  direction,
  tier,
  highlighted,
}: {
  direction: Direction;
  tier: VerificationLevel;
  highlighted?: boolean;
}) {
  const t = useTranslations('levels');
  const ts = useTranslations('stacks');
  const rank = TIERS.indexOf(tier); // 0 ('none') .. 6 ('strong-senior')
  const pct = (rank / (TIERS.length - 1)) * 100;

  return (
    <div
      className={cn(
        'rounded-xl border p-3.5 transition-colors',
        highlighted ? 'border-primary bg-primary/5' : 'bg-card',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{ts(direction)}</span>
        <span
          className={cn(
            'text-xs font-medium',
            rank === 0 ? 'text-muted-foreground' : 'text-primary',
          )}
        >
          {t(tier)}
        </span>
      </div>
      <div className="relative mt-2.5 h-2 rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', rank > 0 && 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
        {/* Tick marks for each of the 6 tiers. */}
        <div className="absolute inset-0 flex items-center justify-between px-0.5">
          {TIERS.slice(1).map((tt) => (
            <span key={tt} className="h-2.5 w-0.5 rounded-full bg-background/70" />
          ))}
        </div>
      </div>
    </div>
  );
}
