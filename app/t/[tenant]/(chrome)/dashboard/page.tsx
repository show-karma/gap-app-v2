"use client";

import { useEffect } from "react";
import { useDashboardContext } from "@/components/Pages/Dashboard/DashboardProvider";
import { SuperAdminSection } from "@/components/Pages/Dashboard/SuperAdminSection/SuperAdminSection";
import { BentoGrid } from "@/components/Pages/Dashboard/v3/BentoGrid";
import { GettingStartedView } from "@/components/Pages/Dashboard/v3/GettingStartedView";
import { SkeletonList } from "@/components/Pages/Dashboard/v3/primitives";
import { signalDashboardRoutePainted } from "@/components/Pages/Dashboard/v3/useDashboardTransition";

/**
 * `/dashboard` — the bento overview. Renders one link tile per active role
 * module (each navigating to `/dashboard/[module]`), or the getting-started
 * cards when the user matches no role. The super-admin panel sits below the
 * grid and only shows here, never on a drill-in.
 */
export default function DashboardOverviewPage() {
  const { modules, showSuperAdmin, advisorLoading } = useDashboardContext();

  // Resolve an in-flight close transition once the overview has painted so the
  // drill-in morphs back to its tile.
  useEffect(() => {
    signalDashboardRoutePainted();
  }, []);

  let content: React.ReactNode;
  if (modules.length > 0) {
    // Beneath the user's active modules, surface the getting-started cards for
    // the starting points they haven't set up yet (a project, an application,
    // etc.), so a single-module dashboard still points to what's next.
    content = (
      <div className="flex flex-col gap-[18px]">
        <BentoGrid modules={modules} />
        <GettingStartedView activeModuleKeys={modules.map((m) => m.key)} variant="secondary" />
      </div>
    );
  } else if (advisorLoading) {
    // The advisor gate is the only one that can still be undecided once every
    // other module resolved empty — hold a skeleton so the getting-started
    // cards don't flash in before an advisor's tile.
    content = <SkeletonList count={3} />;
  } else {
    content = <GettingStartedView />;
  }

  return (
    <>
      {content}
      {showSuperAdmin ? (
        <div className="mt-[18px]">
          <SuperAdminSection />
        </div>
      ) : null}
    </>
  );
}
