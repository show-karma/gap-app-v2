"use client";

import { type ReactNode, useState } from "react";
import { DashboardLoading } from "./DashboardLoading";
import { SuperAdminSection } from "./SuperAdminSection/SuperAdminSection";
import { useDashboardModules } from "./useDashboardModules";
import { BentoOverview } from "./v3/BentoOverview";
import "./v3/dashboard-soft.css";
import { GettingStartedView } from "./v3/GettingStartedView";
import { SkeletonList, WarnBar } from "./v3/primitives";
import { SoftShell } from "./v3/SoftShell";

/**
 * In-place bento dashboard: the overview and each drill-in live in one
 * component tree, so the tile morphs into its full view via a shared framer
 * `layoutId` (see BentoOverview).
 *
 * NOTE: the `/dashboard` route now renders the route-based variant instead
 * (app/dashboard/{layout,page,[module]/page}.tsx via DashboardProvider), which
 * gives native browser Back/Forward per drill-in. This component is retained as
 * the in-place reference (and for the shared `useDashboardModules` coverage in
 * Dashboard.test) until the route migration is finalized and the morph
 * animation is ported to a cross-route View Transition.
 */
export function Dashboard() {
  const { modules, isLoading, authenticated, showSuperAdmin, isGuestDueToError, advisorLoading } =
    useDashboardModules();

  // Tracks whether a bento tile is drilled into, so the admin panel banner
  // (a bento-overview affordance) hides while a module's full view is open.
  const [isDrilledIn, setIsDrilledIn] = useState(false);

  if (!authenticated || isLoading) {
    return <DashboardLoading />;
  }

  let mainContent: ReactNode;
  if (modules.length > 0) {
    mainContent = (
      <div className="flex flex-col gap-[18px]">
        <BentoOverview modules={modules} onFocusChange={(key) => setIsDrilledIn(key != null)} />
        {/* Getting-started cards for the starting points the user hasn't set up
            yet, shown beneath their active modules — hidden while drilled in. */}
        {!isDrilledIn ? (
          <GettingStartedView activeModuleKeys={modules.map((m) => m.key)} variant="secondary" />
        ) : null}
      </div>
    );
  } else if (advisorLoading) {
    mainContent = <SkeletonList count={3} />;
  } else {
    mainContent = <GettingStartedView />;
  }

  return (
    <SoftShell>
      {isGuestDueToError ? (
        <WarnBar>
          We couldn&apos;t verify your permissions. Some sections may be hidden — try refreshing.
        </WarnBar>
      ) : null}
      {mainContent}
      {showSuperAdmin && !isDrilledIn ? (
        <div className="mt-[18px]">
          <SuperAdminSection />
        </div>
      ) : null}
    </SoftShell>
  );
}
