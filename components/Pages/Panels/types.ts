import type { PanelComment } from "@/types/panels";

/** Where a comment is pinned: the agent-stamped block id, with the visible text as fallback. */
export interface Anchor {
  id: string;
  label: string;
}

export type Comment = PanelComment;

export const anchorOf = (comment: PanelComment): Anchor => ({
  id: comment.blockId,
  label: comment.blockLabel,
});
