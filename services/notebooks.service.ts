import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { notebookConfigApiBaseUrl } from "./notebooks/notebook-config-api";
import { NotebookSpecSchema } from "./notebooks/notebook-spec";

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
 * `spec` is re-validated here against the same closed vocabulary the indexer
 * enforces on write. That is not redundant: this page renders whatever the
 * spec names, so a config arriving with a section type this build does not
 * implement must fail at the boundary rather than reach a renderer that would
 * have to decide what to do with it. The indexer's copy is authoritative —
 * this one keeps a bad payload from becoming a broken page.
 */
export const NotebookConfigSchema = z
  .object({
    id: z.string().optional(),
    communityId: z.string(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    spec: NotebookSpecSchema,
    status: NotebookStatusSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .passthrough();

export type NotebookConfig = z.infer<typeof NotebookConfigSchema>;

export const NotebookConfigListSchema = z.array(NotebookConfigSchema);

/**
 * One config as the ADMIN surface sees it.
 *
 * Differs from the public shape in exactly one way, and the difference is the
 * point: `spec` may be `null`, paired with a `specError` reason, for a row
 * whose stored layout this build cannot read. The admin list has to show that
 * row — it is the only way anyone can repair it — whereas the public endpoints
 * never serve one, because such a row is forced to `draft` and drafts are
 * unreadable publicly.
 *
 * Keeping the public schema non-nullable is deliberate: the public renderer
 * genuinely cannot receive a null spec, and widening it "just in case" would
 * push a `?? throw` into every consumer to describe a state that cannot occur.
 */
export const AdminNotebookConfigSchema = NotebookConfigSchema.omit({ spec: true }).extend({
  spec: NotebookSpecSchema.nullable(),
  specError: z.string().optional(),
});

export type AdminNotebookConfig = z.infer<typeof AdminNotebookConfigSchema>;

/**
 * The least a row must carry for an admin to ACT on it.
 *
 * The fallback when a row fails the full parse for a reason we did not
 * anticipate. A card with a name, a slug and a delete button is enough to
 * repair the page; refusing to render it because some other field is wrong is
 * how one bad row took the whole builder down.
 */
export const NotebookConfigIdentitySchema = z
  .object({
    id: z.string().optional(),
    communityId: z.string(),
    slug: z.string(),
    name: z.string(),
    status: NotebookStatusSchema,
  })
  .passthrough();

/**
 * Published notebook pages for a community, newest first (the API orders by
 * creation date). Returns an empty array when the community has none —
 * an empty list is a state to render, not an error.
 */
export async function getPublishedNotebooks(communitySlug: string): Promise<NotebookConfig[]> {
  const data = await api.get<NotebookConfig[]>(INDEXER.V2.NOTEBOOK_CONFIGS.LIST(communitySlug), {
    schema: NotebookConfigListSchema,
    isAuthorized: false,
    baseURL: notebookConfigApiBaseUrl(),
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
    baseURL: notebookConfigApiBaseUrl(),
  });
}
