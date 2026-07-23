'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, ShieldCheck, Award, ListChecks, FlaskConical, LogOut, ArrowRight } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import type { Me } from '@/types/domain';
import { Avatar, RatingStars } from '@/components/rating';
import { VerifiedBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const tj = useTranslations('jobs');
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace(('/login?next=/profile') as '/login');
      return;
    }
    api
      .me()
      .then(setMe)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('loadError')))
      .finally(() => setLoading(false));
  }, [router, t]);

  const logout = () => {
    void api.logout();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-32 animate-pulse rounded-2xl border bg-muted/40" />
        <div className="h-48 animate-pulse rounded-2xl border bg-muted/40" />
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>{error ?? t('loadError')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasResult = me.attempts > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Avatar name={me.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{me.name}</p>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {me.email}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {me.role === 'seeker' ? tj('seeker') : tj('employer')}
          </span>
        </CardContent>
      </Card>

      {me.isQaTester && (
        <Alert>
          <FlaskConical className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">{t('qaTester')}</span> — {t('qaTesterHint')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <ShieldCheck className="h-4 w-4" />
            {t('verification')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <VerifiedBadge level={me.verificationLevel} />

          {hasResult ? (
            <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Award className="h-3.5 w-3.5" />
                  {t('bestResult')}
                </p>
                <RatingStars percentage={me.bestPercentage} className="mt-1.5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('bestResult')} %
                </p>
                <p className="mt-1.5 text-lg font-bold tabular-nums">{me.bestPercentage}%</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t('attempts')}
                </p>
                <p className="mt-1.5 text-lg font-bold tabular-nums">{me.attempts}</p>
              </div>
            </div>
          ) : (
            <p className="border-t pt-4 text-sm text-muted-foreground">{t('noResult')}</p>
          )}

          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/test">
              {t('takeTest')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/leaderboard">{t('viewLeaderboard')}</Link>
        </Button>
        <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </Button>
      </div>
    </div>
  );
}
