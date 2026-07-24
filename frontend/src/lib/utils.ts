import type { MouseEvent } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TIERS, type Direction, type VerificationLevel } from '@/types/domain';

/** Merge conditional class names and de-duplicate conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Pair with the `.spotlight` CSS class (`globals.css`) for a hover glow that
 * tracks the cursor instead of lighting the whole border evenly — sets the
 * `--spot-x`/`--spot-y` custom properties the class's gradients read.
 */
export function handleSpotlightMove(e: MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
  el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
}

/** The tier shown as a user's single headline badge: their `primaryDirection`'s
 *  tier if set, else the highest tier they hold across any direction. */
export function displayTier(
  verificationLevels: Record<Direction, VerificationLevel>,
  primaryDirection: Direction | null,
): VerificationLevel {
  if (primaryDirection) return verificationLevels[primaryDirection];
  let best: VerificationLevel = TIERS[0];
  for (const tier of Object.values(verificationLevels)) {
    if (TIERS.indexOf(tier) > TIERS.indexOf(best)) best = tier;
  }
  return best;
}
