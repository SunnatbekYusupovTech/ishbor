/**
 * Uzbekistan's 12 viloyat + Republic of Karakalpakstan + Tashkent city —
 * the full set of top-level administrative divisions. Labels are localized
 * via the `regions` message namespace (`t(slug)`); this file only fixes the
 * stable slugs/order so translations stay in sync across uz/ru/en.
 */
export const UZ_REGIONS = [
  'andijon',
  'bukhoro',
  'fergana',
  'jizzax',
  'namangan',
  'navoiy',
  'qashqadaryo',
  'qoraqalpogiston',
  'samarqand',
  'sirdaryo',
  'surxondaryo',
  'xorazm',
  'tashkentRegion',
  'tashkentCity',
] as const;

export type RegionSlug = (typeof UZ_REGIONS)[number];
