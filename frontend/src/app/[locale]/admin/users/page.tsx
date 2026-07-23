'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Trash2, Shield, UserCog } from 'lucide-react';
import { apiRequest as adminFetch } from '@/lib/api';
import { useAdminGuard } from '@/hooks/useAdminGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn, displayTier } from '@/lib/utils';
import type { Direction, VerificationLevel } from '@/types/domain';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  verificationLevels: Record<Direction, VerificationLevel>;
  primaryDirection: Direction | null;
  bestPercentage: number;
  attempts: number;
  createdAt: string;
}

interface PageData {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const t = useTranslations('admin');
  const ready = useAdminGuard();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search.trim()) params.set('search', search.trim());

    adminFetch<PageData>(`/admin/users?${params}`)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [ready, page, search]);

  const deleteUser = async (id: string) => {
    if (!confirm(t('confirmDeleteUser'))) return;
    try {
      await adminFetch(`/admin/users/${id}`, { method: 'DELETE' });
      setData((prev) => prev ? { ...prev, users: prev.users.filter((u) => u.id !== id), total: prev.total - 1 } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('manageUsers')}</h1>
          <p className="text-sm text-muted-foreground">{t('manageUsersSub')}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={t('searchUsers')}
          className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
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
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          ) : data?.users.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('noUsers')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{t('name')}</th>
                    <th className="px-4 py-3 font-medium">{t('email')}</th>
                    <th className="px-4 py-3 font-medium">{t('role')}</th>
                    <th className="px-4 py-3 font-medium">{t('level')}</th>
                    <th className="px-4 py-3 font-medium">{t('score')}</th>
                    <th className="px-4 py-3 font-medium">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          user.role === 'admin' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                          user.role === 'employer' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' :
                          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        )}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {displayTier(user.verificationLevels, user.primaryDirection)}
                      </td>
                      <td className="px-4 py-3 font-medium">{user.bestPercentage}%</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {t('pageOf', { page: data.page, total: data.totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  {t('prev')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
