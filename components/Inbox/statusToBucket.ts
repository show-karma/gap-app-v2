import type { ReviewBucket } from "./types";

/**
 * Review-bucket presentation metadata. The server now decides each item's
 * bucket; these tables only drive labels and ordering in the list UI.
 * The canonical status→bucket mapping lives in CONTEXT.md › Review bucket.
 */

/** Sort rank for buckets: action first, then waiting, then done. */
export const BUCKET_RANK: Record<ReviewBucket, number> = {
  action: 0,
  waiting: 1,
  done: 2,
};

export const BUCKET_META: Record<ReviewBucket, { key: ReviewBucket; label: string }> = {
  action: { key: "action", label: "Waiting on you" },
  waiting: { key: "waiting", label: "In progress" },
  done: { key: "done", label: "Cleared" },
};
