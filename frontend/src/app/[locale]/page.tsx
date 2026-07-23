'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Search,
  Users,
  Building2,
  SlidersHorizontal,
  X,
  Heart,
  EyeOff,
  ShieldCheck,
  Bookmark,
  LogIn,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { api, ApiError, tokenStore } from '@/lib/api';
import type { Job, Level, Stack, ListingType } from '@/types/domain';
import { JobCard } from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFavorites } from '@/lib/favorites';
import { hiddenJobs, useHiddenJobs } from '@/lib/hidden';
import { cn } from '@/lib/utils';

const LEVELS: Level[] = ['junior', 'middle', 'senior'];
const STACKS: Stack[] = ['frontend', 'backend', 'fullstack', 'mobile'];

/** Quick "saved search" presets shown in the sidebar. */
const PRESETS: { stack: Stack; level: Level }[] = [
  { stack: 'frontend', level: 'junior' },
  { stack: 'backend', level: 'middle' },
  { stack: 'fullstack', level: 'senior' },
];

/** Role filter — 'all' shows employers + seekers side by side. */
type RoleFilter = 'all' | ListingType;

/** Server-side sort options (mirrors the backend `sort` query param). */
type SortOption = 'newest' | 'oldest' | 'salary_asc' | 'salary_desc';
const SORT_OPTIONS: SortOption[] = ['newest', 'oldest', 'salary_asc', 'salary_desc'];

