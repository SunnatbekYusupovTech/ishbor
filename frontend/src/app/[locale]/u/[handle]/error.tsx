'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

/**
 * Route-specific error boundary for `/u/[handle]` — nearer than the shared
 * `[locale]/error.tsx`, so it wins for any render-time exception thrown by
 * this page or its children (ProfileHeader, StacksSection, etc.). Logs the
 * handle alongside the error so a crash on one specific profile is
 * distinguishable from a systemic one.
 */
export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams<{ handle: string }>();

  useEffect(() => {
    // eslint-disable-next-line no-console -- intentional: this page 500'd in prod with zero server logs; this is the fallback visibility.
    console.error('[profile page error boundary]', {
      handle: params.handle,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error, params.handle]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <h1 className="text-lg font-semibold">Couldn&apos;t load this profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">{error.message || 'Unexpected error.'}</p>
      {error.digest && (
        <p className="mt-1 text-xs text-muted-foreground/60">Error ID: {error.digest}</p>
      )}
      <Button className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
