'use client';

import { Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';
type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const inputCls =
  'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring';

function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [mode, setMode] = useState<Mode>('register');
  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearFieldError = (field: keyof FieldErrors) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (mode === 'register' && !name.trim()) next.name = t('errNameRequired');
    if (!email.trim()) next.email = t('errEmailRequired');
    else if (!EMAIL_RE.test(email.trim())) next.email = t('errEmailInvalid');
    if (!password) next.password = t('errPasswordRequired');
    else if (password.length < MIN_PASSWORD) next.password = t('errPasswordShort');
    if (mode === 'register') {
      if (!confirm) next.confirm = t('errConfirmRequired');
      else if (confirm !== password) next.confirm = t('errPasswordMismatch');
    }
    return next;
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setError(null);
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
      const res =
        mode === 'register'
          ? await api.register({ name, email, password, role })
          : await api.login({ email, password });
      tokenStore.set(res.token);
      // `next` is a locale-agnostic internal path (e.g. /jobs/new).
      router.push(next as '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.rich('subtitle', { b: (chunks) => <strong>{chunks}</strong> })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex rounded-lg bg-muted p-1 text-sm font-medium">
            {(['register', 'login'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 transition-colors',
                  mode === m ? 'bg-background text-foreground shadow' : 'text-muted-foreground',
                )}
              >
                {t(m)}
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('role')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['seeker', 'employer'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={cn(
                          'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                          role === r
                            ? 'border-primary bg-accent'
                            : 'text-muted-foreground hover:bg-accent',
                        )}
                      >
                        {t(r === 'seeker' ? 'roleSeeker' : 'roleEmployer')}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(role === 'seeker' ? 'roleSeekerHint' : 'roleEmployerHint')}
                  </p>
                </div>
                <Field label={t('name')} error={errors.name}>
                  <input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    aria-invalid={!!errors.name}
                    className={cn(inputCls, errors.name ? 'border-destructive' : 'border-input')}
                  />
                </Field>
              </>
            )}

            <Field label={t('email')} error={errors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                aria-invalid={!!errors.email}
                className={cn(inputCls, errors.email ? 'border-destructive' : 'border-input')}
              />
            </Field>

            <Field label={t('password')} error={errors.password}>
              <PasswordField
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  clearFieldError('password');
                }}
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                invalid={!!errors.password}
                showLabel={t('showPassword')}
                hideLabel={t('hidePassword')}
              />
            </Field>

            {mode === 'register' && (
              <Field label={t('confirmPassword')} error={errors.confirm}>
                <PasswordField
                  value={confirm}
                  onChange={(v) => {
                    setConfirm(v);
                    clearFieldError('confirm');
                  }}
                  visible={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                  invalid={!!errors.confirm}
                  showLabel={t('showPassword')}
                  hideLabel={t('hidePassword')}
                />
              </Field>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('pleaseWait') : mode === 'register' ? t('createAccount') : t('logIn')}
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

function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
  invalid,
  showLabel,
  hideLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  invalid: boolean;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        className={cn(inputCls, 'pr-10', invalid ? 'border-destructive' : 'border-input')}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? hideLabel : showLabel}
        aria-pressed={visible}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
