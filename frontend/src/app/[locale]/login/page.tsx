'use client';

import { Suspense, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

/** Mirrors the server-side `passwordPolicy` in `backend/src/controllers/authController.ts`
 *  (register only — login accepts any non-empty password, see that file's comment). */
const PASSWORD_POLICY = {
  minLength: 8,
  hasLower: /[a-z]/,
  hasUpper: /[A-Z]/,
  hasDigit: /[0-9]/,
  hasSymbol: /[^A-Za-z0-9]/,
};

function isPasswordStrongEnough(password: string): boolean {
  return (
    password.length >= PASSWORD_POLICY.minLength &&
    PASSWORD_POLICY.hasLower.test(password) &&
    PASSWORD_POLICY.hasUpper.test(password) &&
    PASSWORD_POLICY.hasDigit.test(password) &&
    PASSWORD_POLICY.hasSymbol.test(password)
  );
}

function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [role, setRole] = useState<'seeker' | 'employer'>('seeker');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side pre-check on register only: gives instant feedback instead
    // of a round-trip. The server enforces the same rule regardless — this
    // is a UX shortcut, not the security boundary.
    if (mode === 'register' && !isPasswordStrongEnough(password)) {
      setError(t('passwordPolicyError'));
      return;
    }

    setLoading(true);
    try {
      const res =
        mode === 'register'
          ? await api.register({ name, email, password, role })
          : await api.login({ email, password });
      tokenStore.set(res.token);
      tokenStore.setRefresh(res.refreshToken);
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
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 transition-colors',
                  mode === m ? 'bg-background text-foreground shadow' : 'text-muted-foreground',
                )}
              >
                {t(m)}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
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
                <div>
                  <label className="mb-1 block text-sm font-medium">{t('name')}</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">{t('email')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('password')}</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {mode === 'register' && (
                <p className="mt-1 text-xs text-muted-foreground">{t('passwordPolicyHint')}</p>
              )}
            </div>

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
