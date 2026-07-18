import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/SiteNav';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Ishbor — Verified Skill Assessment',
  description: 'Secure, anti-cheat skill assessment for the Ishbor job portal.',
};

/** Pre-render every locale at build time. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Enable static rendering for this request.
  setRequestLocale(locale);

  const t = await getTranslations('common');

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <div className="flex min-h-screen flex-col">
              <SiteNav />

              <main className="container flex-1 py-6 md:py-10">{children}</main>

              <footer className="border-t py-4">
                <div className="container text-center text-xs text-muted-foreground">
                  © {new Date().getFullYear()} {t('footer')}
                </div>
              </footer>
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
