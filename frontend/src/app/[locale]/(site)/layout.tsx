import { getTranslations } from 'next-intl/server';
import { SiteNav } from '@/components/SiteNav';

/** Wraps every public-site page (jobs, test, leaderboard, login, profile, ...)
 *  with the main header + footer. The admin console (`admin/layout.tsx`)
 *  deliberately sits outside this group and does not get any of this. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('common');

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />

      <main className="container flex-1 py-6 md:py-10">{children}</main>

      <footer className="border-t py-4">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t('footer')}
        </div>
      </footer>
    </div>
  );
}
