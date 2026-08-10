'use client';

import { useEffect, Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, PasswordField, inputCls, isPasswordStrongEnough, EMAIL_RE } from '@/components/form-field';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';
type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'confirm', string>>;
type CodeFieldErrors = Partial<Record<'code', string>>;

const MIN_PASSWORD = 8;
/** Mirrors the backend's own 60s resend-cooldown (`authController.issueVerificationCode`). */
const RESEND_COOLDOWN_SECONDS = 60;

function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  // Arriving here straight after a password reset should land on the "log in"
  // tab, not the default "register" one — see `forgot-password/page.tsx`.
  const initialMode: Mode = searchParams.get('mode') === 'login' ? 'login' : 'register';

  const [mode, setMode] = useState<Mode>(initialMode);
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

  // Set once registration returns `requiresVerification` (or login fails with
  // `EMAIL_NOT_VERIFIED`) — switches the whole card into the code-entry step.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeErrors, setCodeErrors] = useState<CodeFieldErrors>({});
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const clearFieldError = (field: keyof FieldErrors) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (mode === 'register' && !name.trim()) next.name = t('errNameRequired');
    if (!email.trim()) next.email = t('errEmailRequired');
    else if (!EMAIL_RE.test(email.trim())) next.email = t('errEmailInvalid');
    if (!password) next.password = t('errPasswordRequired');
    else if (password.length < MIN_PASSWORD) next.password = t('errPasswordShort');
    else if (mode === 'register' && !isPasswordStrongEnough(password)) {
      next.password = t('passwordPolicyError');
    }
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
      if (mode === 'register') {
        const data = await api.register({ name, email, password, role });
        if ('requiresVerification' in data) {
          setPendingEmail(data.email);
          setResendIn(RESEND_COOLDOWN_SECONDS);
          return;
        }
      } else {
        await api.login({ email, password });
      }
      // `next` is a locale-agnostic internal path (e.g. /jobs/new).
      router.push(next as '/');
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === 'object' && 'code' in err.details && err.details.code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(email.trim());
        setResendIn(RESEND_COOLDOWN_SECONDS);
        return;
      }
      setError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  const verifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeErrors({ code: t(code.trim() ? 'errCodeFormat' : 'errCodeRequired') });
      return;
    }
    setCodeErrors({});
    setLoading(true);
    try {
      await api.verifyEmail({ email: pendingEmail!, code: code.trim() });
      router.push(next as '/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  // `GoogleSignInButton` is a plain link into the backend's OAuth redirect
  // flow (full-page navigation, not a JS call) — on failure Google bounces
  // the browser back here with `?googleError=<reason>` instead of throwing
  // a catchable error, so it's picked up here rather than in a click handler.
  useEffect(() => {
    if (searchParams.get('googleError')) {
      setError(t('googleError'));
      const params = new URLSearchParams(searchParams);
      params.delete('googleError');
      router.replace(`/login${params.toString() ? `?${params}` : ''}` as '/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resendCode = async () => {
    if (resendIn > 0 || loading || !pendingEmail) return;
    setError(null);
    setLoading(true);
    try {
      await api.resendVerification(pendingEmail);
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  if (pendingEmail) {
    return (
      <div className="mx-auto flex max-w-md flex-col justify-center">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('verifyEmailTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('verifyEmailSubtitle', { email: pendingEmail })}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={verifySubmit} noValidate className="space-y-4">
              <Field label={t('code')} error={codeErrors.code}>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setCodeErrors({});
                  }}
                  aria-invalid={!!codeErrors.code}
                  autoFocus
                  className={cn(
                    inputCls,
                    'tracking-[0.5em]',
                    codeErrors.code ? 'border-destructive' : 'border-input',
                  )}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('codeHint')}</p>
              </Field>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('pleaseWait') : t('verifyEmailButton')}
              </Button>

              <button
                type="button"
                onClick={resendCode}
                disabled={resendIn > 0 || loading}
                className="w-full text-center text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {resendIn > 0 ? t('resendCodeIn', { seconds: resendIn }) : t('resendCode')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingEmail(null);
                  setCode('');
                  setCodeErrors({});
                  setError(null);
                }}
                className="w-full text-center text-sm text-muted-foreground hover:underline"
              >
                {t('useAnotherEmail')}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <GoogleSignInButton />

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">{t('orDivider')}</span>
            <div className="h-px flex-1 bg-border" />
          </div>

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
                    maxLength={16}
                    aria-invalid={!!errors.name}
                    className={cn(inputCls, errors.name ? 'border-destructive' : 'border-input')}
                  />
                  <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
                    {name.length.toLocaleString()}/16
                  </p>
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
                maxLength={254}
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
                maxLength={128}
              />
              {mode === 'register' && (
                <p className="mt-1 text-xs text-muted-foreground">{t('passwordPolicyHint')}</p>
              )}
              {mode === 'login' && (
                <div className="mt-1 text-right">
                  <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    {t('forgotPasswordLink')}
                  </Link>
                </div>
              )}
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
                  maxLength={128}
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

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
