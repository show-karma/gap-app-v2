"use client";

import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";
import { DonateSection } from "./DonateSection";
import { EndorseSection } from "./EndorseSection";
import { QuickLinksCard } from "./QuickLinksCard";
import { SubscribeSection } from "./SubscribeSection";

interface ProjectSidePanelProps {
  project: Project;
  className?: string;
}

/**
 * Separator component for dividing sections
 */
function Separator() {
  return <div className="h-px w-full bg-neutral-200 dark:bg-zinc-700" />;
}

/**
 * ProjectSidePanel is the desktop-only side panel containing:
 * - Main card with Donate, Endorse, Subscribe sections
 * - Separate Quick links card
 *
 * Width: 324px (fixed)
 * Visibility: Desktop only (lg: breakpoint)
 * Matches Figma design with neutral colors and 12px border radius
 */
export function ProjectSidePanel({ project, className }: ProjectSidePanelProps) {
  return (
    <aside
      className={cn("hidden lg:flex flex-col gap-4 w-[324px] shrink-0", className)}
      data-testid="project-side-panel"
    >
      {/* Main Card with Donate, Endorse, Subscribe */}
      <div className="flex flex-col gap-8 p-8 rounded-xl border border-neutral-200 dark:border-zinc-700 bg-neutral-100 dark:bg-zinc-800/50 shadow-sm">
        {/* Donate Section */}
        <DonateSection project={project} />

        <Separator />

        {/* Endorse Section */}
        <EndorseSection project={project} />

        <Separator />

        {/* Subscribe Section */}
        <SubscribeSection project={project} />
      </div>

      {/* Quick Links - Separate Card */}
      <QuickLinksCard project={project} />
    </aside>
  );
}
