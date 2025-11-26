import type { ImpactIndicatorWithData } from "@/types/impactMeasurement";

export interface CategorizedIndicator extends ImpactIndicatorWithData {
  source: "project" | "community" | "unlinked";
  communityName?: string;
  communityId?: string;
}

export interface OutputData {
  outputId: string;
  value: string | number;
  proof?: string;
  startDate?: string;
  endDate?: string;
}

export interface DeliverableData {
  name: string;
  proof: string;
  description?: string;
}

export interface CommunityData {
  uid: string;
  name: string;
}
