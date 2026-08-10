'use client';

import { useTranslations } from 'next-intl';
import { Briefcase, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "Who are you?" — two big option cards (job seeker / employer). Shared by
 * the first-login role-select screen, the account-settings card and the
 * header's role-change dialog so every surface picks the same way.
 */
export function RolePicker({
  value,
  onChange,
  disabled,
}: {
  value: 'seeker' | 'employer';
  onChange: (role: 'seeker' | 'employer') => void;
  disabled?: boolean;
}) {
  const t = useTranslations('auth');
  const roles = [
    { role: 'seeker', Icon: UserRound, activeCls: 'border-success bg-success/10', iconCls: 'text-success' },
    { role: 'employer', Icon: Briefcase, activeCls: 'border-primary bg-primary/10', iconCls: 'text-primary' },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {roles.map(({ role, Icon, activeCls, iconCls }) => {
        const active = value === role;
        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => onChange(role)}
            aria-pressed={active}
            className={cn(
              'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors',
              active
                ? activeCls
                : 'border-border hover:border-muted-foreground/40 hover:bg-accent',
            )}
          >
            <Icon className={cn('h-5 w-5', active ? iconCls : 'text-muted-foreground')} />
            <span className="text-sm font-semibold">{t(role === 'seeker' ? 'roleSeeker' : 'roleEmployer')}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {t(role === 'seeker' ? 'roleSeekerHint' : 'roleEmployerHint')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
