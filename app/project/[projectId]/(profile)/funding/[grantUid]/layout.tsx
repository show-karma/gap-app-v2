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

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Grant Detail Layout for V2 Profile
 *
 * This layout provides:
 * - Back button to return to funding list
 * - Grant title with edit/delete actions
 * - Tab navigation (Overview, Milestones and Updates, Impact Criteria)
 *
 * Used within the (profile) route group to maintain the main project profile layout
 * while showing grant-specific content.
 */
export default function Layout({ children }: LayoutProps) {
  return <GrantDetailLayout>{children}</GrantDetailLayout>;
}
