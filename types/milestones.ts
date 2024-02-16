import type { IMilestone } from "@show-karma/karma-gap-sdk";

export type MilestoneWithCompleted = IMilestone & { completedText?: string };
