'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UZ_REGIONS, type RegionSlug } from '@/lib/regions';
import { cn } from '@/lib/utils';

const OTHER = '__other__';

const selectCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring';

/**
 * Region picker: the 12 viloyat + Karakalpakstan + Tashkent city, plus a
 * free-text "Other" fallback. `value`/`onChange` still just move a plain
 * string (matches the free-text `Job.location` / jobs-filter `location`
 * field on both ends) — this only structures the common case, it doesn't
 * turn `location` into an enum.
 */
export function RegionSelect({
  value,
  onChange,
  className,
  selectClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Wrapper className (select + conditional "other" input stack vertically). */
  className?: string;
  /** Override the select's own className (defaults to a standard input look). */
  selectClassName?: string;
}) {
  const t = useTranslations('regions');

  const labelToSlug = new Map(UZ_REGIONS.map((slug) => [t(slug), slug as RegionSlug]));
  const matchedSlug = labelToSlug.get(value);
  const selectValue = value === '' ? '' : (matchedSlug ?? OTHER);

  // Remembers what was typed into "Other" even while a known region is
  // selected, so switching back to "Other" doesn't lose it.
  const [customText, setCustomText] = useState(matchedSlug || value === '' ? '' : value);

  return (
    <div className={cn('space-y-2', className)}>
      <select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value;
          if (next === OTHER) onChange(customText);
          else if (next === '') onChange('');
          else onChange(t(next as RegionSlug));
        }}
        className={selectClassName ?? selectCls}
      >
        <option value="">{t('selectPlaceholder')}</option>
        {UZ_REGIONS.map((slug) => (
          <option key={slug} value={slug}>
            {t(slug)}
          </option>
        ))}
        <option value={OTHER}>{t('other')}</option>
      </select>

      {selectValue === OTHER && (
        <input
          value={customText}
          onChange={(e) => {
            setCustomText(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={t('otherPlaceholder')}
          className={selectClassName ?? selectCls}
        />
      )}
    </div>
  );
}
