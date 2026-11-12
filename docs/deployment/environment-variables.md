# Environment variables

Every variable the app reads, where it is read, and where it has to live when
the app is deployed somewhere other than Vercel. **Names only.** Values belong
in the hosting platform and in team secrets, never in this file or in git.

Sources: `utilities/env.schema.ts`, `.env.example`, and a grep of every
`process.env.*` access outside tests (`grep -rEo "process\.env\.[A-Z0-9_]+"`).
Re-run that grep when you add a variable, and add a row here and a line to
`.env.example` in the same change.

## How to read the table

**Kind**

- **Build · public**: a `NEXT_PUBLIC_*` variable. Next inlines it into the
  client and server bundles when `next build` runs, so it must be present **in
  the build step**. Changing it needs a rebuild. Treat the value as public,
  because anyone can read it in the shipped JavaScript.
- **Build · private**: read by `next.config.ts` or a build script while the
  build runs. It never reaches the bundle.
- **Runtime · secret**: read by server code on each request. It must be present
  in the running server and must never be a `NEXT_PUBLIC_*` variable.
- **Runtime · config**: as above, but not sensitive.
- **Platform**: set by the host or the toolchain. You do not configure it.

**Cloudflare destination** (for the `@opennextjs/cloudflare` move):

- **GH env var** / **GH env secret**: a variable or secret on the GitHub
  Environment that runs the build job (`next build` / `opennextjs-cloudflare
  build` happens in GitHub Actions). Use a secret for anything sensitive. Use a
  plain variable for public values, so build logs stay readable.
- **wrangler secret**: `wrangler secret put <NAME>`, read by the Worker at
  runtime.
- **wrangler var**: a plain `vars` entry for the Worker. Use it for non-secret
  runtime config.
- **—**: nothing to configure on Cloudflare.

## Deployment environment

These variables decide production vs preview vs development. All reads go
through `utilities/deployment-env.ts`. Precedence: `NEXT_PUBLIC_APP_ENV`, then
`APP_ENV`, then `NEXT_PUBLIC_VERCEL_ENV`, then `VERCEL_ENV`. The first non-empty
variable decides. An unknown value resolves to "unknown", which every caller
treats as the restrictive case: Sentry off, token-bridge allowlist restricted.

| Name | Used in | Kind | Cloudflare destination |
|---|---|---|---|
| `APP_ENV` | `utilities/deployment-env.ts`, used by `next.config.ts` (preview-build Sentry skip, and copied into `NEXT_PUBLIC_APP_ENV` when that variable is unset) | Build · private, and Runtime · config | GH env var (per environment). Optionally also a wrangler var |
| `NEXT_PUBLIC_APP_ENV` | `utilities/deployment-env.ts`, used by the Sentry configs, `tenant-config.ts`, `utilities/token-bridge/origins.ts` and `envVars.DEPLOYMENT_ENV` | Build · public | GH env var. Can be omitted when `APP_ENV` is set, because `next.config.ts` derives it |
| `NEXT_PUBLIC_VERCEL_ENV` | `utilities/deployment-env.ts` (fallback) | Platform (Vercel) | — (replaced by `NEXT_PUBLIC_APP_ENV`) |
| `VERCEL_ENV` | `utilities/deployment-env.ts` (fallback) | Platform (Vercel) | — (replaced by `APP_ENV`) |
| `VERCEL` | `utilities/deployment-env.ts` `isVercelPlatform()`, which decides `output: "standalone"` and the default for `NEXT_PUBLIC_VERCEL_ANALYTICS` | Platform (Vercel) | — |
| `VERCEL_URL` | `utilities/deployment-env.ts` `platformDeploymentOrigin()`, used by `utilities/fetchFromServer.ts` | Platform (Vercel) | — (falls back to `appOrigin()`) |
| `NEXT_PUBLIC_VERCEL_ANALYTICS` | `components/DeferredLayoutComponents.tsx`, through `vercelAnalyticsEnabled()` | Build · public (stamped by `next.config.ts`) | — (it is "false" when `VERCEL` is unset). Set only to override |

## App configuration

