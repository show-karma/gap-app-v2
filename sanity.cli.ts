import path from "node:path";
import { defineCliConfig } from "sanity/cli";
import { PAGES } from "./utilities/pages";

/**
 * Sanity CLI config, used only by `pnpm cf:build:studio`: on the Cloudflare
 * Workers build the Studio is served at `/admin/studio` as a static build
 * instead of a Next.js route, so its ~13 MiB stay out of the Worker bundle
 * (see docs/cloudflare-opennext-feasibility.md). Vercel keeps the Next route.
 *
 * `sanity.config.ts` is shared with the Next route and reads its settings
 * through app modules (`@/sanity/env`, `@/utilities/pages`), so the Vite build
 * gets the same `@/` alias and the build-time `NEXT_PUBLIC_*` values Next would
 * inline. Any other `process.env` read becomes `undefined`, as in a browser.
 */
const publicEnv = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key]) => key.startsWith("NEXT_PUBLIC_"))
    .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value ?? "")])
);

export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "placeholder",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  },
  // Asset URLs and the router both live under the Studio route.
  project: { basePath: PAGES.ADMIN_STUDIO },
  vite: (config) => ({
    ...config,
    // The app's public/ is served by the Worker already; do not copy it into the Studio.
    publicDir: false,
    resolve: {
      ...config.resolve,
      alias: [
        ...(Array.isArray(config.resolve?.alias) ? config.resolve.alias : []),
        { find: /^@\//, replacement: `${path.resolve(__dirname)}/` },
      ],
    },
    define: {
      ...config.define,
      ...publicEnv,
      "process.env.KARMA_STUDIO_STATIC_BUILD": JSON.stringify("1"),
      "process.env": "{}",
    },
  }),
});
