import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // Uzbek (default), Russian, English.
  locales: ['uz', 'ru', 'en'],
  defaultLocale: 'uz',
});

export type Locale = (typeof routing.locales)[number];