| Name | Used in | Kind | Cloudflare destination |
|---|---|---|---|
| `NEXT_PUBLIC_ENV` | `utilities/enviromentVars.ts`, `utilities/domains.ts` (`appOrigin()`), `proxy.ts`, `app/t/[tenant]/layout.tsx`, `utilities/network.ts`, `utilities/redirectHelpers.ts`, `utilities/tabs.tsx`, `utilities/analytics/client.ts`, `constants/supportedTokens.ts`, `components/Utilities/{HotjarAnalytics,AiReferrerTracker}.tsx`, `src/features/funding-map/constants/filter-options.ts` | Build · public | GH env var |
| `NEXT_PUBLIC_GAP_INDEXER_URL` | `utilities/enviromentVars.ts`, `proxy.ts`, `app/t/[tenant]/layout.tsx` | Build · public | GH env var |
| `NEXT_PUBLIC_GAP_OAUTH_URL` | `utilities/enviromentVars.ts` | Build · public | GH env var |
| `NEXT_PUBLIC_DOCS_ORIGIN` | `utilities/domains.ts` (`docsOrigin()`) | Build · public | GH env var (only if overridden) |
| `NEXT_PUBLIC_FUNDING_PLATFORM_EXTERNAL_LINKS` | `utilities/enviromentVars.ts`, `utilities/fundingPlatformUrls.ts` | Build · public | GH env var (only if overridden) |
| `NEXT_PUBLIC_TOKEN_BRIDGE_PREVIEW_PREFIX` | `utilities/token-bridge/origins.ts` | Build · public | GH env var (previews only; production ignores it) |
| `NEXT_PUBLIC_E2E_AUTH_BYPASS` | `utilities/auth/e2e-auth.ts`, `utilities/auth/token-manager.ts`, `components/Utilities/E2EStoreExposer.tsx`, `components/Manage/ManageLayoutShell.tsx`, project pages under `app/t/[tenant]/(chrome)/project/[projectId]/` | Build · public | GH env var, **E2E builds only**. Never set it on a deployed environment |
| `NEXT_PUBLIC_APP_VERSION` | `utilities/analytics/client.ts` | Build · public (stamped by `next.config.ts` from `package.json`) | — |
| `WHITELABEL_EXTRA_DOMAINS_JSON` | `utilities/whitelabel-config.ts` | Runtime · config, also read at build | GH env var and wrangler var |
| `<TENANT>_API_URL`, `<TENANT>_RPC_URL`, `<TENANT>_INDEXER_URL` | `src/infrastructure/config/tenant-config.ts` (`getEnvVar`, dynamic key, e.g. `KARMA_API_URL`) | Runtime · config | wrangler var, only if one is ever set. Nothing consumes the resolved values today |

## Chains and wallets

| Name | Used in | Kind | Cloudflare destination |
|---|---|---|---|
| `NEXT_PUBLIC_RPC_MAINNET`, `NEXT_PUBLIC_RPC_OPTIMISM`, `NEXT_PUBLIC_RPC_ARBITRUM`, `NEXT_PUBLIC_RPC_BASE`, `NEXT_PUBLIC_RPC_CELO`, `NEXT_PUBLIC_RPC_POLYGON`, `NEXT_PUBLIC_RPC_SEI`, `NEXT_PUBLIC_RPC_LISK`, `NEXT_PUBLIC_RPC_SCROLL`, `NEXT_PUBLIC_RPC_SEPOLIA`, `NEXT_PUBLIC_RPC_OPTIMISM_SEPOLIA`, `NEXT_PUBLIC_RPC_BASE_SEPOLIA` | `utilities/enviromentVars.ts` (`envVars.RPC`) | Build · public | GH env secret. The URLs embed provider keys: they are public once shipped, but keep them out of logs |
| `NEXT_PUBLIC_PRIVY_APP_ID` | `utilities/enviromentVars.ts` | Build · public | GH env secret (already a repo secret) |
| `NEXT_PUBLIC_PROJECT_ID` | `utilities/enviromentVars.ts` (WalletConnect) | Build · public | GH env secret (already a repo secret) |
| `NEXT_PUBLIC_ALCHEMY_KEY` | `utilities/env.schema.ts` | Build · public | GH env secret |
| `NEXT_PUBLIC_ALCHEMY_POLICY_ID` | `utilities/enviromentVars.ts` | Build · public | GH env var |
| `NEXT_PUBLIC_ZERODEV_PROJECT_ID` | `utilities/enviromentVars.ts` | Build · public | GH env var |
| `NEXT_PUBLIC_HEDGEY_CAMPAIGN_IDS` | `src/features/claim-funds/providers/hedgey/hedgey-provider.ts` | Build · public | GH env var |
| `NEXT_PUBLIC_HEDGEY_NETWORK` | `src/infrastructure/config/tenant-config.ts` | Build · public | GH env var |

