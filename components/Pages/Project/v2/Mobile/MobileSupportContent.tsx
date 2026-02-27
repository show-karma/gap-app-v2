"use client";

import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePermissionsQuery } from "@/src/core/rbac/hooks/use-permissions";
import { Role } from "@/src/core/rbac/types";
import { useOwnerStore, useProjectStore } from "@/store";
import { useProgressModalStore } from "@/store/modals/progress";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";
import { DonateSection, useDonationVisibility } from "../SidePanel/DonateSection";
import { EndorseSection } from "../SidePanel/EndorseSection";
import { QuickLinksCard } from "../SidePanel/QuickLinksCard";
import { SubscribeSection } from "../SidePanel/SubscribeSection";

interface MobileSupportContentProps {
  project: Project;
  className?: string;
}

function Separator() {
  return <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />;
}

/**
 * MobileSupportContent displays the Support tab on mobile.
 *
 * Contains:
 * - Post an update button (authorized users only)
 * - Donate, Endorse, Subscribe sections
 * - Quick links
 */
export function MobileSupportContent({ project, className }: MobileSupportContentProps) {
  const { setIsProgressModalOpen } = useProgressModalStore();

  const isOwner = useOwnerStore((state) => state.isOwner);
  const isProjectAdmin = useProjectStore((state) => state.isProjectAdmin);
  const isProjectOwner = useProjectStore((state) => state.isProjectOwner);
  const { authenticated } = useAuth();
  const { data: permissions, isLoading: isPermissionsLoading } = usePermissionsQuery(
    {},
    { enabled: authenticated }
  );
  const isSuperAdmin = permissions?.roles.roles.includes(Role.SUPER_ADMIN) ?? false;
  const isAuthorized =
    isOwner || isProjectAdmin || isProjectOwner || (!isPermissionsLoading && isSuperAdmin);
  const showDonateSection = useDonationVisibility(project);

  return (
    <div className={cn("flex flex-col gap-6", className)} data-testid="mobile-support-content">
      {isAuthorized && (
        <Button
          onClick={() => setIsProgressModalOpen(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 py-5"
          data-testid="post-update-button-mobile"
        >
          <PenLine className="h-4 w-4" />
          Post an update
        </Button>
      )}

      <div className="flex flex-col gap-8 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-secondary">
        {showDonateSection && (
          <>
            <DonateSection project={project} />
            <Separator />
          </>
        )}
        <EndorseSection project={project} />
        <Separator />
        <SubscribeSection project={project} />
      </div>

      <QuickLinksCard project={project} />
    </div>
  );
}
