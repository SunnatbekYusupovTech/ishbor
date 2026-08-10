import type { SalaryCurrency } from '@/types/domain';

export const SALARY_CURRENCY_SYMBOLS: Record<SalaryCurrency, string> = {
  uzs: "so'm",
  usd: '$',
  rub: '₽',
  eur: '€',
};

/**
 * Formats a numeric salary amount with its currency, e.g. `"$500"`,
 * `"₽50 000"`, `"1 500 000 so'm"`. UZS is written with a suffix
 * ("so'm"), the rest with a prefix symbol.
 */
export function formatSalaryAmount(amount: string, currency: SalaryCurrency): string {
  const digits = amount.replace(/\D/g, '');
  if (!digits) return '';
  const n = Number(digits);
  const formatted = Number.isFinite(n) ? n.toLocaleString('en-US') : digits;
  return currency === 'uzs' ? `${formatted} so'm` : `${SALARY_CURRENCY_SYMBOLS[currency]}${formatted}`;
}