## Integrations, analytics and monitoring

| Name | Used in | Kind | Cloudflare destination |
|---|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` | Build · public | GH env var |
| `SENTRY_AUTH_TOKEN` | `next.config.ts` (source-map upload) | Build · private | GH env secret. Not needed at runtime |
| `NEXT_PUBLIC_MIXPANEL_KEY` | `utilities/analytics/client.ts`, `app/api/mp/[...path]/route.ts` | Build · public | GH env var |
| `NEXT_PUBLIC_GA_TRACKING_ID` | `app/t/[tenant]/layout.tsx`, `components/Utilities/AiReferrerTracker.tsx` | Build · public | GH env var |
| `NEXT_PUBLIC_AMPLITUDE_KEY` | `utilities/env.schema.ts` | Build · public | GH env var |
| `NEXT_PUBLIC_OSO_API_KEY` | `utilities/enviromentVars.ts` | Build · public | GH env secret |
| `NEXT_PUBLIC_IPFS_TOKEN` | `utilities/env.schema.ts` | Build · public | GH env secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `utilities/enviromentVars.ts` | Build · public | GH env var |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION` | `utilities/enviromentVars.ts`, `sanity/env.ts` | Build · public | GH env var |
| `SANITY_VIEWER_TOKEN` | `sanity/lib/gateway.ts` (through `getServerEnv()`) | Runtime · secret | wrangler secret |
| `SANITY_WEBHOOK_SECRET` | `app/api/blog/revalidate/route.ts` (through `getServerEnv()`) | Runtime · secret | wrangler secret |
| `SANITY_PREVIEW_SECRET` | `app/api/blog/preview/route.ts` (through `getServerEnv()`) | Runtime · secret | wrangler secret |
| `CRON_SECRET` | `app/api/cron/warm-sitemaps/route.ts` | Runtime · secret | wrangler secret. Vercel Cron sends it today, so the Cloudflare Cron Trigger that replaces `vercel.json` `crons` must send it too |

## Build tooling and scripts

| Name | Used in | Kind | Cloudflare destination |
|---|---|---|---|
| `ANALYZE` | `next.config.ts` (bundle analyzer) | Build · private | — (local use) |
| `FIRECRAWL_API_KEY`, `FIRECRAWL_SCRAPE_URL` | `scripts/generate-llms-txt.ts` | Build · private | GH secret on the `generate-llms-txt` workflow (unchanged) |
| `INDEXER_TOKEN` | `scripts/record-d2-parity.mjs` | Build · private | — (local script) |
| `VERCEL_GIT_COMMIT_REF`, `VERCEL_GIT_PREVIOUS_SHA`, `VERCEL_GIT_COMMIT_SHA` | `vercel-ignore.sh` | Platform (Vercel) | — (a Cloudflare workflow passes its own SHAs to `scripts/ci/is-build-affecting.sh`) |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | `.github/workflows/production.yml`, `.github/workflows/staging.yml` | CI secret | — (replaced by Cloudflare's deploy credentials in the new workflow) |

## Set by the runtime or toolchain

Do not configure these: `NODE_ENV`, `NEXT_RUNTIME`, `CI`, `TZ`,
`GITHUB_STEP_SUMMARY`, `VITEST_STORYBOOK`.

## Moving to a platform other than Vercel

At minimum:

1. Set `APP_ENV` (`production`, `preview` or `development`) on the GitHub
   Environment that builds each deployment. `next.config.ts` copies it into
   `NEXT_PUBLIC_APP_ENV`, so the browser and the server agree. If you set
   `NEXT_PUBLIC_APP_ENV` explicitly, that value wins.
2. Do **not** copy `VERCEL_ENV`, `NEXT_PUBLIC_VERCEL_ENV` or `VERCEL` across.
   `VERCEL` turns off `output: "standalone"` and turns on Vercel Analytics,
   whose scripts exist only on Vercel's edge.
3. Move every **Runtime · secret** row to `wrangler secret put` and every
   **Build · public** row to the build job's GitHub Environment.

Without any deployment variable, the app fails safe. Sentry stays off, and a
production build keeps the token-bridge allowlist restricted. The preview-build
Sentry skip in `next.config.ts` does not fire, so the Sentry plugin still runs
at build time.
