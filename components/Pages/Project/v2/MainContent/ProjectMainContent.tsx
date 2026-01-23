"use client";

import { useCallback, useState } from "react";
import type { Project } from "@/types/v2/project";
import type { UnifiedMilestone } from "@/types/v2/roadmap";
import { cn } from "@/utilities/tailwind";
import { AboutContent } from "./AboutContent";
import { ActivityFeed } from "./ActivityFeed";
import { ActivityFilters, type ActivityFilterType, type SortOption } from "./ActivityFilters";
import { type ContentTab, ContentTabs } from "./ContentTabs";
import { ImpactContent } from "./ImpactContent";

interface ProjectMainContentProps {
  project?: Project | null;
  milestones: UnifiedMilestone[];
  milestonesCount?: number;
  completedCount?: number;
  fundingCount?: number;
  teamCount?: number;
  isAuthorized?: boolean;
  initialTab?: ContentTab;
  onTabChange?: (tab: ContentTab) => void;
  className?: string;
}

/**
 * ProjectMainContent is the main content area containing:
 * - Content tabs (Profile, Updates, About, Funding, Impact)
 * - Activity filters (Sort, filter badges)
 * - Activity feed (Timeline of project activities)
 */
export function ProjectMainContent({
  project,
  milestones,
  milestonesCount = 0,
  completedCount = 0,
  fundingCount = 0,
  teamCount = 0,
  isAuthorized = false,
  initialTab = "updates",
  onTabChange,
  className,
}: ProjectMainContentProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>(initialTab);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activeFilters, setActiveFilters] = useState<ActivityFilterType[]>([]);

  const handleTabChange = useCallback(
    (tab: ContentTab) => {
      setActiveTab(tab);
      onTabChange?.(tab);
    },
    [onTabChange]
  );

  const handleFilterToggle = useCallback((filter: ActivityFilterType) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  }, []);

  return (
    <div
      className={cn("flex flex-col gap-6 flex-1 min-w-0", className)}
      data-testid="project-main-content"
    >
      {/* Content Tabs */}
      <ContentTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        fundingCount={fundingCount}
        teamCount={teamCount}
      />

      {/* Filters - only show on Updates tab */}
      {activeTab === "updates" && (
        <ActivityFilters
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeFilters={activeFilters}
          onFilterToggle={handleFilterToggle}
          milestonesCount={milestonesCount}
          completedCount={completedCount}
        />
      )}

      {/* Tab Content */}
      <div className="flex-1" data-testid="tab-content">
        {activeTab === "updates" && (
          <ActivityFeed
            milestones={milestones}
            isAuthorized={isAuthorized}
            sortBy={sortBy}
            activeFilters={activeFilters}
          />
        )}

        {activeTab === "about" && project && <AboutContent project={project} />}
        {activeTab === "funding" && (
          <div className="text-gray-500 dark:text-gray-400" data-testid="funding-content">
            Funding content will be displayed here
          </div>
        )}
        {activeTab === "impact" && <ImpactContent />}
      </div>
    </div>
  );
}
