'use client';

import { createContext, useContext, useMemo, useState } from 'react';

const SidebarSlotContext = createContext<{
  content: React.ReactNode;
  setContent: (node: React.ReactNode) => void;
} | null>(null);

/**
 * Lets a page (currently only the jobs listing) render its own sidebar
 * widgets (filters, saved-search presets, …) *inside* the persistent
 * `LeftSidebar` — which lives up in `SiteChrome`, outside the page's own
 * component tree — without lifting any of that page's state/handlers out of
 * it. The page keeps 100% of its logic; only the JSX's mount point moves.
 */
export function SidebarSlotProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<React.ReactNode>(null);
  const value = useMemo(() => ({ content, setContent }), [content]);
  return <SidebarSlotContext.Provider value={value}>{children}</SidebarSlotContext.Provider>;
}

/** `LeftSidebar` reads this to render whatever the current page pushed in. */
export function useSidebarSlotContent(): React.ReactNode {
  const ctx = useContext(SidebarSlotContext);
  return ctx?.content ?? null;
}

/**
 * A page calls this and pushes its sidebar JSX via the returned setter
 * (inside a `useEffect`, clearing it — `setContent(null)` — on unmount so the
 * sidebar doesn't keep showing stale filters after navigating away).
 */
export function useSidebarSlot(): (node: React.ReactNode) => void {
  const ctx = useContext(SidebarSlotContext);
  if (!ctx) {
    throw new Error('useSidebarSlot must be used within SidebarSlotProvider');
  }
  return ctx.setContent;
}
