import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { dataset, projectId } from "@/sanity/env";
import { schemaTypes } from "@/sanity/schemas";
import { PAGES } from "@/utilities/pages";

/**
 * Sanity Studio configuration, embedded read-only-by-default at
 * `/admin/studio` (see `app/admin/studio/[[...tool]]/`). Auth is Sanity's
 * own project-member login — there is no custom auth layer here.
 *
 * `projectId` may be an empty string when Sanity is not configured (local
 * dev, CI). `defineConfig` does not validate `projectId` eagerly, but we
 * fall back to a placeholder anyway to match `sanity/lib/client.ts` and
 * keep this module safe to import in that case — the Studio UI itself
 * will show its own "no project configured" state at runtime rather than
 * the app failing to build.
 */
export default defineConfig({
  basePath: PAGES.ADMIN_STUDIO,
  projectId: projectId || "placeholder",
  dataset,
  plugins: [structureTool(), visionTool()],
  schema: {
    types: schemaTypes,
  },
});
