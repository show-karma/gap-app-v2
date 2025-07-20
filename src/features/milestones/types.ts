// Re-export milestone types from the main types directory
export type { UnifiedMilestone } from "@/types/roadmap";

// Re-export SDK milestone types that are commonly used
export type {
  IMilestoneResponse,
  IProjectMilestoneResponse,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

// Re-export form data types
export type { MilestoneCompletedFormData } from "./components/forms/grant-milestone-completion";

// Additional milestone-specific types can be added here as needed
