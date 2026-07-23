/**
 * Bare admin shell — no `SiteNav` (no jobs/leaderboard/post nav, no saved
 * listings, no account dropdown). The admin console is a separate tool, not
 * another page of the public site; each admin page (dashboard, users, jobs,
 * sessions, questions, login) supplies its own heading. `useAdminGuard`
 * (called by every page except `admin/login`) is what actually keeps
 * non-admins out — this layout is only about the chrome, not access control.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main className="container py-6 md:py-10">{children}</main>;
}
