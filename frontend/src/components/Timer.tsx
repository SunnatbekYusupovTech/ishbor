'use client';

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerProps {
  formatted: string;
  secondsLeft: number;
}

/** Countdown badge that turns urgent (destructive) in the final minute. */
export function Timer({ formatted, secondsLeft }: TimerProps) {
  const urgent = secondsLeft <= 60;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-lg font-semibold tabular-nums',
        urgent ? 'animate-pulse bg-destructive/10 text-destructive' : 'bg-muted text-foreground',
      )}
      role="timer"
      aria-live="polite"
    >
      <Clock className="h-4 w-4" aria-hidden />
      {formatted}
    </div>
  );
}
