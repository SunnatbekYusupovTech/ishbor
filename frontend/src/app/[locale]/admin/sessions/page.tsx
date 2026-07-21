'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldAlert, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { tokenStore } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface SessionEntry {
  id: string;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  status: string;
  tabSwitchCount: number;
  terminationReason: string | null;
  score: number | null;
  percentage: number | null;
  awardedLevel: string | null;
  startTime: string;
  endTime: string | null;
  createdAt: string;
}

interface PageData {
  sessions: SessionEntry[];
  total: number;
  page: number;
  totalPages: number;
}

async function adminFetch<T>(path: string): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await res.json();
  if (!res.ok || payload?.success === false) {
    throw new Error(payload?.error?.message ?? 'Request failed');
  }
  return payload.data as T;
}

const statusColors: Record<string, string> = {
  'in-progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  submitted: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  expired: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  terminated: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const statusIcons: Record<string, React.ReactNode> = {
  'in-progress': <Clock className="h-3.5 w-3.5" />,
  submitted: <CheckCircle className="h-3.5 w-3.5" />,
  expired: <AlertTriangle className="h-3.5 w-3.5" />,
  terminated: <ShieldAlert className="h-3.5 w-3.5" />,
};

export default function AdminSessionsPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!tokenStore.get()) { router.replace('/login'); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filter) params.set('status', filter);

    adminFetch<PageData>(`/admin/sessions?${params}`)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [page, filter, router]);

  const statusFilters = ['', 'in-progress', 'submitted', 'expired', 'terminated'];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('viewSessions')}</h1>
          <p className="text-sm text-muted-foreground">{t('viewSessionsSub')}</p>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === s ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            {s || t('all')}
          </button>
        ))}
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('totalCount', { count: data?.total ?? 0 })}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          ) : data?.sessions.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('noSessions')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{t('user')}</th>
                    <th className="px-4 py-3 font-medium">{t('status')}</th>
                    <th className="px-4 py-3 font-medium">{t('tabSwitches')}</th>
                    <th className="px-4 py-3 font-medium">{t('score')}</th>
                    <th className="px-4 py-3 font-medium">{t('result')}</th>
                    <th className="px-4 py-3 font-medium">{t('date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.userName}</p>
                        {s.userEmail && <p className="text-xs text-muted-foreground">{s.userEmail}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', statusColors[s.status])}>
                          {statusIcons[s.status]}
                          {s.status}
                        </span>
                        {s.terminationReason && (
                          <p className="mt-1 text-[10px] text-muted-foreground max-w-[200px] truncate" title={s.terminationReason}>
                            {s.terminationReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{s.tabSwitchCount}</td>
                      <td className="px-4 py-3">
                        {s.percentage !== null ? `${s.percentage}%` : '—'}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{s.awardedLevel ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t('pageOf', { page: data.page, total: data.totalPages })}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('prev')}</Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>{t('next')}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
