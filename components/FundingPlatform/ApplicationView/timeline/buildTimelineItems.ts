import { isValid, parseISO } from "date-fns";
import type {
  ApplicationComment,
  IApplicationVersion,
  IStatusHistoryEntry,
} from "@/types/funding-platform";

export type TimelineItem =
  | { type: "comment"; timestamp: Date; data: ApplicationComment }
  | { type: "status"; timestamp: Date; data: IStatusHistoryEntry }
  | { type: "version"; timestamp: Date; data: IApplicationVersion };

const toDate = (value: string | Date): Date =>
  typeof value === "string" ? parseISO(value) : value;

interface BuildTimelineItemsInput {
  comments?: ApplicationComment[];
  statusHistory?: IStatusHistoryEntry[];
  versionHistory?: IApplicationVersion[];
}

/**
 * Merges comments, status changes, and version history into a single
 * newest-first timeline. Entries whose timestamp fails to parse are dropped
 * rather than rendered at the epoch.
 */
export function buildTimelineItems({
  comments = [],
  statusHistory = [],
  versionHistory = [],
}: BuildTimelineItemsInput): TimelineItem[] {
  const items: TimelineItem[] = [];

  comments.forEach((comment) => {
    const timestamp = toDate(comment.createdAt);
    if (isValid(timestamp)) items.push({ type: "comment", timestamp, data: comment });
  });

  statusHistory.forEach((status) => {
    const timestamp = toDate(status.timestamp);
    if (isValid(timestamp)) items.push({ type: "status", timestamp, data: status });
  });

  versionHistory.forEach((version) => {
    const timestamp = toDate(version.createdAt);
    if (isValid(timestamp)) items.push({ type: "version", timestamp, data: version });
  });

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/** Stable React key for a timeline row. `idx` only backs status rows, which carry no id. */
export function getTimelineItemKey(item: TimelineItem, idx: number): string {
  switch (item.type) {
    case "comment":
      return `comment-${item.data.id}`;
    case "version":
      return `version-${item.data.id}`;
    default:
      return `status-${idx}-${String(item.data.timestamp)}`;
  }
}
