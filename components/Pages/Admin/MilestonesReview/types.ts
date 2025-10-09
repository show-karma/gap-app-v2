import type { ApplicationComment } from "@/services/comments";

export interface StatusHistoryItem {
  status: string;
  timestamp: string;
  reason?: string;
}

export type TimelineItem =
  | (ApplicationComment & { type: "comment" })
  | (StatusHistoryItem & { type: "status" });
