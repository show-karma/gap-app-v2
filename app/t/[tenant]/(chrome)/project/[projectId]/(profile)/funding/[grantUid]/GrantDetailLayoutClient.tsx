"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const GrantDetailLayout = dynamic(
  () =>
    import("@/components/Pages/Project/v2/GrantDetail/GrantDetailLayout").then(
      (mod) => mod.GrantDetailLayout
    ),
  {
    loading: () => (
      <div className="flex flex-col gap-4">
        <div className="animate-pulse h-8 w-32 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="animate-pulse h-10 w-64 bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="animate-pulse h-12 w-full bg-gray-200 dark:bg-zinc-800 rounded" />
        <div className="animate-pulse h-64 w-full bg-gray-200 dark:bg-zinc-800 rounded" />
      </div>
    ),
  }
);

interface GrantDetailLayoutClientProps {
  children: React.ReactNode;
  projectId: string;
  grantUid: string;
}

/**
 * Client-side grant detail layout.
 * Provides back button, grant title with actions, and tab navigation.
 */
export function GrantDetailLayoutClient({
  children,
  projectId,
  grantUid,
}: GrantDetailLayoutClientProps) {
  // A boundary is allowed here: the grant routes are Stream-class, not
  // sitemap-crawlable, so DEV-612 does not apply. It covers the `usePathname()`
  // the tab strip needs — a URL read that genuinely belongs on the client.
  return (
    <Suspense fallback={null}>
      <GrantDetailLayout projectId={projectId} grantUid={grantUid}>
        {children}
      </GrantDetailLayout>
    </Suspense>
  );
}
