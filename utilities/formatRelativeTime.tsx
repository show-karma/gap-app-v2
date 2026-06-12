import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import type { ReactElement } from "react";

const DEFAULT_ABSOLUTE_FORMAT = "MMM dd, yyyy HH:mm";

const toDate = (value: string | Date): Date =>
  typeof value === "string" ? parseISO(value) : value;

/**
 * Renders a timestamp as a relative string (e.g. "2 months ago") inside a
 * semantic <time> element, with the absolute date exposed via the title
 * attribute on hover and via the dateTime attribute for assistive tech.
 *
 * Used across timeline components (CommentItem, CommentsTimeline,
 * DiscussionTab/TimelineContainer) to keep timestamp presentation consistent.
 */
export function renderRelativeTime(
  value: string | Date,
  className = "cursor-default"
): ReactElement {
  try {
    const date = toDate(value);
    if (!isValid(date)) return <span>Invalid date</span>;
    const relative = formatDistanceToNow(date, { addSuffix: true });
    const absolute = format(date, DEFAULT_ABSOLUTE_FORMAT);
    return (
      <time dateTime={date.toISOString()} title={absolute} className={className}>
        {relative}
      </time>
    );
  } catch {
    return <span>Invalid date</span>;
  }
}
