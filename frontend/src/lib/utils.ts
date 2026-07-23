import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TIERS, type Direction, type VerificationLevel } from '@/types/domain';

/** Merge conditional class names and de-duplicate conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
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
