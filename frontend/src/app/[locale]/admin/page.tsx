'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileQuestion,
  ShieldAlert,
  Activity,
  UserCheck,
  Building2,
  Clock,
} from 'lucide-react';
import { tokenStore, apiRequest } from '@/lib/api';
import { Link, useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Stats {
  users: Record<string, number>;
  jobs: Record<string, number>;
  sessions: Record<string, number>;
  totalQuestions: number;
}

export default function AdminDashboardPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }

    let cancelled = false;
    apiRequest<Stats>('/admin/stats')
      .then((data) => !cancelled && setStats(data))
      .catch(() => !cancelled && setError(t('loadError')))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [router, t]);

  const statCards = [
    {
      label: t('totalUsers'),
      value: stats ? Object.values(stats.users).reduce((a, b) => a + b, 0) : '—',
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: t('totalJobs'),
      value: stats ? Object.values(stats.jobs).reduce((a, b) => a + b, 0) : '—',
      icon: <Briefcase className="h-5 w-5" />,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: t('totalSessions'),
      value: stats ? Object.values(stats.sessions).reduce((a, b) => a + b, 0) : '—',
      icon: <Activity className="h-5 w-5" />,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: t('totalQuestions'),
      value: stats?.totalQuestions ?? '—',
      icon: <FileQuestion className="h-5 w-5" />,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
  ];

  const quickLinks = [
    { href: '/admin/users', label: t('manageUsers'), icon: <UserCheck className="h-4 w-4" /> },
    { href: '/admin/jobs', label: t('manageJobs'), icon: <Building2 className="h-4 w-4" /> },
    { href: '/admin/sessions', label: t('viewSessions'), icon: <ShieldAlert className="h-4 w-4" /> },
    { href: '/admin/questions', label: t('viewQuestions'), icon: <FileQuestion className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <LayoutDashboard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard')}</h1>
          <p className="text-sm text-muted-foreground">{t('dashboardSub')}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bg} ${card.color}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('quickLinks')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm font-medium transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                {link.icon}
              </span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Breakdown */}
      {stats && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                {t('usersByRole')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(stats.users).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{role}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4" />
                {t('sessionsByStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(stats.sessions).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">{status}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
