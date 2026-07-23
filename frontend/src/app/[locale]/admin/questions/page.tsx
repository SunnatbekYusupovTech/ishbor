'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileQuestion, Search, Filter } from 'lucide-react';
import { tokenStore, apiRequest as adminFetch } from '@/lib/api';
import { useRouter } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface QuestionEntry {
  id: string;
  text: string;
  options: string[];
  difficulty: string;
  technology: string;
  category: string;
  createdAt: string;
}

interface PageData {
  questions: QuestionEntry[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminQuestionsPage() {
  const t = useTranslations('admin');
  const router = useRouter();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [techFilter, setTechFilter] = useState('');
  const [diffFilter, setDiffFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!tokenStore.get()) { router.replace('/login'); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (techFilter) params.set('technology', techFilter);
    if (diffFilter) params.set('difficulty', diffFilter);

    adminFetch<PageData>(`/admin/questions?${params}`)
      .then((d) => !cancelled && setData(d))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [page, techFilter, diffFilter, router]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <FileQuestion className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('viewQuestions')}</h1>
          <p className="text-sm text-muted-foreground">{t('viewQuestionsSub')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={diffFilter}
            onChange={(e) => { setDiffFilter(e.target.value); setPage(1); }}
            className="h-10 appearance-none rounded-xl border bg-background pl-9 pr-8 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          >
            <option value="">{t('allDifficulties')}</option>
            <option value="junior">Junior</option>
            <option value="middle">Middle</option>
            <option value="senior">Senior</option>
          </select>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={techFilter}
            onChange={(e) => { setTechFilter(e.target.value); setPage(1); }}
            placeholder={t('filterByTech')}
            className="h-10 w-48 rounded-xl border bg-background pl-9 pr-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
          />
        </div>
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
                <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/40" />
              ))}
            </div>
          ) : data?.questions.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('noQuestions')}</p>
          ) : (
            <div className="divide-y">
              {data?.questions.map((q) => (
                <div key={q.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium flex-1">{q.text}</p>
                    <div className="flex shrink-0 gap-1.5">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        q.difficulty === 'senior' ? 'bg-red-500/10 text-red-600' :
                        q.difficulty === 'middle' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-emerald-500/10 text-emerald-600'
                      )}>
                        {q.difficulty}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {q.technology}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {q.options.map((opt, i) => (
                      <span key={i} className="rounded-md bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {opt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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
