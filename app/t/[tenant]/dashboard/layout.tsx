import type { Metadata } from "next";
import { DashboardProvider } from "@/components/Pages/Dashboard/DashboardProvider";
import { PermissionProvider } from "@/src/core/rbac/context/permission-context";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Dashboard",
  description:
    "Your Karma dashboard. Manage projects, review grants, track milestones, and monitor your ecosystem activity.",
  path: "/dashboard",
  robots: { index: false, follow: true },
});

/**
 * The `/dashboard` route tree renders the bento overview (`/dashboard`) and each
 * role drill-in (`/dashboard/[module]`) as sibling segments under one layout.
 *
 * `DashboardProvider` lives here (not in a page) so the data orchestration and
 * the `SoftShell` chrome stay mounted across overview↔drill-in navigation — the
 * layout is not re-created on child-segment changes, so nothing refetches and
 * the shell doesn't re-animate. Browser Back/Forward move between segments
 * natively (no hash bookkeeping).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex w-full flex-col">
      <PermissionProvider>
        <DashboardProvider>{children}</DashboardProvider>
      </PermissionProvider>
    </main>
  );
}
