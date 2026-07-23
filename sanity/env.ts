import { envVars } from "@/utilities/enviromentVars";

/**
 * Sanity project configuration, sourced from `envVars` (see
 * `utilities/enviromentVars.ts`). All three vars default to safe empty/
 * sane values via `utilities/env.schema.ts`, so this module is safe to
 * import even when Sanity is not configured (empty `projectId` — the
 * content gateway is responsible for treating that as "no CMS" and
 * returning empty results instead of throwing).
 */
export const projectId = envVars.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = envVars.NEXT_PUBLIC_SANITY_DATASET;
export const apiVersion = envVars.NEXT_PUBLIC_SANITY_API_VERSION;
