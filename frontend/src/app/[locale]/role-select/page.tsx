'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { api, ApiError } from '@/lib/api';
import { RolePicker } from '@/components/RolePicker';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * First-login "Who are you?" — where a brand-new Google account lands
 * (`GET /auth/google/callback` redirects fresh signups here). The OAuth
 * redirect is a single step with no form in between, so the seeker/employer
 * question that the email/password registration form asks up front is asked
 * HERE instead. Existing accounts can also reach it directly to re-pick.
 */
export default function RoleSelectPage() {
  const t = useTranslations('auth');
  const { authed } = useCurrentUser();
  const router = useRouter();
  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The Google callback sets the auth cookies server-side, then bounces the
  // browser here with `?googleAuth=1` — `useCurrentUser` picks that up on the
  // first paint and flips `authed`. Give it a beat before deciding this was a
  // direct, signed-out visit (which should go to /login instead).
  const [deadlinePassed, setDeadlinePassed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDeadlinePassed(true), 1500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (deadlinePassed && !authed) router.replace('/login');
  }, [deadlinePassed, authed, router]);

  if (!authed) {
    return (
      <div className="mx-auto max-w-md py-24 text-center text-sm text-muted-foreground">
        {t('pleaseWait')}
      </div>
    );
  }

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.updateMe({ role });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('roleSelectTitle')}</CardTitle>
          <CardDescription>{t('roleSelectSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RolePicker value={role} onChange={setRole} disabled={saving} />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? t('pleaseWait') : t('roleContinue')}
          </Button>
          <p className="text-center">
            <Link href="/" className="text-sm text-muted-foreground underline-offset-2 hover:underline">
              {t('roleSkip')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
