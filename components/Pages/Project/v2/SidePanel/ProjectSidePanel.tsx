"use client";

import type { Project } from "@/types/v2/project";
import { cn } from "@/utilities/tailwind";
import { DonateSection } from "./DonateSection";
import { EndorseSection } from "./EndorseSection";
import { QuickLinksCard } from "./QuickLinksCard";
import { SubscribeSection } from "./SubscribeSection";

interface ProjectSidePanelProps {
  project: Project;
  onDonate?: (amount: string) => void;
  onEndorse?: (message: string, name: string) => void;
  className?: string;
}

/**
 * ProjectSidePanel is the desktop-only side panel containing:
 * - Donate section
 * - Endorse section
 * - Subscribe section
 * - Quick links card
 *
 * Width: 324px (fixed)
 * Visibility: Desktop only (lg: breakpoint)
 */
export function ProjectSidePanel({
  project,
  onDonate,
  onEndorse,
  className,
}: ProjectSidePanelProps) {
  return (
    <aside
      className={cn("hidden lg:flex flex-col gap-4 w-[324px] shrink-0", className)}
      data-testid="project-side-panel"
    >
      {/* Donate Section */}
      <DonateSection project={project} onDonate={onDonate} />

      {/* Endorse Section */}
      <EndorseSection project={project} onSubmit={onEndorse} />

      {/* Subscribe Section */}
      <SubscribeSection project={project} />

      {/* Quick Links */}
      <QuickLinksCard project={project} />
    </aside>
  );
}
