import { cn } from "@/utilities/tailwind";
import { SK } from "./v3/soft-classes";
import "./v3/dashboard-soft.css";

/** A single bento-tile skeleton, mirroring BentoTile's loading markup. */
function SkeletonTile() {
  return (
    <div className="relative col-span-2 flex flex-col gap-3 rounded-sf-card bg-sf-card p-5 min-[640px]:col-span-1 min-[980px]:col-span-2">
      <div className="flex items-center gap-2.5">
        <span className={cn(SK, "h-[34px] w-[34px] !rounded-[10px]")} />
        <span className={cn(SK, "h-[13px] w-[110px]")} />
      </div>
      <span className={cn(SK, "h-[30px] w-16")} />
      <span className={cn(SK, "h-[11px] w-[85%]")} />
      <span className={cn(SK, "h-[11px] w-[70%]")} />
    </div>
  );
}

/**
 * Loading state for the role-aware dashboard. Renders the flat soft shell
 * (welcome header + bento) as skeletons so the layout doesn't shift when the
 * real modules resolve.
 */
export function DashboardLoading() {
  return (
    <div className="dashv3 min-h-[calc(100vh-var(--navbar-height,64px))] bg-sf-panel">
      <div className="mx-auto max-w-[1920px] px-8 lg:px-24">
        <div className="pb-12 pt-8">
          <div className="mb-[22px] flex items-center gap-[18px]">
            <span className={cn(SK, "h-[60px] w-[60px] flex-none !rounded-full")} />
            <span className={cn(SK, "h-[38px] w-[280px] !rounded-[10px]")} />
          </div>
          <div className="grid grid-cols-2 gap-[14px] min-[980px]:grid-cols-6">
            {Array.from({ length: 3 }, (_, index) => (
              <SkeletonTile key={`dashboard-skeleton-tile-${index}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
