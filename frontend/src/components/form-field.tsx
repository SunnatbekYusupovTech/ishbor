'use client';

import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const inputCls =
  'w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring';

export function Field({
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

export function PasswordField({
  value,
  onChange,
  visible,
  onToggle,
  invalid,
  showLabel,
  hideLabel,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  invalid: boolean;
  showLabel: string;
  hideLabel: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid}
        autoComplete={autoComplete}
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

/** Mirrors the server-side `passwordPolicy` in `backend/src/validation/userSchemas.ts`
 *  (register + setting a new password — login accepts any non-empty password). */
export const PASSWORD_POLICY = {
  minLength: 8,
  hasLower: /[a-z]/,
  hasUpper: /[A-Z]/,
  hasDigit: /[0-9]/,
  hasSymbol: /[^A-Za-z0-9]/,
};

export function isPasswordStrongEnough(password: string): boolean {
  return (
    password.length >= PASSWORD_POLICY.minLength &&
    PASSWORD_POLICY.hasLower.test(password) &&
    PASSWORD_POLICY.hasUpper.test(password) &&
    PASSWORD_POLICY.hasDigit.test(password) &&
    PASSWORD_POLICY.hasSymbol.test(password)
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
