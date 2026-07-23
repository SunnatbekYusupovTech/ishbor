'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Medal } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { LeaderboardEntry } from '@/types/domain';
import { VerifiedBadge } from '@/components/badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const medalColor = ['text-yellow-500', 'text-slate-400', 'text-amber-700'];

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getLeaderboard()
      .then((data) => !cancelled && setEntries(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : t('loadError')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-7 w-7 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('ranking')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('loading')}</p>
          ) : entries.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <ul className="divide-y">
              {entries.map((e) => (
                <li key={e.rank} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex w-8 shrink-0 items-center justify-center">
                    {e.rank <= 3 ? (
                      <Medal className={cn('h-5 w-5', medalColor[e.rank - 1])} />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">{e.rank}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{e.name}</p>
                    <VerifiedBadge level={e.verificationLevel} />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{e.bestPercentage}%</p>
                    <p className="text-xs text-muted-foreground">{t('points', { score: e.bestScore })}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
