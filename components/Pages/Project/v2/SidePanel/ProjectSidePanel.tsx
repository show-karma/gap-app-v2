"use client";

import dynamic from "next/dynamic";
import type React from "react";
import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";
import { useDonationVisibility } from "./DonateSection";
import { EndorseSection } from "./EndorseSection";
import { QuickLinksCard } from "./QuickLinksCard";
import { SidebarProfileCard } from "./SidebarProfileCard";
import { SubscribeSection } from "./SubscribeSection";

const DonateSection = dynamic(
  () => import("./DonateSection").then((m) => ({ default: m.DonateSection })),
  { ssr: false }
);

interface ProjectSidePanelProps {
  project: Project;
  isVerified?: boolean;
  className?: string;
  /** Server-rendered profile card (RSC slot). When provided, renders this
   *  instead of the client SidebarProfileCard for faster initial paint. */
  serverSidePanel?: React.ReactNode;
}

/**
 * Separator component for dividing sections
 */
function Separator() {
  return <div className="h-px w-full bg-border" />;
}

export function ProjectSidePanel({ project, isVerified, className }: ProjectSidePanelProps) {
  const showDonateSection = useDonationVisibility(project);

  return (
    <aside
      className={cn("hidden lg:flex flex-col gap-4 w-[400px] shrink-0", className)}
      data-testid="project-side-panel"
    >
      {/* Outer card: profile + actions together */}
      <div className="flex flex-col rounded-xl border bg-secondary gap-2 p-2">
        {/* Inner white profile card — always render the full client version once
             project data is available. The serverSidePanel (SidebarProfileCardStatic)
             is only used during the loading state in ProjectProfileLayout. */}
        <SidebarProfileCard project={project} isVerified={isVerified} />

        {/* Actions: Donate + Endorse + Subscribe */}
        <div className="flex flex-col gap-8 p-6">
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
      </div>

      {/* Quick Links - Separate Card */}
      <QuickLinksCard project={project} />
    </aside>
  );
}
