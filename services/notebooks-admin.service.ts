import { z } from "zod";
import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import { notebookIndexerBaseUrl } from "./notebooks/notebook-config-api";
import {
  type NotebookGenerationResult,
  NotebookGenerationResultSchema,
} from "./notebooks/notebook-generation.types";
import type { NotebookSpec } from "./notebooks/notebook-spec";
import {
  type AdminNotebookConfig,
  AdminNotebookConfigSchema,
  type NotebookConfig,
  NotebookConfigIdentitySchema,
  NotebookConfigSchema,
} from "./notebooks.service";

/**
 * The page builder's half of the wire contract (gap-indexer PR #2411).
 *
 * Every call here is AUTHENTICATED and community-admin gated server-side. The
 * builder UI narrows what an honest author can compose; it is not what makes
 * any of this safe. An unauthorized caller gets 401/403 from the indexer, not
 * an empty list — so a failure here is an error to surface, never a state to
 * render as "you have no pages".
 *
 * Reads use the dedicated `admin` paths rather than the public ones because
 * the public endpoints are published-only by construction: a draft 404s there
 * exactly as an unknown slug does, which is what keeps drafts unenumerable for
 * everyone else and is why the builder cannot reuse them.
 */

export interface NotebookConfigInput {
  slug: string;
  name: string;
  description?: string;
  spec: NotebookSpec;
  status?: "draft" | "published";
}

/** A partial edit. `status` alone publishes or unpublishes; `slug` renames. */
export type NotebookConfigUpdate = Partial<NotebookConfigInput>;

/**
 * Every page for a community, drafts included.
 *
 * Newest first, matching the indexer's ordering — the builder does not re-sort,
 * so the list an author sees is the list the API returned.
 */
/**
 * A row the builder can list but not fully understand.
 *
 * `spec` is null when the SERVER said so (it could not read the stored
 * layout), and `unreadable` is true when THIS CLIENT could not parse the row
 * at all. Both render the same way to an admin — a page that needs repairing —
 * but they are different failures and the distinction is kept rather than
 * flattened.
 */
export interface AdminNotebookListItem extends AdminNotebookConfig {
  /** The row did not match the expected shape; only its identity is trusted. */
  unreadable?: boolean;
}

/**
 * Every page for a community, drafts included, parsed PER ITEM.
 *
 * Whole-list parsing is what turned one corrupted row into a total lockout:
 * a single unparseable element rejected the entire response, and the admin
 * lost the list, the editor, publish, unpublish and delete for every page in
 * the community — including the healthy ones — with no hint that the cause was
 * one row.
 *
 * So each row is parsed on its own. A row that fails the full shape falls back
 * to its identity — name, slug, status — which is all an admin needs to open or
 * delete it. Only a row too malformed to identify is dropped, because there is
 * nothing to render or act on.
 */
export async function getAdminNotebooks(communitySlug: string): Promise<AdminNotebookListItem[]> {
  // Fetched unvalidated on purpose: the array is validated element by element
  // below, which a list-level schema cannot do.
  const data = await api.get<unknown>(INDEXER.V2.NOTEBOOK_CONFIGS.ADMIN_LIST(communitySlug), {
    baseURL: notebookIndexerBaseUrl(),
  });

  if (!Array.isArray(data)) return [];

  const items: AdminNotebookListItem[] = [];
  for (const row of data) {
    const parsed = AdminNotebookConfigSchema.safeParse(row);
    if (parsed.success) {
      items.push(parsed.data);
      continue;
    }

    const identity = NotebookConfigIdentitySchema.safeParse(row);
    if (identity.success) {
      items.push({
        ...identity.data,
        description: null,
        spec: null,
        specError: "This page could not be read by the builder.",
        createdAt: "",
        updatedAt: "",
        unreadable: true,
      } as AdminNotebookListItem);
    }
    // Anything without even a slug and a name is unactionable, so it is
    // omitted rather than rendered as a card with no controls.
  }

  return items;
}

/**
 * One page by slug, draft or published. Throws 404 for a slug that does not
 * exist.
 *
 * Parsed with the ADMIN schema, so a row whose stored layout could not be read
 * arrives as `spec: null` rather than failing to parse. Using the public
 * schema here is what made the editor answer "Could not load this page" for
 * exactly the row an admin opened it to repair — the list told them to fix it
 * and the editor refused to show it.
 */
export async function getAdminNotebook(
  communitySlug: string,
  slug: string
): Promise<AdminNotebookConfig> {
  return api.get<AdminNotebookConfig>(INDEXER.V2.NOTEBOOK_CONFIGS.ADMIN_GET(communitySlug, slug), {
    schema: AdminNotebookConfigSchema,
    baseURL: notebookIndexerBaseUrl(),
  });
}

