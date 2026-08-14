import { envVars } from "@/utilities/enviromentVars";

/**
 * Sanity project configuration, sourced from `envVars` (see
 * `utilities/enviromentVars.ts`). All three vars default to safe empty/
 * sane values via `utilities/env.schema.ts`, so this module is safe to
 * import even when Sanity is not configured (empty `projectId` — the
 * content gateway is responsible for treating that as "no CMS" and
 * returning empty results instead of throwing).
 */
/**
 * Sanity project ids are restricted to lowercase letters, digits and dashes.
 * `createClient` validates this synchronously at construction time, so a
 * malformed value does not degrade gracefully — it throws while Next collects
 * page data and takes down the *entire* production build (every route, not
 * just /blog). A CMS misconfiguration must never be able to block the whole
 * site from deploying, so normalize here and fall back to "not configured".
 */
const PROJECT_ID_PATTERN = /^[a-z0-9-]+$/;

function resolveProjectId(raw: string): string {
  // Values pasted into a hosting dashboard routinely pick up surrounding
  // whitespace or a trailing newline — a valid id, just dirty.
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (PROJECT_ID_PATTERN.test(trimmed)) return trimmed;

  // Non-empty but malformed: report enough to identify the problem (length and
  // the offending characters) without echoing the whole configured value, then
  // fall back to the already-supported "unconfigured" state.
  const offending = Array.from(new Set(trimmed.replace(/[a-z0-9-]/g, ""))).join("");
  console.warn(
    `[Sanity] Ignoring malformed NEXT_PUBLIC_SANITY_PROJECT_ID: length ${trimmed.length}, ` +
      `disallowed character(s) ${JSON.stringify(offending)}. ` +
      'Expected only lowercase letters, digits and dashes (e.g. "abc12xyz"). ' +
      "Treating Sanity as unconfigured — blog content stays empty until this is fixed."
  );
  return "";
}

export const projectId = resolveProjectId(envVars.NEXT_PUBLIC_SANITY_PROJECT_ID);
export const dataset = envVars.NEXT_PUBLIC_SANITY_DATASET;
export const apiVersion = envVars.NEXT_PUBLIC_SANITY_API_VERSION;
