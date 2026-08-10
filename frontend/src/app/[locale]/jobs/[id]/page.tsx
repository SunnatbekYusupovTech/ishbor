'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Briefcase, Loader2 } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import type { JobDetail } from '@/types/domain';
import { JobDetailDialog } from '@/components/JobDetailDialog';
import { hiddenJobs } from '@/lib/hidden';

/**
 * Standalone job detail — `/jobs/<id>`. The chat thread's job banner and
 * other out-of-feed links deep-link here instead of 404ing. The full modal
 * content (hero card + rating + actions) renders inline in `mode="page"` —
 * no overlay; a breadcrumb keeps a path back to all listings.
 */
export default function JobDetailPage() {
  const t = useTranslations('jobs');
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .getJob(id)
      .then((d) => {
        if (alive) setJob(d);
      })
      .catch((err) => {
        if (alive) setError(err instanceof ApiError ? err.message : t('loadError'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, t]);

  if (loading) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">{t('loading')}</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
        <Briefcase className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{error ?? t('loadError')}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToAll')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Breadcrumb — back to all listings */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link
          href="/"
          className="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToAll')}
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="truncate font-semibold text-foreground">{job.title}</span>
      </nav>

      <JobDetailDialog
        job={job}
        mode="page"
        onHide={() => {
          hiddenJobs.hide(job.id);
          router.replace('/');
        }}
      />
    </div>
  );
}
