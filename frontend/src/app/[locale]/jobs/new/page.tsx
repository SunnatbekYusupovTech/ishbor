'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Lock } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import type { CreateJobInput, Level, Stack, Role, VerificationLevel } from '@/types/domain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const LEVELS: Level[] = ['junior', 'middle', 'senior'];
const STACKS: Stack[] = ['frontend', 'backend', 'fullstack', 'mobile'];

type Gate = 'checking' | 'unverified' | 'ready';

export default function NewJobPage() {
  const t = useTranslations('post');
  const router = useRouter();

  const [gate, setGate] = useState<Gate>('checking');
  const [role, setRole] = useState<Role>('seeker');
  const [verifiedLevel, setVerifiedLevel] = useState<VerificationLevel>('none');

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace(('/login?next=/jobs/new') as '/login');
      return;
    }
    api
      .me()
      .then((profile) => {
        setRole(profile.role);
        setVerifiedLevel(profile.verificationLevel);
        // Only seekers must be verified; employers post vacancies freely.
        if (profile.role === 'seeker' && profile.verificationLevel === 'none') {
          setGate('unverified');
        } else {
          setGate('ready');
        }
      })
      .catch(() => {
        tokenStore.clear();
        router.replace(('/login?next=/jobs/new') as '/login');
      });
  }, [router]);

  if (gate === 'checking') {
    return <p className="py-16 text-center text-sm text-muted-foreground">{t('checking')}</p>;
  }

  if (gate === 'unverified') {
    return (
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>{t('lockedTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t('lockedBody')}</p>
            <Button asChild className="w-full" size="lg">
              <Link href="/test">{t('takeTest')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <JobForm role={role} verifiedLevel={verifiedLevel} />;
}

type JobFieldErrors = Partial<Record<'title' | 'company' | 'description' | 'salary', string>>;

/** Parse the numeric bounds out of a free-text salary like "$500 - $900". */
function salaryBounds(raw: string): number[] {
  return (raw.match(/\d[\d\s]*/g) ?? [])
    .map((n) => Number(n.replace(/\s/g, '')))
    .filter((n) => Number.isFinite(n));
}

function JobForm({ role, verifiedLevel }: { role: Role; verifiedLevel: VerificationLevel }) {
  const t = useTranslations('post');
  const tl = useTranslations('levels');
  const ts = useTranslations('stacks');
  const router = useRouter();
  const isEmployer = role === 'employer';

  const [form, setForm] = useState<CreateJobInput>({
    title: '',
    company: '',
    description: '',
    level: 'junior',
    stack: 'frontend',
    salary: '',
    contactPhone: '',
    contactTelegram: '',
  });
  const [errors, setErrors] = useState<JobFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof CreateJobInput>(k: K, v: CreateJobInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((prev) => (prev[k as keyof JobFieldErrors] ? { ...prev, [k]: undefined } : prev));
  };

  const validate = (): JobFieldErrors => {
    const e: JobFieldErrors = {};
    if (form.title.trim().length < 2) e.title = t('errTitleRequired');
    if (isEmployer && (form.company ?? '').trim().length < 2) e.company = t('errCompanyRequired');
    if (form.description.trim().length < 10) e.description = t('errDescriptionShort');
    const bounds = salaryBounds(form.salary ?? '');
    if (bounds.length >= 2 && bounds[0] > bounds[bounds.length - 1]) {
      e.salary = t('errSalaryRange');
    }
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      // Employers send company + level; seekers omit them (backend uses their badge).
      await api.createJob({
        title: form.title,
        description: form.description,
        stack: form.stack,
        salary: form.salary || undefined,
        contactPhone: form.contactPhone || undefined,
        contactTelegram: form.contactTelegram || undefined,
        ...(isEmployer ? { company: form.company, level: form.level } : {}),
      });
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring';

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>{isEmployer ? t('titleVacancy') : t('titleResume')}</CardTitle>
          <Alert className="mt-2">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle className="capitalize">
              {isEmployer ? t('employerNote') : tl(verifiedLevel as Level)}
            </AlertTitle>
            <AlertDescription>
              {isEmployer ? t('employerHint') : t('seekerNote')}
            </AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label={isEmployer ? t('jobTitle') : t('resumeTitle')} error={errors.title}>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={isEmployer ? '' : t('resumeTitlePlaceholder')}
                aria-invalid={!!errors.title}
                className={cn(inputCls, errors.title && 'border-destructive')}
              />
            </Field>

            {isEmployer && (
              <Field label={t('company')} error={errors.company}>
                <input
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                  aria-invalid={!!errors.company}
                  className={cn(inputCls, errors.company && 'border-destructive')}
                />
              </Field>
            )}

            <Field label={t('description')} error={errors.description}>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                aria-invalid={!!errors.description}
                className={cn(inputCls, errors.description && 'border-destructive')}
              />
            </Field>

            <div className={cn('grid gap-4', isEmployer ? 'grid-cols-2' : 'grid-cols-1')}>
              {isEmployer && (
                <Field label={t('level')}>
                  <Pills
                    value={form.level ?? 'junior'}
                    options={LEVELS}
                    onChange={(v) => set('level', v)}
                    render={(v) => tl(v)}
                  />
                </Field>
              )}
              <Field label={t('stack')}>
                <Pills
                  value={form.stack}
                  options={STACKS}
                  onChange={(v) => set('stack', v)}
                  render={(v) => ts(v)}
                />
              </Field>
            </div>

            <Field label={t('salary')} error={errors.salary}>
              <input
                value={form.salary}
                onChange={(e) => set('salary', e.target.value)}
                placeholder="$500 - $900"
                aria-invalid={!!errors.salary}
                className={cn(inputCls, errors.salary && 'border-destructive')}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t('telegram')}>
                <input
                  value={form.contactTelegram}
                  onChange={(e) => set('contactTelegram', e.target.value)}
                  placeholder="@username"
                  className={inputCls}
                />
              </Field>
              <Field label={t('phone')}>
                <input
                  value={form.contactPhone}
                  onChange={(e) => set('contactPhone', e.target.value)}
                  placeholder="+998..."
                  className={inputCls}
                />
              </Field>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? t('posting') : t('publish')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

function Pills<T extends string>({
  value,
  options,
  onChange,
  render,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs capitalize transition-colors',
            value === o ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
          )}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}
