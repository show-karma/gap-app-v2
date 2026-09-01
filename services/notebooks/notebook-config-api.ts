/**
 * Where the notebook indexer calls go, when that is not the configured indexer.
 *
 * TEMPORARY LOCAL-DEVELOPMENT SCAFFOLD. The notebook config registry and the
 * notebook METRICS registry both live in the unmerged gap-indexer branch
 * (config from PR #2411, metrics from the V3-2 work), so no deployed indexer
 * serves either yet. To exercise the builder end to end a developer runs that
 * branch locally and points ONLY the notebook calls at it.
 *
 * ONE VARIABLE FOR BOTH, because it is one server: config and metrics are the
 * same branch on the same rig, and a second variable would be two ways to
 * describe one fact — and a way to point them at different servers, which is
 * never what anybody wants. The variable keeps its original `_CONFIG_` name so
 * an already-provisioned `.env.local` does not silently stop working.
 *
 * WITHOUT THIS the metrics calls fall through to the production indexer, which
 * 404s the unmerged endpoints — and because the builder page treats a failed
 * catalogue as "no explorer", the whole feature disappears SILENTLY rather
 * than erroring. That is how the query builder came to be tested only against
 * mocks; a scaffold that is easy to forget is worth saying out loud.
 *
 * Why only the config calls. Repointing `NEXT_PUBLIC_GAP_INDEXER_URL` would
 * send the whole application at a local indexer whose database holds one
 * seeded community — community pages, projects and every other surface would
 * break, and the notebook page's own METRICS would stop being the real
 * Filecoin figures the dashboard exists to show. Scoping the override to the
 * registry keeps everything else exactly where it was.
 *
 * REMOVAL: delete this file and its call sites in `notebooks.service.ts`,
 * `notebooks-admin.service.ts` and `notebook-metric-registry.query.ts` once
 * the branch is deployed. With the variable unset every call already behaves
 * as if it were gone.
 */

/**
 * Base URL for notebook requests, or undefined to use the configured indexer.
 *
 * Returns undefined unless the variable is set, so production and every
 * deployed preview are unaffected by construction — there is no branch, flag
 * or environment check that could switch this on by accident, only an
 * explicitly provisioned URL.
 */
export function notebookIndexerBaseUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_NOTEBOOK_CONFIG_API_URL?.trim();
  return configured ? configured : undefined;
}
