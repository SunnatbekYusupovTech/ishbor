'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { SALARY_CURRENCIES, type SalaryCurrency } from '@/types/domain';
import { cn } from '@/lib/utils';

/**
 * Custom currency picker for the salary field — replaces the native
 * `<select>` (whose options can't be styled) with a popover list. Pairs
 * with the `@`/`+998` prefix pills: the trigger is styled as a muted pill
 * on the left of the amount input. Opens upward when there's more room
 * above than below.
 */
export function CurrencySelect({
  value,
  onChange,
}: {
  value: SalaryCurrency;
  onChange: (c: SalaryCurrency) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    let up = false;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      up = spaceAbove > spaceBelow;
    }
    setOpenUp(up);
    setOpen(true);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-full items-center gap-1 bg-transparent py-2 pl-3 pr-3 text-sm font-semibold text-foreground outline-none"
      >
        {value.toUpperCase()}
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className={cn(
            'absolute left-0 z-50 min-w-[8.5rem] rounded-lg border border-input bg-popover p-1.5 shadow-lg',
            openUp ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {SALARY_CURRENCIES.map((c) => {
            const active = value === c;
            return (
              <li key={c} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
                  )}
                >
                  {c.toUpperCase()}
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
