"use client";

import { useDashboardContext } from "@/components/Pages/Dashboard/DashboardProvider";
import { SuperAdminSection } from "@/components/Pages/Dashboard/SuperAdminSection/SuperAdminSection";
import { BentoGrid } from "@/components/Pages/Dashboard/v3/BentoGrid";
import { GettingStartedView } from "@/components/Pages/Dashboard/v3/GettingStartedView";
import { SkeletonList } from "@/components/Pages/Dashboard/v3/primitives";

/**
 * `/dashboard` — the bento overview. Renders one link tile per active role
 * module (each navigating to `/dashboard/[module]`), or the getting-started
 * cards when the user matches no role. The super-admin panel sits below the
 * grid and only shows here, never on a drill-in.
 */
export default function DashboardOverviewPage() {
  const { modules, showSuperAdmin, advisorLoading } = useDashboardContext();

  let content: React.ReactNode;
  if (modules.length > 0) {
    content = <BentoGrid modules={modules} />;
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
