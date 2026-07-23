'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Mail,
  ShieldCheck,
  Award,
  ListChecks,
  FlaskConical,
  LogOut,
  ArrowRight,
  Pencil,
  Check,
  AlertTriangle,
  IdCard,
} from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import type { Me, Direction } from '@/types/domain';
import { Avatar, RatingStars } from '@/components/rating';
import { DirectionProgress } from '@/components/DirectionProgress';
import { Field, PasswordField, inputCls, isPasswordStrongEnough, EMAIL_RE } from '@/components/form-field';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

type FieldErrors = Partial<Record<'name' | 'email' | 'newPassword' | 'currentPassword', string>>;

const DIRECTIONS: Direction[] = ['frontend', 'backend', 'fullstack', 'mobile'];

export default function ProfilePage() {
  const t = useTranslations('profile');
  const ta = useTranslations('auth');
  const tj = useTranslations('jobs');
  const ts = useTranslations('stacks');
  const tf = useTranslations('freelancer');
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace(('/login?next=/profile') as '/login');
      return;
    }
    api
      .me()
      .then(setMe)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('loadError')))
      .finally(() => setLoading(false));
  }, [router, t]);

  const logout = () => {
    void api.logout();
    router.push('/');
  };

  const onPickDirection = (direction: Direction) => {
    if (!me || me.primaryDirection === direction) return;
    const prev = me;
    setMe({ ...me, primaryDirection: direction }); // optimistic
    api.updateMe({ primaryDirection: direction }).catch(() => setMe(prev));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-32 animate-pulse rounded-2xl border bg-muted/40" />
        <div className="h-48 animate-pulse rounded-2xl border bg-muted/40" />
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert variant="destructive">
          <AlertDescription>{error ?? t('loadError')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasResult = me.attempts > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-6">
          <Avatar name={me.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{me.name}</p>
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {me.email}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {me.role === 'seeker' ? tj('seeker') : tj('employer')}
          </span>
        </CardContent>
      </Card>

      {me.isQaTester && (
        <Alert>
          <FlaskConical className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">{t('qaTester')}</span> — {t('qaTesterHint')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base">
            <ShieldCheck className="h-4 w-4" />
            {t('verification')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* "Who am I" — the candidate's own pick, shown as their primary badge elsewhere. */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('primaryDirection')}
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">{t('primaryDirectionHint')}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DIRECTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onPickDirection(d)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    me.primaryDirection === d
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-accent',
                  )}
                >
                  {ts(d)}
                </button>
              ))}
            </div>
          </div>

          {/* One "you are here" progress bar per direction. */}
          <div className="grid gap-2.5 border-t pt-4 sm:grid-cols-2">
            {DIRECTIONS.map((d) => (
              <DirectionProgress
                key={d}
                direction={d}
                tier={me.verificationLevels[d]}
                highlighted={me.primaryDirection === d}
              />
            ))}
          </div>

          {hasResult ? (
            <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Award className="h-3.5 w-3.5" />
                  {t('bestResult')}
                </p>
                <RatingStars percentage={me.bestPercentage} className="mt-1.5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('bestResult')} %
                </p>
                <p className="mt-1.5 text-lg font-bold tabular-nums">{me.bestPercentage}%</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t('attempts')}
                </p>
                <p className="mt-1.5 text-lg font-bold tabular-nums">{me.attempts}</p>
              </div>
            </div>
          ) : (
            <p className="border-t pt-4 text-sm text-muted-foreground">{t('noResult')}</p>
          )}

          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/test">
              {t('takeTest')}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <EditProfileCard me={me} onUpdated={setMe} t={t} ta={ta} />

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          {/* Accounts created before usernames existed fall back to their id —
              `/u/<handle>` resolves either. */}
          <Link href={`/u/${me.username ?? me.id}` as '/'}>
            <IdCard className="h-4 w-4" />
            {tf('myPublicProfile')}
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href="/leaderboard">{t('viewLeaderboard')}</Link>
        </Button>
        <Button variant="outline" onClick={logout} className="w-full sm:w-auto">
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </Button>
      </div>

      <DangerZoneCard />
    </div>
  );
}

