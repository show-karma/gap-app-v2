"use client";

import { PenLine } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { ViewportDeferred } from "@/components/Utilities/ViewportDeferred";
import { Button } from "@/components/ui/button";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { hasConfiguredPayoutAddresses } from "@/src/features/chain-payout-address";
import { useCommunityAdminStore } from "@/store/communityAdmin";
import { useProgressModalStore } from "@/store/modals/progress";
import { useOwnerStore } from "@/store/owner";
import { useProjectStore } from "@/store/project";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";

function SectionSkeleton({ minHeight = 120 }: { minHeight?: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-neutral-200/70 dark:bg-zinc-700/50"
      style={{ minHeight }}
    />
  );
}

const DonateSection = dynamic(() => import("./DonateSection").then((m) => m.DonateSection), {
  ssr: false,
  loading: () => <SectionSkeleton minHeight={132} />,
});
const SubscribeSection = dynamic(
  () => import("./SubscribeSection").then((m) => m.SubscribeSection),
  { ssr: false, loading: () => <SectionSkeleton minHeight={224} /> }
);
const EndorseSection = dynamic(() => import("./EndorseSection").then((m) => m.EndorseSection), {
  ssr: false,
  loading: () => <SectionSkeleton minHeight={120} />,
});
const QuickLinksCard = dynamic(() => import("./QuickLinksCard").then((m) => m.QuickLinksCard), {
  ssr: false,
  loading: () => <SectionSkeleton minHeight={216} />,
});

interface ProjectSidePanelProps {
  project: Project;
  authenticated: boolean;
  onLogin: () => void;
  className?: string;
}

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

/**
 * Separator component for dividing sections
 */
function Separator() {
  return <div className="h-px w-full bg-neutral-200 dark:bg-zinc-700" />;
}

/**
 * ProjectSidePanel is the desktop-only side panel containing:
 * - Post an update button (for authorized users)
 * - Main card with Donate, Endorse, Subscribe sections
 * - Separate Quick links card
 *
 * Width: 324px (fixed)
 * Visibility: Desktop only (lg: breakpoint)
 * Matches Figma design with neutral colors and 12px border radius
 */
function ProjectSidePanelContent({
  project,
  authenticated,
  onLogin,
  className,
}: ProjectSidePanelProps) {
  const { setIsProgressModalOpen } = useProgressModalStore();

  // Authorization checks for Post an update button
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const isCommunityAdmin = useCommunityAdminStore((state) => state.isCommunityAdmin);
  const { data: permissions, isLoading: isPermissionsLoading } = usePermissionsQuery(
    {},
    { enabled: authenticated }
  );
  const isSuperAdmin = permissions?.roles.roles.includes(Role.SUPER_ADMIN) ?? false;

  const canSetPayoutAddress =
    isProjectOwner ||
    isOwner ||
    isProjectAdmin ||
    isCommunityAdmin ||
    (!isPermissionsLoading && isSuperAdmin);
  const isAuthorized =
    isOwner || isProjectAdmin || isProjectOwner || (!isPermissionsLoading && isSuperAdmin);
  const showDonateSection =
    hasConfiguredPayoutAddresses(project.chainPayoutAddress) || canSetPayoutAddress;

  const handlePostUpdate = () => {
    setIsProgressModalOpen(true);
  };

  return (
    <aside
      className={cn("hidden lg:flex flex-col gap-4 w-[324px] shrink-0", className)}
      data-testid="project-side-panel"
    >
      {/* Post an update button - only for authorized users */}
      {isAuthorized && (
        <Button
          onClick={handlePostUpdate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 py-5"
          data-testid="post-update-button"
        >
          <PenLine className="h-4 w-4" />
          Post an update
        </Button>
      )}

      {/* Main Card with Donate, Endorse, Subscribe */}
      <div className="flex flex-col gap-8 p-8 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800/50 shadow-sm">
        {/* Donate Section - only visible if payout addresses configured or user can set them */}
        {showDonateSection && (
          <>
            <ViewportDeferred fallback={<SectionSkeleton minHeight={132} />} rootMargin="400px 0px">
              <DonateSection project={project} canSetPayoutAddress={canSetPayoutAddress} />
            </ViewportDeferred>
            <Separator />
          </>
        )}

        {/* Endorse Section */}
        <ViewportDeferred fallback={<SectionSkeleton minHeight={120} />} rootMargin="400px 0px">
          <EndorseSection project={project} authenticated={authenticated} onLogin={onLogin} />
        </ViewportDeferred>

        <Separator />

        {/* Subscribe Section */}
        <ViewportDeferred fallback={<SectionSkeleton minHeight={224} />} rootMargin="400px 0px">
          <SubscribeSection project={project} />
        </ViewportDeferred>
      </div>

      {/* Quick Links - Separate Card */}
      <ViewportDeferred fallback={<SectionSkeleton minHeight={216} />} rootMargin="500px 0px">
        <QuickLinksCard project={project} />
      </ViewportDeferred>
    </aside>
  );
}

export function ProjectSidePanel(props: ProjectSidePanelProps) {
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => process.env.NODE_ENV === "test");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewportState = () => {
      const mediaMatches =
        typeof window.matchMedia === "function"
          ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches
          : window.innerWidth >= 1024;
      setIsDesktopViewport(mediaMatches && window.innerWidth >= 1024);
    };

    updateViewportState();
    window.addEventListener("resize", updateViewportState);

    return () => {
      window.removeEventListener("resize", updateViewportState);
    };
  }, []);

  if (!isDesktopViewport) {
    return null;
  }

  return <ProjectSidePanelContent {...props} />;
}
