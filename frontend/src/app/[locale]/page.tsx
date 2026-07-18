'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Users, Building2, SlidersHorizontal, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import type { Job, Level, Stack, ListingType } from '@/types/domain';
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const LEVELS: Level[] = ['junior', 'middle', 'senior'];
const STACKS: Stack[] = ['frontend', 'backend', 'fullstack', 'mobile'];

/** Role filter — 'all' shows employers + seekers side by side. */
type RoleFilter = 'all' | ListingType;

export default function JobsPage() {
  const t = useTranslations('jobs');
  const tl = useTranslations('levels');
  const ts = useTranslations('stacks');

  const [role, setRole] = useState<RoleFilter>('all');
  const [level, setLevel] = useState<Level | null>(null);
  const [stack, setStack] = useState<Stack | null>(null);
  const [query, setQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getJobs({
        type: role === 'all' ? undefined : role,
        level: level ?? undefined,
        stack: stack ?? undefined,
      })
      .then((data) => !cancelled && setJobs(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : t('loadError')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [role, level, stack, t]);

  // Client-side text search over already-filtered results.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.title, j.company, j.description, j.postedByName]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [jobs, query]);

  const hasFilters = level !== null || stack !== null || query.trim() !== '';
  const resetFilters = () => {
    setLevel(null);
    setStack(null);
    setQuery('');
  };

  const roleTabs: { value: RoleFilter; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: t('tabAll'), icon: <Users className="h-4 w-4" /> },
    { value: 'vacancy', label: t('tabEmployers'), icon: <Building2 className="h-4 w-4" /> },
    { value: 'resume', label: t('tabSeekers'), icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-500/10 via-background to-emerald-500/10 p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t('subtitle')}</p>
            <div className="mt-4 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                {t('employer')}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                {t('seeker')}
              </span>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <Link href="/jobs/new">
              <Plus className="mr-1.5 h-4 w-4" />
              {t('post')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Role segmented control */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border bg-muted/50 p-1 text-sm font-medium">
          {roleTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRole(tab.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all',
                role === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="h-11 w-full rounded-xl border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4" />
            {t('filters')}
          </span>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {t('reset')}
            </button>
          )}
        </div>
        <FilterRow
          label={t('filterStack')}
          value={stack}
          options={STACKS}
          onChange={setStack}
          render={(v) => ts(v)}
          allLabel={t('all')}
        />
        <FilterRow
          label={t('filterLevel')}
          value={level}
          options={LEVELS}
          onChange={setLevel}
          render={(v) => tl(v)}
          allLabel={t('all')}
        />
      </div>

      {/* Results header */}
      {!loading && !error && (
        <p className="text-sm text-muted-foreground">
          {t('resultsCount', { count: filtered.length })}
        </p>
      )}

      {/* List */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-2xl border bg-muted/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-center text-muted-foreground">
          <Search className="h-10 w-10 opacity-40" />
          <p>{t('empty')}</p>
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              {t('reset')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterRowProps<T extends string> {
  label: string;
  value: T | null;
  options: T[];
  onChange: (v: T | null) => void;
  render: (v: T) => string;
  allLabel: string;
}

function FilterRow<T extends string>({
  label,
  value,
  options,
  onChange,
  render,
  allLabel,
}: FilterRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-sm font-medium text-muted-foreground">{label}</span>
      <button
        onClick={() => onChange(null)}
        className={cn(
          'rounded-full border px-3 py-1 text-sm transition-colors',
          value === null
            ? 'border-primary bg-primary text-primary-foreground'
            : 'hover:bg-accent',
        )}
      >
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-full border px-3 py-1 text-sm capitalize transition-colors',
            value === o ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}