/** Editable name/email + optional password change, all in one PATCH. */
function EditProfileCard({
  me,
  onUpdated,
  t,
  ta,
}: {
  me: Me;
  onUpdated: (me: Me) => void;
  t: ReturnType<typeof useTranslations<'profile'>>;
  ta: ReturnType<typeof useTranslations<'auth'>>;
}) {
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const clearFieldError = (field: keyof FieldErrors) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const toggleChangePassword = () => {
    setChangingPassword((v) => !v);
    setCurrentPassword('');
    setNewPassword('');
    setErrors((prev) => ({ ...prev, currentPassword: undefined, newPassword: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const fieldErrors: FieldErrors = {};
    if (!name.trim()) fieldErrors.name = ta('errNameRequired');
    if (!email.trim()) fieldErrors.email = ta('errEmailRequired');
    else if (!EMAIL_RE.test(email.trim())) fieldErrors.email = ta('errEmailInvalid');
    if (changingPassword) {
      if (!currentPassword) fieldErrors.currentPassword = t('errCurrentPasswordRequired');
      if (!newPassword) fieldErrors.newPassword = ta('errPasswordShort');
      else if (!isPasswordStrongEnough(newPassword)) fieldErrors.newPassword = ta('passwordPolicyError');
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const updated = await api.updateMe({
        name: name.trim() !== me.name ? name.trim() : undefined,
        email: email.trim() !== me.email ? email.trim() : undefined,
        ...(changingPassword ? { currentPassword, newPassword } : {}),
      });
      onUpdated(updated);
      setSaved(true);
      if (changingPassword) toggleChangePassword();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('updateError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Pencil className="h-4 w-4" />
          {t('editTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label={ta('name')} error={errors.name}>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                clearFieldError('name');
                setSaved(false);
              }}
              aria-invalid={!!errors.name}
              className={inputCls}
            />
          </Field>

          <Field label={ta('email')} error={errors.email}>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
                setSaved(false);
              }}
              aria-invalid={!!errors.email}
              className={inputCls}
            />
          </Field>

          {changingPassword ? (
            <div className="space-y-4 rounded-lg border border-dashed p-3">
              <Field label={t('currentPassword')} error={errors.currentPassword}>
                <PasswordField
                  value={currentPassword}
                  onChange={(v) => {
                    setCurrentPassword(v);
                    clearFieldError('currentPassword');
                  }}
                  visible={showCurrent}
                  onToggle={() => setShowCurrent((v) => !v)}
                  invalid={!!errors.currentPassword}
                  showLabel={ta('showPassword')}
                  hideLabel={ta('hidePassword')}
                  autoComplete="current-password"
                />
              </Field>
              <Field label={t('newPassword')} error={errors.newPassword}>
                <PasswordField
                  value={newPassword}
                  onChange={(v) => {
                    setNewPassword(v);
                    clearFieldError('newPassword');
                  }}
                  visible={showNew}
                  onToggle={() => setShowNew((v) => !v)}
                  invalid={!!errors.newPassword}
                  showLabel={ta('showPassword')}
                  hideLabel={ta('hidePassword')}
                  autoComplete="new-password"
                />
                <p className="mt-1 text-xs text-muted-foreground">{ta('passwordPolicyHint')}</p>
              </Field>
              <button
                type="button"
                onClick={toggleChangePassword}
                className="text-xs font-medium text-muted-foreground underline-offset-2 hover:underline"
              >
                {t('cancelPasswordChange')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleChangePassword}
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('changePassword')}
            </button>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>{t('saved')}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? t('saving') : t('save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Password-confirmed self-deletion, cascading server-side. */
function DangerZoneCard() {
  const t = useTranslations('profile');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openDialog = () => {
    setPassword('');
    setError(null);
    setOpen(true);
  };

  const confirmDelete = async () => {
    if (!password) {
      setError(t('deleteAccountPasswordLabel'));
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await api.deleteMe(password);
      tokenStore.clear();
      router.push('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-base text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {t('dangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('deleteAccountHint')}</p>
          <Button variant="destructive" size="sm" onClick={openDialog}>
            {t('deleteAccount')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteAccountTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('deleteAccountHint')}</p>
          <Field label={t('deleteAccountPasswordLabel')} error={error ?? undefined}>
            <PasswordField
              value={password}
              onChange={(v) => {
                setPassword(v);
                setError(null);
              }}
              visible={showPassword}
              onToggle={() => setShowPassword((v) => !v)}
              invalid={!!error}
              showLabel={t('deleteAccountPasswordLabel')}
              hideLabel={t('deleteAccountPasswordLabel')}
              autoComplete="current-password"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              {t('cancel')}
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? t('saving') : t('deleteConfirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
