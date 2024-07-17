import { IMilestone } from "@show-karma/karma-gap-sdk/core/class/entities/Milestone";

export type MilestoneWithCompleted = IMilestone & { completedText?: string };
