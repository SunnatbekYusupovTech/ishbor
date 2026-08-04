'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/** Minimal shape of the Google Identity Services global — see
 *  https://developers.google.com/identity/gsi/web/reference/js-reference */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: number;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

/**
 * "Continue with Google", styled to match the rest of the auth form instead
 * of Google's own boxy widget. GIS renders its real button inside a
 * cross-origin iframe (anti-clickjacking) — it can't be restyled with CSS,
 * and it can't be triggered by a synthetic `.click()` from our JS either.
 * So we render the *real* GIS button transparently, stretched to fill this
 * component, sitting on top of a purely decorative div underneath that
 * carries our own look — the user sees our button, but the click physically
 * lands on Google's own (invisible) one. Hover/press feedback on the fake
 * face is driven by mouse events on the wrapper (not CSS `:hover`, since the
 * iframe on top would otherwise swallow it) — `mouseenter`/`mouseleave` still
 * fire on the wrapper because they're evaluated against its box, not the
 * topmost hit-target, but `mousedown`/`mouseup` land inside the iframe and
 * never bubble out, so there's no separate "pressed" state.
 */
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const realButtonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Keep the latest callback in a ref so re-renders of the parent form (every
  // keystroke) don't force the button to be re-initialized/re-rendered.
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  // `next/script` dedups by `src` — if the GSI script was already loaded by
  // an earlier mount of this component (e.g. the user visited /login before
  // in this session, navigated away, then came back client-side), the tag
  // stays in the DOM and Next doesn't reliably re-fire `onLoad` for the new
  // mount. Without this, the button silently never appears until a full
  // page reload re-runs everything from scratch. So: check for the already-
  // loaded global directly on mount, with a short poll as a fallback for the
  // narrow window where the tag is present but still executing.
  useEffect(() => {
    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }
    const id = window.setInterval(() => {
      if (window.google?.accounts?.id) {
        setScriptLoaded(true);
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !window.google || !realButtonRef.current || !wrapperRef.current) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredentialRef.current(response.credential),
    });

    // Rendered at a fixed 400px (GSI's max) then stretched to fill the
    // wrapper via CSS below — GSI only accepts a literal pixel width, it
    // can't be told "100%".
    realButtonRef.current.replaceChildren();
    window.google.accounts.id.renderButton(realButtonRef.current, {
      type: 'standard',
      theme: resolvedTheme === 'dark' ? 'filled_black' : 'outline',
      size: 'large',
      width: 400,
      text: 'continue_with',
      locale,
    });
  }, [scriptLoaded, clientId, locale, resolvedTheme]);

  if (!clientId) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div
        ref={wrapperRef}
        className="relative isolate h-9 w-full"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Decorative face — matches the site's `Button variant="outline"` look. */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium shadow-sm transition-colors',
            hovered && 'bg-accent text-accent-foreground',
          )}
        >
          <GoogleGlyph className="h-4 w-4 shrink-0" />
          {t('continueWithGoogle')}
        </div>
        {/* The real, invisible, actually-clickable Google button on top. */}
        <div
          ref={realButtonRef}
          className="absolute inset-0 h-9 w-full overflow-hidden rounded-md opacity-0 [&>div]:!h-9 [&>div]:!w-full [&_iframe]:!h-9 [&_iframe]:!w-full"
        />
      </div>
    </>
  );
}

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.1-17.1 10.1z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.5 0 10.5-2.1 14.3-5.5l-6.6-5.6C29.6 34.8 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.9 39.6 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C39.9 37.4 44 32.5 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}
