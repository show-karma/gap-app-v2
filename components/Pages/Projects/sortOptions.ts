import type { ExplorerSortByOptions } from "@/types/explorer";

/**
 * Labels for the explorer's sort dropdown.
 *
 * Lives beside `ProjectsExplorer` rather than in it: a module that exports both
 * a component and a constant loses Fast Refresh for the whole file, and the
 * only reader is `ProjectsExplorerControls`, which is a different component.
 */
export const sortOptions: Record<ExplorerSortByOptions, string> = {
  createdAt: "Recently Added",
  updatedAt: "Recently Updated",
  title: "Title",
  noOfGrants: "No. of Grants",
  noOfProjectMilestones: "No. of Roadmap items",
  noOfGrantMilestones: "No. of Milestones",
};
