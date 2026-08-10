'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FlaskConical, Pencil, Check, AlertTriangle, UserRoundCog } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import { Field, PasswordField, inputCls, isPasswordStrongEnough, EMAIL_RE } from '@/components/form-field';
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
import { RolePicker } from '@/components/RolePicker';

type FieldErrors = Partial<Record<'name' | 'email' | 'newPassword' | 'currentPassword', string>>;

/**
 * Owner-only account settings — name/email/password + delete account.
 * Only rendered when `profile.isOwner`, so `name`/`email`/`isQaTester` come
 * from a separate `api.me()` call the page makes (the public `FreelancerProfile`
 * response doesn't include `email`/`isQaTester`).
 */
export function AccountSection({
  name,
  email,
  role,
  isQaTester,
  onUpdated,
}: {
  name: string;
  email: string;
  /** `undefined` for admins — the role card is pointless there (granted via DB/admin panel). */
  role?: 'seeker' | 'employer';
  isQaTester?: boolean;
  onUpdated: (patch: { name: string; email: string }) => void;
}) {
  const t = useTranslations('profile');
  const ta = useTranslations('auth');

  return (
    <div id="account" className="scroll-mt-24 space-y-5">
      {isQaTester && (
        <Alert>
          <FlaskConical className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">{t('qaTester')}</span> — {t('qaTesterHint')}
          </AlertDescription>
        </Alert>
      )}

      <EditAccountCard name={name} email={email} onUpdated={onUpdated} t={t} ta={ta} />
      {role && <RoleCard role={role} t={t} />}
      <DangerZoneCard />
    </div>
  );
}

/** "Who are you?" — the seeker/employer side of the market, changeable anytime. */
function RoleCard({ role, t }: { role: 'seeker' | 'employer'; t: ReturnType<typeof useTranslations<'profile'>> }) {
  const [roleValue, setRoleValue] = useState<'seeker' | 'employer'>(role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (roleValue === role) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateMe({ role: roleValue });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('roleChangeError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-base">
          <UserRoundCog className="h-4 w-4" />
          {t('roleTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('roleHint')}</p>
        <RolePicker
          value={roleValue}
          onChange={(r) => {
            setRoleValue(r);
            setSaved(false);
            setError(null);
          }}
          disabled={saving}
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {saved && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>{t('roleSaved')}</AlertDescription>
          </Alert>
        )}
        <Button onClick={save} disabled={saving || roleValue === role}>
          {saving ? t('saving') : t('save')}
        </Button>
      </CardContent>
    </Card>
  );
}

function EditAccountCard({
  name,
  email,
  onUpdated,
  t,
  ta,
}: {
  name: string;
  email: string;
  onUpdated: (patch: { name: string; email: string }) => void;
  t: ReturnType<typeof useTranslations<'profile'>>;
  ta: ReturnType<typeof useTranslations<'auth'>>;
}) {
  const [nameValue, setNameValue] = useState(name);
  const [emailValue, setEmailValue] = useState(email);
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
    if (!nameValue.trim()) fieldErrors.name = ta('errNameRequired');
    if (!emailValue.trim()) fieldErrors.email = ta('errEmailRequired');
    else if (!EMAIL_RE.test(emailValue.trim())) fieldErrors.email = ta('errEmailInvalid');
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
        name: nameValue.trim() !== name ? nameValue.trim() : undefined,
        email: emailValue.trim() !== email ? emailValue.trim() : undefined,
        ...(changingPassword ? { currentPassword, newPassword } : {}),
      });
      onUpdated({ name: updated.name, email: updated.email });
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
              value={nameValue}
              onChange={(e) => {
                setNameValue(e.target.value);
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
              value={emailValue}
              onChange={(e) => {
                setEmailValue(e.target.value);
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
          ) : null}

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

          <div className="flex flex-wrap items-center gap-5">
            {!changingPassword && (
              <button
                type="button"
                onClick={toggleChangePassword}
                className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                {t('changePassword')}
              </button>
            )}
            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
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