/**
 * Create a page. Defaults to `draft` server-side — publishing is a separate,
 * deliberate act, so a half-composed page cannot go live on first save.
 */
export async function createNotebook(
  communitySlug: string,
  body: NotebookConfigInput
): Promise<NotebookConfig> {
  return api.post<NotebookConfig>(INDEXER.V2.NOTEBOOK_CONFIGS.CREATE(communitySlug), body, {
    schema: NotebookConfigSchema,
    baseURL: notebookIndexerBaseUrl(),
  });
}

export async function updateNotebook(
  communitySlug: string,
  slug: string,
  body: NotebookConfigUpdate
): Promise<NotebookConfig> {
  return api.put<NotebookConfig>(INDEXER.V2.NOTEBOOK_CONFIGS.UPDATE(communitySlug, slug), body, {
    schema: NotebookConfigSchema,
    baseURL: notebookIndexerBaseUrl(),
  });
}

/** Publish / unpublish. A status-only update, so nothing else can drift with it. */
export function setNotebookStatus(
  communitySlug: string,
  slug: string,
  status: "draft" | "published"
): Promise<NotebookConfig> {
  return updateNotebook(communitySlug, slug, { status });
}

/**
 * Permanently delete a page. The indexer hard-deletes: there is no restore, and
 * the slug becomes free again immediately. Callers MUST confirm first.
 */
export async function deleteNotebook(communitySlug: string, slug: string): Promise<void> {
  await api.delete(INDEXER.V2.NOTEBOOK_CONFIGS.DELETE(communitySlug, slug), {
    // 204 No Content: there is no body to validate, and demanding one would
    // turn a successful delete into a parse error.
    schema: z.undefined().optional(),
    baseURL: notebookIndexerBaseUrl(),
  });
}

// ── Slug derivation ──────────────────────────────────────────

/**
 * Normalise what an author types INTO the slug field, mid-typing.
 *
 * Deliberately not {@link slugifyNotebookName}: that strips trailing hyphens,
 * and running it on every keystroke makes a hyphen impossible to type — press
 * `-`, watch it vanish, and "grants-overview" can never be typed by hand. So
 * this keeps a trailing hyphen while the author is still going, and
 * `slugifyNotebookName` runs on blur to tidy up what they left behind.
 *
 * Everything else the schema forbids is still rejected as it is typed:
 * uppercase folds down, invalid characters collapse to a hyphen, and a leading
 * hyphen never survives.
 */
export function sanitizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "")
    .slice(0, 200);
}

/**
 * Derive a URL slug from a page name.
 *
 * Mirrors the indexer's `notebookSlugSchema`: lowercase alphanumerics and
 * hyphens, first character not a hyphen, 200 max. Deriving rather than asking
 * means the common path never hits a validation error the author has to
 * decode — but the field stays editable, because a derived slug is a guess at
 * what someone wants in their URL, not a decision to make for them.
 *
 * Returns "" when nothing survives (a name that is entirely punctuation or
 * non-Latin script). The caller treats that as "ask the author", not as a
 * valid slug — an empty slug fails the same schema on the way out.
 */
export function slugifyNotebookName(name: string): string {
  return (
    name
      .normalize("NFKD")
      // Strip combining marks so "Café" becomes "cafe" rather than losing the e.
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "")
      .slice(0, 200)
      // A trailing hyphen can reappear after the length clamp.
      .replace(/-+$/, "")
  );
}

/**
 * Ask the generator to compose a page from a description.
 *
 * A PURE FUNCTION as far as this application is concerned: it returns a
 * proposal and persists nothing. Nothing the model produced reaches storage
 * until a human has looked at it and pressed Save draft — which is also why
 * there is no variant of this that publishes. The absence is structural, not
 * a promise: this module exports no path from a generated spec to the publish
 * mutation.
 *
 * The response is validated on arrival even though the indexer validated it on
 * the way out. Same two-door rule the rest of the feature follows, and it
 * matters more here than anywhere: this is the one payload whose shape an
 * LLM had a hand in.
 */
export async function generateNotebookSpec(
  communitySlug: string,
  prompt: string
): Promise<NotebookGenerationResult> {
  return api.post<NotebookGenerationResult>(
    INDEXER.V2.NOTEBOOK_CONFIGS.GENERATE(communitySlug),
    { prompt },
    { schema: NotebookGenerationResultSchema, baseURL: notebookIndexerBaseUrl() }
  );
}
