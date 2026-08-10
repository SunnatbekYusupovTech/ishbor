'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ChevronDown, LocateFixed } from 'lucide-react';
import { UZ_REGIONS, type RegionSlug } from '@/lib/regions';
import { cn } from '@/lib/utils';

const OTHER = '__other__';

const triggerCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring';

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  municipality?: string;
  state_district?: string;
  state?: string;
}
interface NominatimResult {
  address?: NominatimAddress;
  display_name?: string;
}

/**
 * Region picker: the 12 viloyat + Karakalpakstan + Tashkent city, plus a
 * free-text "Other" fallback. `value`/`onChange` still just move a plain
 * string (matches the free-text `Job.location` / jobs-filter `location`
 * field on both ends) — this only structures the common case, it doesn't
 * turn `location` into an enum.
 *
 * The trigger is a fully custom dropdown (native `<select>` option styling
 * can't be controlled, especially in dark mode), so the menu is rendered as
 * a popover list. `required` (form mode) hides the "Tanlang…" empty entry —
 * a region is always picked (the caller seeds a default); the filter keeps
 * the empty entry so "any location" stays expressible.
 *
 * The "Use my location" button reverse-geocodes the browser's coordinates
 * via Nominatim (OpenStreetMap) and maps the result back onto a region —
 * or into the "Other" free-text field when no region matches.
 */
export function RegionSelect({
  value,
  onChange,
  className,
  triggerClassName,
  required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Wrapper className (trigger + menu + conditional "other" input stack). */
  className?: string;
  /** Override the trigger button's own className (defaults to a standard input look). */
  triggerClassName?: string;
  /** Form mode: no "Tanlang…" placeholder — a region is always picked. */
  required?: boolean;
}) {
  const t = useTranslations('regions');
  const locale = useLocale();

  const labelToSlug = new Map(UZ_REGIONS.map((slug) => [t(slug), slug as RegionSlug]));
  const matchedSlug = labelToSlug.get(value);
  const selectValue = value === '' ? (required ? OTHER : '') : (matchedSlug ?? OTHER);

  // Remembers what was typed into "Other" even while a known region is
  // selected, so switching back to "Other" doesn't lose it.
  const [customText, setCustomText] = useState(matchedSlug || value === '' ? '' : value);
  // Whether the free-text "Other" mode is active — tracked separately from
  // `selectValue` so that picking "Boshqa" (with empty text) reveals the
  // input even in the non-required (filter) mode where '' means "no filter".
  const [isOther, setIsOther] = useState(selectValue === OTHER);
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [menuMaxHeight, setMenuMaxHeight] = useState(256);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

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
    // Open upward when there's more room above than below (or the menu
    // wouldn't fit under the trigger) — never just down-only.
    let up = false;
    let maxHeight = 256;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      up = spaceAbove > spaceBelow;
      maxHeight = Math.max(120, Math.min(256, (up ? spaceAbove : spaceBelow) - 8));
    }
    setOpenUp(up);
    setMenuMaxHeight(maxHeight);
    setOpen(true);
  };

  const display =
    selectValue === '' ? t('selectPlaceholder') : selectValue === OTHER ? customText || t('other') : value;

  const pickFromGeocode = (data: NominatimResult): string | null => {
    const parts = [
      data.address?.city,
      data.address?.town,
      data.address?.village,
      data.address?.county,
      data.address?.municipality,
      data.address?.state_district,
      data.address?.state,
    ].filter((p): p is string => !!p);
    for (const part of parts) {
      const p = part.toLowerCase().trim();
      for (const [label, slug] of labelToSlug) {
        if (p === label || p.includes(label) || label.includes(p)) return t(slug);
      }
    }
    return parts[0] ?? null;
  };

  const locate = () => {
    if (!navigator.geolocation || !window.isSecureContext) {
      setLocateError(t('locateError'));
      return;
    }
    const run = () => {
      setLocating(true);
      setLocateError(null);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=${locale}`,
              { headers: { 'Accept-Language': locale } },
            );
            if (!res.ok) throw new Error('geocode');
            const data = (await res.json()) as NominatimResult;
            const name = pickFromGeocode(data);
            setCustomText(name ?? '');
            onChange(name ?? '');
            setIsOther(name ? labelToSlug.has(name) === false : true);
          } catch {
            setLocateError(t('locateError'));
          } finally {
            setLocating(false);
          }
        },
        () => {
          setLocating(false);
          setLocateError(t('locateError'));
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
      );
    };
    // A previously-denied permission silently rejects getCurrentPosition —
    // surface it so the user knows to re-enable it in the browser settings.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          if (status.state === 'denied') {
            setLocateError(t('locateDenied'));
            return;
          }
          run();
        })
        .catch(run);
    } else {
      run();
    }
  };

  const pick = (slug: RegionSlug) => {
    onChange(t(slug));
    setIsOther(false);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={cn('relative space-y-2', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          triggerCls,
          triggerClassName,
          'relative flex items-center justify-between gap-2 text-left',
        )}
      >
        <span
          className={cn('truncate', selectValue === '' && !required && 'text-muted-foreground')}
        >
          {display}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('selectPlaceholder')}
          style={{ maxHeight: menuMaxHeight }}
          className={cn(
            'absolute z-50 w-full min-w-[15rem] overflow-y-auto overscroll-contain rounded-lg border border-input bg-popover p-1 shadow-lg',
            openUp ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {!required && (
            <li role="option" aria-selected={selectValue === ''}>
              <OptionRow
                label={t('selectPlaceholder')}
                active={selectValue === ''}
                onClick={() => {
                  onChange('');
                  setIsOther(false);
                  setOpen(false);
                }}
              />
            </li>
          )}
          {UZ_REGIONS.map((slug) => (
            <li key={slug} role="option" aria-selected={selectValue === slug}>
              <OptionRow label={t(slug)} active={selectValue === slug} onClick={() => pick(slug)} />
            </li>
          ))}
          <li role="option" aria-selected={selectValue === OTHER || isOther}>
            <OptionRow
              label={t('other')}
              active={selectValue === OTHER || isOther}
              onClick={() => {
                onChange(customText);
                setIsOther(true);
                setOpen(false);
              }}
            />
          </li>
        </ul>
      )}

      {(selectValue === OTHER || isOther) && (
        <input
          value={customText}
          onChange={(e) => {
            setCustomText(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={t('otherPlaceholder')}
          maxLength={100}
          className={triggerCls}
        />
      )}

      <div className="space-y-1.5">
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          {locating ? t('locating') : t('locate')}
        </button>
        {locateError && <p className="break-words text-xs text-destructive">{locateError}</p>}
      </div>
    </div>
  );
}

function OptionRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent',
      )}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="h-4 w-4 shrink-0" />}
    </button>
  );
}
