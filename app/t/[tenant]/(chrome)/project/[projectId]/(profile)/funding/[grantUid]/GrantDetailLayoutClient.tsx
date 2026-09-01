"use client";

import dynamic from "next/dynamic";

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
}

/**
 * Client-side grant detail layout.
 * Provides back button, grant title with actions, and tab navigation.
 */
export function GrantDetailLayoutClient({ children }: GrantDetailLayoutClientProps) {
  return <GrantDetailLayout>{children}</GrantDetailLayout>;
}
