"use client";

import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaff } from "@/hooks/useStaff";
import { useOwnerStore, useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import type { Project } from "@/types/v2/project";
import type { ProjectProfileStats } from "@/types/v2/project-profile.types";
import { cn } from "@/utilities/tailwind";
import { ProjectHeader } from "../Header/ProjectHeader";
import { DonateSection } from "../SidePanel/DonateSection";
import { EndorseSection } from "../SidePanel/EndorseSection";
import { QuickLinksCard } from "../SidePanel/QuickLinksCard";
import { SubscribeSection } from "../SidePanel/SubscribeSection";
import { ProjectStatsBar } from "../StatsBar/ProjectStatsBar";

interface MobileProfileContentProps {
  project: Project;
  isVerified?: boolean;
  stats: ProjectProfileStats;
  className?: string;
}

/**
 * Separator component for dividing sections
 */
function Separator() {
  return <div className="h-px w-full bg-neutral-200 dark:bg-zinc-700" />;
}

/**
 * MobileProfileContent displays the full project profile on mobile.
 *
 * Shown when "Profile" tab is active on mobile.
 * Contains:
 * - Project header (avatar, name, description, stage, activity chart)
 * - Stats bar
 * - Post an update button (for authorized users)
 * - Actions (Donate, Endorse, Subscribe)
 * - Quick links
 */
export function MobileProfileContent({
  project,
  isVerified,
  stats,
  className,
}: MobileProfileContentProps) {
  const { setIsProgressModalOpen } = useProgressModalStore();

  // Authorization checks for Post an update button
  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const { isStaff, isLoading: isStaffLoading } = useStaff();

  const isAuthorized = isOwner || isProjectAdmin || isProjectOwner || (!isStaffLoading && isStaff);

  const handlePostUpdate = () => {
    setIsProgressModalOpen(true);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} data-testid="mobile-profile-content">
      {/* Header + Stats - Same as desktop but in single column */}
      <div className="flex flex-col bg-secondary border border-border rounded-xl">
        <ProjectHeader project={project} isVerified={isVerified} />
        <ProjectStatsBar
          grants={stats.grantsCount}
          endorsements={stats.endorsementsCount}
          lastUpdate={stats.lastUpdate}
          completeRate={stats.completeRate}
        />
      </div>

      {/* Post an update button - only for authorized users */}
      {isAuthorized && (
        <Button
          onClick={handlePostUpdate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 py-5"
          data-testid="post-update-button-mobile"
        >
          <PenLine className="h-4 w-4" />
          Post an update
        </Button>
      )}

      {/* Actions Card - Same content as side panel */}
      <div className="flex flex-col gap-8 p-6 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800/50">
        <DonateSection project={project} />
        <Separator />
        <EndorseSection project={project} />
        <Separator />
        <SubscribeSection project={project} />
      </div>

      {/* Quick Links */}
      <QuickLinksCard project={project} />
    </div>
  );
}
