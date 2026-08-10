'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserRoundCog } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RolePicker } from '@/components/RolePicker';

/**
 * Small role-change dialog opened from the header's role chip (the "Ish
 * qidiruvchi"/"Ish beruvchi" label in the avatar dropdown). Saves via the
 * same `PATCH /auth/me` the account-settings card uses; a successful save
 * dispatches `ishzone:me-updated`, which refreshes the header chip live.
 */
export function RoleSelectDialog({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: 'seeker' | 'employer';
}) {
  const t = useTranslations('profile');
  const [role, setRole] = useState<'seeker' | 'employer'>(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRole(current);
      setError(null);
    }
  }, [open, current]);

  const save = async () => {
    if (role === current) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.updateMe({ role });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('roleChangeError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundCog className="h-5 w-5" />
            {t('roleTitle')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('roleHint')}</p>
          <RolePicker value={role} onChange={setRole} disabled={saving} />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
