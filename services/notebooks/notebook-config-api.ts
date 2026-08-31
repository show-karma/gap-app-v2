/**
 * Where the notebook CONFIG calls go, when that is not the configured indexer.
 *
 * TEMPORARY LOCAL-DEVELOPMENT SCAFFOLD. The notebook config registry lives in
 * gap-indexer PR #2411, which is unmerged, so no deployed indexer serves these
 * endpoints yet. To exercise the builder end to end a developer runs that
 * branch locally and points ONLY the config calls at it.
 *
 * Why only the config calls. Repointing `NEXT_PUBLIC_GAP_INDEXER_URL` would
 * send the whole application at a local indexer whose database holds one
 * seeded community — community pages, projects and every other surface would
 * break, and the notebook page's own METRICS would stop being the real
 * Filecoin figures the dashboard exists to show. Scoping the override to the
 * registry keeps everything else exactly where it was.
 *
 * REMOVAL: delete this file and the four call sites in `notebooks.service.ts`
 * and `notebooks-admin.service.ts` once #2411 is deployed. Nothing else
 * references it, and with the variable unset every call already behaves as if
 * it were gone.
 */

/**
 * Base URL for notebook-config requests, or undefined to use the configured
 * indexer.
 *
 * Returns undefined unless the variable is set, so production and every
 * deployed preview are unaffected by construction — there is no branch, flag
 * or environment check that could switch this on by accident, only an
 * explicitly provisioned URL.
 */
export function notebookConfigApiBaseUrl(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_NOTEBOOK_CONFIG_API_URL?.trim();
  return configured ? configured : undefined;
}
