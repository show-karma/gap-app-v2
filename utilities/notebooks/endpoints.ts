/**
 * Notebook page endpoints on the GAP API (gap-indexer, notebook-config
 * routes). Kept out of `utilities/indexer.ts`, which is already over the
 * file-size limit.
 *
 * Both reads are public and return `published` configs only — a draft
 * answers 404 exactly as an unknown slug does, so the viewer cannot
 * distinguish the two.
 */
export const NOTEBOOK_ENDPOINTS = {
  LIST: (communityIdOrSlug: string) => `/v2/communities/${communityIdOrSlug}/notebook-configs`,
  GET: (communityIdOrSlug: string, slug: string) =>
    `/v2/communities/${communityIdOrSlug}/notebook-configs/${slug}`,
} as const;