export default function JobsPage() {
  const t = useTranslations('jobs');
  const tl = useTranslations('levels');
  const ts = useTranslations('stacks');

  const [role, setRole] = useState<RoleFilter>('all');
  const [level, setLevel] = useState<Level | null>(null);
  const [stack, setStack] = useState<Stack | null>(null);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedOnly, setSavedOnly] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const favIds = useFavorites();
  const hiddenIds = useHiddenJobs();

  // Read the "saved" view intent (from the header heart) + auth state on mount.
  useEffect(() => {
    setAuthed(!!tokenStore.get());
    const params = new URLSearchParams(window.location.search);
    setSavedOnly(params.get('saved') === '1');
  }, []);

  const toggleSaved = (val: boolean) => {
    setSavedOnly(val);
    const url = new URL(window.location.href);
    if (val) url.searchParams.set('saved', '1');
    else url.searchParams.delete('saved');
    window.history.replaceState(null, '', url.toString());
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getJobs({
        type: role === 'all' ? undefined : role,
        level: level ?? undefined,
        stack: stack ?? undefined,
        location: location.trim() || undefined,
        salaryMin: salaryMin.trim() ? Number(salaryMin) : undefined,
        salaryMax: salaryMax.trim() ? Number(salaryMax) : undefined,
        sort,
      })
      .then((data) => !cancelled && setJobs(data))
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : t('loadError')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [role, level, stack, location, salaryMin, salaryMax, sort, t]);

  // Client-side pipeline: drop hidden → saved-only → text search.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const favSet = new Set(favIds);
    const hiddenSet = new Set(hiddenIds);
    return jobs.filter((j) => {
      if (hiddenSet.has(j.id)) return false;
      if (savedOnly && !favSet.has(j.id)) return false;
      if (!q) return true;
      return [j.title, j.company, j.description, j.postedByName]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [jobs, query, hiddenIds, savedOnly, favIds]);

  const hasFilters =
    level !== null ||
    stack !== null ||
    query.trim() !== '' ||
    location.trim() !== '' ||
    salaryMin.trim() !== '' ||
    salaryMax.trim() !== '' ||
    sort !== 'newest';
  const resetFilters = () => {
    setLevel(null);
    setStack(null);
    setQuery('');
    setLocation('');
    setSalaryMin('');
    setSalaryMax('');
    setSort('newest');
  };
  const hideJob = (id: string) => hiddenJobs.hide(id);

  // Lock page scroll while the mobile filters overlay is open.
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileFiltersOpen]);

  const roleTabs: { value: RoleFilter; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: t('tabAll'), icon: <Users className="h-4 w-4" /> },
    { value: 'vacancy', label: t('tabEmployers'), icon: <Building2 className="h-4 w-4" /> },
    { value: 'resume', label: t('tabSeekers'), icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      {/* ── Search band ─────────────────────────────────────────── */}
      <section>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{t('title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('subtitle')}</p>

        <div className="mt-4 flex flex-col gap-2.5 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="h-12 w-full rounded-xl border bg-card pl-11 pr-4 text-sm shadow-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>
          <Button asChild size="lg" className="h-12 shrink-0 px-6 text-sm font-semibold">
            <Link href="/jobs/new">
              <Plus className="h-4 w-4" />
              {t('post')}
            </Link>
          </Button>
        </div>

        {/* Role segmented control + mobile filters trigger */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="inline-flex rounded-xl border bg-card p-1 text-sm font-medium shadow-sm">
            {roleTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setRole(tab.value)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-2 transition-all',
                  role === tab.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.icon}
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border bg-card px-3.5 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent xl:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t('filters')}
            {hasFilters && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </section>

      {/* ── Two-column body ─────────────────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Sidebar — a normal sticky column on desktop; a fullscreen (full
            width + full height) overlay on mobile, toggled by the button
            above. `hidden` keeps it out of the mobile layout flow entirely
            when closed, so it never contributes to page width/overflow. */}
        <aside
          className={cn(
            'space-y-4 xl:block xl:h-auto xl:w-auto xl:overflow-visible xl:bg-transparent xl:p-0 xl:sticky xl:top-20 xl:self-start',
            mobileFiltersOpen
              ? 'fixed inset-0 z-50 h-dvh w-full animate-in overflow-y-auto bg-background p-4 slide-in-from-left fade-in duration-300'
              : 'hidden',
          )}
        >
          {/* Mobile-only header (title + close) — the desktop column has no need for it. */}
          <div className="flex items-center justify-between xl:hidden">
            <h2 className="text-lg font-bold">{t('filters')}</h2>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label={t('close')}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Activity / saved */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-bold">{t('sidebarTitle')}</h2>
            <button
              onClick={() => toggleSaved(!savedOnly)}
              className={cn(
                'mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors',
                savedOnly ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-accent',
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <Heart className={cn('h-4 w-4', savedOnly && 'fill-current')} />
                {t('sidebarFavorites')}
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
                {favIds.length}
              </span>
            </button>
          </div>

          {/* Filters */}
          <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold">
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
            <FilterGroup
              label={t('filterStack')}
              value={stack}
              options={STACKS}
              onChange={setStack}
              render={(v) => ts(v)}
              allLabel={t('all')}
            />
            <FilterGroup
              label={t('filterLevel')}
              value={level}
              options={LEVELS}
              onChange={setLevel}
              render={(v) => tl(v)}
              allLabel={t('all')}
            />

            {/* Location */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('filterLocation')}
              </span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('locationPlaceholder')}
                className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
            </div>

            {/* Salary range */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('filterSalary')}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder={t('salaryMinPlaceholder')}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder={t('salaryMaxPlaceholder')}
                  className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('sortBy')}
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="mt-2 h-9 w-full rounded-lg border bg-background px-2 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/25"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {t(`sort_${o}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Saved searches (presets) */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Bookmark className="h-4 w-4" />
              {t('sidebarSearches')}
            </h2>
            <div className="mt-3 flex flex-col gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={`${p.stack}-${p.level}`}
                  onClick={() => {
                    setStack(p.stack);
                    setLevel(p.level);
                  }}
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="font-medium text-foreground">{ts(p.stack)}</span>
                  <span className="text-xs">{tl(p.level)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Verify-skills promo */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h2 className="mt-2 text-sm font-bold">{t('promoTitle')}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('promoBody')}</p>
            <Button asChild size="sm" className="mt-3 w-full">
              <Link href="/test">{t('promoCta')}</Link>
            </Button>
          </div>

          {/* Guest sign-in nudge */}
          {!authed && (
            <div className="rounded-2xl border border-dashed p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('guestPrompt')}</p>
              <Button asChild variant="outline" size="sm" className="mt-2.5 w-full">
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  {t('signIn')}
                </Link>
              </Button>
            </div>
          )}
        </aside>

        {/* Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {!loading && !error && (
              <p className="text-sm font-medium text-muted-foreground">
                {t('resultsCount', { count: filtered.length })}
              </p>
            )}
            <div className="flex items-center gap-3">
              {hiddenIds.length > 0 && (
                <button
                  onClick={() => hiddenJobs.clear()}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  {t('restoreHidden', { count: hiddenIds.length })}
                </button>
              )}
              {savedOnly && (
                <button
                  onClick={() => toggleSaved(false)}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('sidebarFavorites')}
                </button>
              )}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {error ? null : loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 animate-pulse rounded-2xl border bg-muted/40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card py-20 text-center text-muted-foreground">
              <Search className="h-10 w-10 opacity-40" />
              <p>{t('empty')}</p>
              {(hasFilters || savedOnly) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetFilters();
                    toggleSaved(false);
                  }}
                >
                  {t('reset')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((job) => (
                <JobCard key={job.id} job={job} onHide={hideJob} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FilterGroupProps<T extends string> {
  label: string;
  value: T | null;
  options: T[];
  onChange: (v: T | null) => void;
  render: (v: T) => string;
  allLabel: string;
}

function FilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
  render,
  allLabel,
}: FilterGroupProps<T>) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="mt-2 flex flex-wrap gap-1.5">
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
            onClick={() => onChange(value === o ? null : o)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm capitalize transition-colors',
              value === o ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </div>
  );
}
