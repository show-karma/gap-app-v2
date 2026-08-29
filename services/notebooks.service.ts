import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";

/**
 * Notebook pages — the read half of the wire contract in gap-indexer PR #2411.
 *
 * Both endpoints are public and return `published` configs only. A draft
 * answers 404 exactly as an unknown slug does, so nothing here can be used to
 * discover what a community is still drafting; callers must treat a 404 as
 * "no such page", never as "not published yet".
 */

export const NOTEBOOK_STATUSES = ["draft", "published"] as const;

/**
 * The API narrows to this closed set. It is mirrored rather than widened to
 * `string` so an unexpected value fails Zod parsing at the boundary instead of
 * flowing into the UI.
 */
export const NotebookStatusSchema = z.enum(NOTEBOOK_STATUSES);

export type NotebookStatus = z.infer<typeof NotebookStatusSchema>;

/**
 * `passthrough()` keeps the client forward-compatible: a field added by the
 * API must not fail an existing page. Every field the UI reads is declared.
 *
 * `artifactUrl` is validated as an absolute https URL here as well as
 * server-side — this value ends up as an iframe `src`, so a non-https or
 * `javascript:` value must never reach a component even if the API regressed.
 */
export const NotebookConfigSchema = z
  .object({
    id: z.string().optional(),
    communityId: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    artifactUrl: z.string().refine(
      (value) => {
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "artifactUrl must be an absolute https:// URL" }
    ),
    artifactVersion: z.string(),
    status: NotebookStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type NotebookConfig = z.infer<typeof NotebookConfigSchema>;

export const NotebookConfigListSchema = z.array(NotebookConfigSchema);

/**
 * Published notebook pages for a community, newest first (the API orders by
 * creation date). Returns an empty array when the community has none —
 * an empty list is a state to render, not an error.
 */
export async function getPublishedNotebooks(communitySlug: string): Promise<NotebookConfig[]> {
  const data = await api.get<NotebookConfig[]>(INDEXER.V2.NOTEBOOK_CONFIGS.LIST(communitySlug), {
    schema: NotebookConfigListSchema,
    isAuthorized: false,
  });
  return data ?? [];
}

/**
 * One published notebook page. Throws for an unknown slug, a draft, or an
 * unknown community — the caller renders a not-found state rather than
 * distinguishing the cases, which is what keeps drafts unenumerable.
 */
export async function getPublishedNotebook(
  communitySlug: string,
  slug: string
): Promise<NotebookConfig> {
  return api.get<NotebookConfig>(INDEXER.V2.NOTEBOOK_CONFIGS.GET(communitySlug, slug), {
    schema: NotebookConfigSchema,
    isAuthorized: false,
  });
}
