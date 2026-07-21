/**
 * Mirrors the backend `CommentAnchor` discriminated union exactly so the
 * Next.js API-route proxy can pass-through without translation.
 *
 * Source of truth: `gap-indexer/app/modules/v2/domain/donor-research/value-object/comment-anchor.ts`.
 */

export const COMMENT_SECTION_KEYS = [
  "masthead",
  "lead-candidate",
  "runners-up",
  "comparison",
  "also-considered",
  "methodology",
] as const;
export type CommentSectionKey = (typeof COMMENT_SECTION_KEYS)[number];

export const COMMENT_ANCHOR_BOUNDS = {
  QUOTE_MAX: 500,
  PREFIX_MAX: 64,
  SUFFIX_MAX: 64,
} as const;

export interface SectionAnchor {
  kind: "section";
  sectionKey: CommentSectionKey;
}

export interface CandidateAnchor {
  kind: "candidate";
  candidateId: string;
}

export interface TextRangeAnchor {
  kind: "text_range";
  targetKind: "section" | "candidate";
  targetId: string;
  quote: string;
  prefix: string;
  suffix: string;
}

export type CommentAnchor = SectionAnchor | CandidateAnchor | TextRangeAnchor;

export function isCommentSectionKey(value: string): value is CommentSectionKey {
  return (COMMENT_SECTION_KEYS as readonly string[]).includes(value);
}
