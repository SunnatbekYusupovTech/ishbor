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

// Formats the part after the fixed "+998" prefix as the user types: XX-XXX-XX-XX.
function formatUzPhoneLocal(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9);
  let out = digits.slice(0, 2);
  if (digits.length > 2) out += `-${digits.slice(2, 5)}`;
  if (digits.length > 5) out += `-${digits.slice(5, 7)}`;
  if (digits.length > 7) out += `-${digits.slice(7, 9)}`;
  return out;
}

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
    location: '',
    contactPhone: '',
    contactTelegram: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneLocal, setPhoneLocal] = useState('');

  const set = <K extends keyof CreateJobInput>(k: K, v: CreateJobInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onPhoneChange = (raw: string) => {
    const formatted = formatUzPhoneLocal(raw);
    setPhoneLocal(formatted);
    set('contactPhone', formatted ? `+998 ${formatted}` : '');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Employers send company + level; seekers omit them (backend uses their badge).
      await api.createJob({
        title: form.title,
        description: form.description,
        stack: form.stack,
        salary: form.salary || undefined,
        location: form.location || undefined,
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
          <form onSubmit={submit} className="space-y-4">
            <Field label={isEmployer ? t('jobTitle') : t('resumeTitle')}>
              <input
                required
                minLength={2}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder={isEmployer ? '' : t('resumeTitlePlaceholder')}
                className={inputCls}
              />
            </Field>

            {isEmployer && (
              <Field label={t('company')}>
                <input
                  required
                  minLength={2}
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                  className={inputCls}
                />
              </Field>
            )}

            <Field label={t('description')}>
              <textarea
                required
                minLength={10}
                rows={4}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                className={inputCls}
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

            <Field label={t('location')}>
              <input
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Toshkent, Remote…"
                className={inputCls}
              />
            </Field>

            <Field label={t('salary')}>
              <input
                value={form.salary}
                onChange={(e) => set('salary', e.target.value)}
                placeholder="$500 - $900"
                className={inputCls}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('telegram')}>
                <input
                  value={form.contactTelegram}
                  onChange={(e) => set('contactTelegram', e.target.value)}
                  placeholder="@username"
                  className={inputCls}
                />
              </Field>
              <Field label={t('phone')}>
                <div className="flex">
                  <div className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    +998
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phoneLocal}
                    onChange={(e) => onPhoneChange(e.target.value)}
                    placeholder="90-123-45-67"
                    className={cn(inputCls, 'rounded-l-none')}
                  />
                </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {children}
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
