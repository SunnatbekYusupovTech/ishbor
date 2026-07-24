'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, UserX } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import type { Direction, FreelancerProfile, PortfolioItem, ProfileReview } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { StacksSection } from '@/components/profile/StacksSection';
import { AboutSection } from '@/components/profile/AboutSection';
import { SocialLinksSection } from '@/components/profile/SocialLinksSection';
import { PortfolioSection } from '@/components/profile/PortfolioSection';
import { ProfileSidebar } from '@/components/profile/ProfileSidebar';
import { ReviewsSection } from '@/components/profile/ReviewsSection';
import { AccountSection } from '@/components/profile/AccountSection';
import { EditProfileDialog } from '@/components/profile/EditProfileDialog';

/**
 * Public freelancer profile — `/u/<username>` (or `/u/<user-id>` for accounts
 * that never picked a username).
 *
 * Readable signed-out; the response's `isOwner` flag is what turns on the
 * add/edit/delete affordances. Every mutation is additionally owner-scoped
 * server-side, so this is presentation rather than the security boundary.
 */
export default function FreelancerProfilePage() {
  const t = useTranslations('freelancer');
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const handle = params.handle;

  const [profile, setProfile] = useState<FreelancerProfile | null>(null);
  const [account, setAccount] = useState<{ name: string; email: string; isQaTester?: boolean } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getProfile(handle)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        // `FreelancerProfile` doesn't carry `email`/`isQaTester` (those are
        // account-only, not part of the public response) — one extra call,
        // only for the owner, to feed the account-settings section.
        if (data.isOwner) {
          api
            .me()
            .then((me) => {
              if (!cancelled) setAccount({ name: me.name, email: me.email, isQaTester: me.isQaTester });
            })
            .catch(() => {
              /* Account section just won't render if this fails. */
            });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t('loadError'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [handle, t]);

  const patchProfile = useCallback((changes: Partial<FreelancerProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...changes } : prev));
  }, []);

  const onProfileSaved = (changes: Partial<FreelancerProfile>) => {
    patchProfile(changes);
    setEditing(false);
    // Renaming the handle would leave the URL pointing at a username that no
    // longer resolves — move the address bar with it.
    if (changes.username && changes.username !== handle) {
      router.replace(`/u/${changes.username}` as '/');
    }
  };

  const onPortfolioChange = (portfolio: PortfolioItem[]) => patchProfile({ portfolio });

  const onReviewsChange = (reviews: ProfileReview[]) =>
    patchProfile({
      reviews,
      reviewCount: reviews.length,
      reviewAverage: reviews.length
        ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
        : 0,
    });

  const onPickDirection = (direction: Direction) => {
    if (!profile || profile.primaryDirection === direction) return;
    const prev = profile;
    patchProfile({ primaryDirection: direction }); // optimistic
    api.updateMe({ primaryDirection: direction }).catch(() => setProfile(prev));
  };

  // Re-run the hash scroll once loading settles, and again once `account`
  // arrives: that section (`#account`) mounts a beat later than the rest
  // (it waits on a second, owner-only `api.me()` call), so the browser's
  // own on-load hash scroll can fire before it exists in the DOM.
  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const id = requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    });
    return () => cancelAnimationFrame(id);
  }, [loading, account]);

  if (loading) return <ProfileSkeleton />;

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <UserX className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h1 className="mt-4 text-lg font-semibold">{t('notFound')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error ?? t('notFoundHint')}</p>
        <Button asChild variant="outline" className="mt-5">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            {t('backToJobs')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <ProfileHeader profile={profile} onEdit={() => setEditing(true)} />

      <StacksSection profile={profile} onPickDirection={onPickDirection} />

      {/* Sidebar first in the DOM on mobile would push the portfolio down, so
          the grid keeps source order and only splits from `lg` up. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-5">
          <AboutSection about={profile.about} isOwner={profile.isOwner} />
          <SocialLinksSection socials={profile.socials} />
          <div id="portfolio" className="scroll-mt-24">
            <PortfolioSection
              items={profile.portfolio}
              isOwner={profile.isOwner}
              onChange={onPortfolioChange}
            />
          </div>
        </div>

        <aside className="lg:row-start-1 lg:col-start-2">
          <ProfileSidebar profile={profile} onEdit={() => setEditing(true)} />
        </aside>
      </div>

      <div id="reviews" className="scroll-mt-24">
        <ReviewsSection
          handle={handle}
          reviews={profile.reviews}
          isOwner={profile.isOwner}
          onChange={onReviewsChange}
        />
      </div>

      {profile.isOwner && account && (
        <AccountSection
          name={account.name}
          email={account.email}
          isQaTester={account.isQaTester}
          onUpdated={(patch) => {
            setAccount((prev) => (prev ? { ...prev, ...patch } : prev));
            patchProfile({ name: patch.name });
          }}
        />
      )}

      {editing && (
        <EditProfileDialog
          profile={profile}
          onClose={() => setEditing(false)}
          onSaved={onProfileSaved}
        />
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="h-64 animate-pulse rounded-xl border bg-muted/40 sm:h-80" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <div className="h-32 animate-pulse rounded-xl border bg-muted/40" />
          <div className="h-64 animate-pulse rounded-xl border bg-muted/40" />
        </div>
        <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />
      </div>
    </div>
  );
}
