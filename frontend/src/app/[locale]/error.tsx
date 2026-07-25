'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Site-wide error boundary (`[locale]` segment) — catches any render-time
 * exception that would otherwise show Next's generic error screen. Logs the
 * full error (message/stack/digest) to the browser console so a crash is
 * never silent, and offers a retry instead of a dead end.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- intentional: surface the real error instead of a blank screen.
    console.error('[locale error boundary]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
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
