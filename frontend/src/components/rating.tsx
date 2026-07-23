'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveImageUrl } from '@/lib/images';

/** Map a 0–100 test percentage onto a 0–5 star scale. */
export function percentToStars(percentage: number): number {
  return Math.round((Math.max(0, Math.min(100, percentage)) / 20) * 10) / 10;
}

interface RatingStarsProps {
  /** Best test percentage (0–100). */
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  /** Show the numeric "4.6" label next to the stars. */
  showValue?: boolean;
  className?: string;
}

const starSize = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' } as const;
const valueSize = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' } as const;

/**
 * A 5-star rating derived from the user's best assessment score. The filled
 * layer is clipped to the exact fractional width, giving smooth half-stars.
 */
export function RatingStars({ percentage, size = 'md', showValue = true, className }: RatingStarsProps) {
  const stars = percentToStars(percentage);
  const fillPct = (stars / 5) * 100;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="relative inline-flex">
        {/* empty layer */}
        <div className="flex text-muted-foreground/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn(starSize[size], 'fill-current')} />
          ))}
        </div>
        {/* filled layer, clipped to the score */}
        <div
          className="absolute inset-0 flex overflow-hidden text-amber-400"
          style={{ width: `${fillPct}%` }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn(starSize[size], 'shrink-0 fill-current')} />
          ))}
        </div>
      </div>
      {showValue && (
        <span className={cn('font-semibold tabular-nums text-foreground', valueSize[size])}>
          {stars.toFixed(1)}
        </span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-rose-500',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-pink-500',
  'from-amber-500 to-orange-600',
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic gradient so the same name always gets the same colour. */
function gradientFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const avatarSize = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-24 w-24 text-3xl sm:h-28 sm:w-28',
} as const;

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  /** Profile picture URL — falls back to the initials gradient when absent
   *  or when the image fails to load (broken/expired link). */
  src?: string | null;
  size?: keyof typeof avatarSize;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Uploaded avatars are stored origin-less (`/uploads/…`); external ones pass through.
  const resolved = resolveImageUrl(src);
  const showImage = !!resolved && !failed;

  return (
    <div
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-white shadow-sm ring-2 ring-background',
        !showImage && gradientFor(name),
        avatarSize[size],
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        // User-supplied remote URL; next/image would need every possible host
        // allow-listed in next.config up front.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}
