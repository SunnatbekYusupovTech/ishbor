'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Field, PasswordField, inputCls, EMAIL_RE } from '@/components/form-field';

/** 3 failed attempts in a row locks the form for 15 seconds before another
 *  attempt is allowed — a client-visible deterrent layered on top of the
 *  server's IP-keyed `authRateLimiter` (which is looser and silent). */
const MAX_ATTEMPTS = 3;
const COOLDOWN_MS = 15_000;

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export default function AdminLoginPage() {
  const t = useTranslations('admin');
  const ta = useTranslations('auth');
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Already-logged-in admin skips straight past this page.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api
      .me()
      .then((me) => {
        if (me.role === 'admin') router.replace('/admin');
      })
      .catch(() => {
        // Stale/invalid token — fine, just stay on the login form.
      });
  }, [router]);

  // Countdown tick while locked; clears the lock (and resets the strike
  // counter) once it elapses.
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setSecondsLeft(0);
        setFailedAttempts(0);
      } else {
        setSecondsLeft(remaining);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const locked = lockedUntil !== null;

  const registerFailure = (message: string) => {
    setError(message);
    setFailedAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + COOLDOWN_MS);
        return 0;
      }
      return next;
    });
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!email.trim()) next.email = ta('errEmailRequired');
    else if (!EMAIL_RE.test(email.trim())) next.email = ta('errEmailInvalid');
    if (!password) next.password = ta('errPasswordRequired');
    return next;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setError(null);
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await api.login({ email: email.trim(), password });
      tokenStore.set(res.token);
      tokenStore.setRefresh(res.refreshToken);

      // The login endpoint itself doesn't check role — re-verify via /me
      // and reject (dropping the token again) if this isn't an admin.
      const me = await api.me();
      if (me.role !== 'admin') {
        tokenStore.clear();
        registerFailure(t('notAdmin'));
        return;
      }
      setFailedAttempts(0);
      router.push('/admin');
    } catch (err) {
      registerFailure(err instanceof ApiError ? err.message : ta('genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl">{t('loginTitle')}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} noValidate className="space-y-4">
            <Field label={ta('email')} error={errors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined }));
                }}
                disabled={locked}
                aria-invalid={!!errors.email}
                className={inputCls}
                autoComplete="username"
              />
            </Field>

            <Field label={ta('password')} error={errors.password}>
              <PasswordField
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  setErrors((p) => ({ ...p, password: undefined }));
                }}
                visible={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                invalid={!!errors.password}
                showLabel={ta('showPassword')}
                hideLabel={ta('hidePassword')}
                autoComplete="current-password"
              />
            </Field>

            {locked ? (
              <Alert variant="destructive">
                <AlertDescription>{t('cooldownMessage', { seconds: secondsLeft })}</AlertDescription>
              </Alert>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {failedAttempts > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('attemptsLeft', {
                      count: MAX_ATTEMPTS - failedAttempts,
                      seconds: COOLDOWN_MS / 1000,
                    })}
                  </p>
                )}
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading || locked}>
              {loading ? t('loginButtonLoading') : t('loginButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
