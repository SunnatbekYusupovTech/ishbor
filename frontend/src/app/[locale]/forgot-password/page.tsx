'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Field,
  PasswordField,
  inputCls,
  isPasswordStrongEnough,
  EMAIL_RE,
} from '@/components/form-field';
import { cn } from '@/lib/utils';

type Step = 'email' | 'code' | 'success';
type FieldErrors = Partial<Record<'email' | 'code' | 'password' | 'confirm', string>>;

/** Mirrors the backend's own 60s resend-cooldown (`authController.forgotPassword`) —
 *  purely cosmetic here (the server enforces the real one), just avoids a confusing
 *  "sent" toast with no visible effect if the user mashes resend. */
const RESEND_COOLDOWN_SECONDS = 60;

/** How long the success message stays visible before auto-redirecting to the
 *  login tab — long enough to read, short enough that "immediately" holds. */
const SUCCESS_REDIRECT_MS = 1500;

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  // Reset completed — jump straight to the login tab rather than making the
  // user click "Log in" themselves.
  useEffect(() => {
    if (step !== 'success') return;
    const id = setTimeout(() => router.push('/login?mode=login' as '/login'), SUCCESS_REDIRECT_MS);
    return () => clearTimeout(id);
  }, [step, router]);

  const clearFieldError = (field: keyof FieldErrors) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setErrors({ email: t('errEmailRequired') });
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: t('errEmailInvalid') });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setStep('code');
      setResendIn(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  const validateReset = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!code.trim()) next.code = t('errCodeRequired');
    else if (!/^\d{6}$/.test(code.trim())) next.code = t('errCodeFormat');
    if (!newPassword) next.password = t('errPasswordRequired');
    else if (!isPasswordStrongEnough(newPassword)) next.password = t('passwordPolicyError');
    if (!confirm) next.confirm = t('errConfirmRequired');
    else if (confirm !== newPassword) next.confirm = t('errPasswordMismatch');
    return next;
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fieldErrors = validateReset();
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api.resetPassword({ email: email.trim(), code: code.trim(), newPassword });
      setStep('success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('genericError'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || loading) return;
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setResendIn(RESEND_COOLDOWN_SECONDS);
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
          <CardTitle className="text-2xl">{t('forgotPasswordTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {step === 'email' && t('forgotPasswordSubtitleEmail')}
            {step === 'code' && t('forgotPasswordSubtitleCode')}
          </p>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={sendCode} noValidate className="space-y-4">
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
                  autoFocus
                />
              </Field>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('pleaseWait') : t('sendCode')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="font-medium text-primary hover:underline">
                  {t('backToLogin')}
                </Link>
              </p>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={submitReset} noValidate className="space-y-4">
              <Alert>
                <AlertDescription>{t('codeSentNotice')}</AlertDescription>
              </Alert>

              <Field label={t('code')} error={errors.code}>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    clearFieldError('code');
                  }}
                  aria-invalid={!!errors.code}
                  className={cn(
                    inputCls,
                    'tracking-[0.5em]',
                    errors.code ? 'border-destructive' : 'border-input',
                  )}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('codeHint')}</p>
              </Field>

              <Field label={t('newPassword')} error={errors.password}>
                <PasswordField
                  value={newPassword}
                  onChange={(v) => {
                    setNewPassword(v);
                    clearFieldError('password');
                  }}
                  visible={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                  invalid={!!errors.password}
                  showLabel={t('showPassword')}
                  hideLabel={t('hidePassword')}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('passwordPolicyHint')}</p>
              </Field>

              <Field label={t('confirmNewPassword')} error={errors.confirm}>
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
                  autoComplete="new-password"
                />
              </Field>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('pleaseWait') : t('resetPasswordButton')}
              </Button>

              <button
                type="button"
                onClick={resend}
                disabled={resendIn > 0 || loading}
                className="w-full text-center text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {resendIn > 0 ? t('resendCodeIn', { seconds: resendIn }) : t('resendCode')}
              </button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="font-medium text-primary hover:underline">
                  {t('backToLogin')}
                </Link>
              </p>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center">
              <h2 className="text-lg font-semibold">{t('resetSuccessTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('resetSuccessBody')}</p>
              <Button asChild className="w-full">
                <Link href={'/login?mode=login' as '/login'}>{t('goToLogin')}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
