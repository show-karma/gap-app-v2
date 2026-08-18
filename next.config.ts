import type { NextConfig } from "next";

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const FRAME_SRC =
  "frame-src 'self' https://auth.privy.io https://*.privy.io https://privy.karmahq.xyz https://privy.karmahq.org https://paragraph.com https://*.paragraph.com https://js.stripe.com https://crypto-js.stripe.com";

/**
 * Sites allowed to embed EMBEDDABLE_ROUTES. The filpgf.io landing site opens
 * Ask Karma in an overlay instead of navigating away, and the assistant has to
 * run on this origin for the session (and Privy sign-in) to be the real one.
 *
 * Everything else keeps `frame-ancestors 'self'`, so widening this list is the
 * only way to grow the clickjacking surface — keep it to origins we operate.
 * Local origins are added outside production so the overlay is testable.
 */
/**
 * Whether this build may be framed by preview hosts as well as the real ones.
 *
 * Deliberately opt-in rather than `NODE_ENV !== "production"`: Vercel builds
 * previews with NODE_ENV=production, so that test would quietly drop the extra
 * origins exactly where they are needed. Reading the environment explicitly
 * also fails safe — if the VERCEL_ENV variables go missing on a production
 * build, NODE_ENV is still "production" and nothing relaxes.
 *
 * Wider than `isPreviewBuild` below, which gates Sentry: this one also covers
 * local builds, where framing from a dev server has to work.
 */
const allowsPreviewEmbedders =
  process.env.VERCEL_ENV === "preview" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
  process.env.NODE_ENV !== "production";

const EMBEDDING_ORIGINS = [
  "https://filpgf.io",
  "https://www.filpgf.io",
  // Preview only: the landing site's Vercel previews change hostname per
  // branch, so they are matched by pattern rather than chased one at a time.
  // Never present in a production build.
  ...(allowsPreviewEmbedders
    ? ["https://*.vercel.app", "http://localhost:4342", "http://localhost:4343"]
    : []),
];

/** Routes the sites above may frame. One route, deliberately. */
const EMBEDDABLE_ROUTES = ["/ask-karma"];

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Content-Security-Policy",
    value: `${FRAME_SRC}; frame-ancestors 'self';`,
  },
];

/**
 * X-Frame-Options has no allowlist form, so the embeddable routes drop it and
 * rely on frame-ancestors, which supersedes it in every browser that supports
 * CSP2. Browsers old enough to lack that support would refuse the frame — they
 * fall back to the link, not to an unprotected page.
 */
const embeddableHeaders = [
  {
    key: "Content-Security-Policy",
    value: `${FRAME_SRC}; frame-ancestors 'self' ${EMBEDDING_ORIGINS.join(" ")};`,
  },
];

const removeImports = require("next-remove-imports")();

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Cap per-page static generation at 2 min. The app has no
  // generateStaticParams and builds in ~5 min, so nothing legitimately
  // approaches this — a longer stall means a hung build-time fetch that
  // should fail fast and name the page, not silently burn the build.
  staticPageGenerationTimeout: 120,
  // Standalone output produces a self-contained server.js bundle in
  // .next/standalone with traced node_modules. Cuts CI artifact size
  // from ~200MB to ~30-50MB and boots in ~2s vs ~25s for `pnpm start`.
  // Vercel ignores this setting (it uses its own Lambda format).
  output: "standalone",
  turbopack: {
    resolveAlias: {
      // Force CJS to work around Turbopack ESM bundling bug with markdown-it's isSpace export
      "markdown-it": "markdown-it/dist/index.cjs.js",
    },
  },
  experimental: {
    optimizePackageImports: [
      "@tremor/react",
      "lucide-react",
      "@radix-ui/react-icons",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "react-hot-toast",
      "@heroicons/react",
      "date-fns",
      "@headlessui/react",
      "@radix-ui/react-accordion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "wagmi",
      "@wagmi/core",
      "viem",
      "@wagmi/connectors",
      "axios",
      "semver",
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  transpilePackages: ["@show-karma/karma-gap-sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    // Next 16 defaults images.qualities to [75], coercing any other quality
    // prop to the closest listed value. The app uses quality={50}/{100} in a
    // few places (CommunityProjectEvaluatorPage) — list them explicitly so
    // those renders keep their existing quality instead of silently
    // shifting to 75.
    qualities: [50, 75, 100],
  },
  async headers() {
    // The catch-all skips the embeddable routes rather than layering over them:
    // two rules setting Content-Security-Policy on one path emit the header
    // twice, and browsers enforce the intersection — which would keep the
    // stricter frame-ancestors and silently block the embed.
    const embeddablePattern = EMBEDDABLE_ROUTES.map((route) => route.slice(1)).join("|");
    const headerRules = [
      {
        source: `/((?!${embeddablePattern}$).*)`,
        headers: securityHeaders,
      },
      ...EMBEDDABLE_ROUTES.map((source) => ({ source, headers: embeddableHeaders })),
    ];
    // Content-hashed build assets are safe to cache forever: a new deploy emits
    // new filenames, so a stale cache entry is never served for new code. This
    // ONLY holds in production. In dev, Turbopack reuses stable chunk
    // filenames, so an immutable cache pins stale code in the browser and edits
    // never appear without a hard refresh — so we apply it in production only.
    if (process.env.NODE_ENV === "production") {
      headerRules.push({
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      });
    }
    return headerRules;
  },
  async redirects() {
    return [
      // Donor research renamed the advisor-facing "Clients" concept to
      // "Personas". Keep existing bookmarks and shared internal links valid.
      {
        source: "/nonprofit-research/clients/:path*",
        destination: "/nonprofit-research/personas/:path*",
        permanent: true,
      },
      // The AI-readiness checker moved from /scanner to /nonprofits/is-ai-ready.
      // The wildcard covers both the landing page and the /scans/:id report so
      // old links (including v1.7.74 shares) keep working.
      {
        source: "/scanner/:path*",
        destination: "/nonprofits/is-ai-ready/:path*",
        permanent: true,
      },
      // Bare /community has no content of its own — the listing lives at /communities.
      // Redirecting at the edge (vs. a page that calls permanentRedirect) keeps the bare
      // path from 404'ing without shipping a route bundle. Closes #1312.
      {
        source: "/community",
        destination: "/communities",
        permanent: true,
      },
      // Redirect all old /community/:communityId/admin routes to /community/:communityId/manage
      {
        source: "/community/:communityId/admin",
        destination: "/community/:communityId/manage",
        permanent: true,
      },
      {
        source: "/community/:communityId/admin/:path*",
        destination: "/community/:communityId/manage/:path*",
        permanent: true,
      },
      // Redirect all old /community/:communityId/reviewer routes to /community/:communityId/manage
      {
        source: "/community/:communityId/reviewer",
        destination: "/community/:communityId/manage",
        permanent: true,
      },
      {
        source: "/community/:communityId/reviewer/:path*",
        destination: "/community/:communityId/manage/:path*",
        permanent: true,
      },
      // Reviewer Inbox was renamed to Action Items. The second rule covers
      // whitelabel domains, where the /community/<slug> prefix is stripped
      // from browser URLs before the middleware rewrite runs.
      {
        source: "/community/:communityId/manage/inbox",
        destination: "/community/:communityId/manage/action-items",
        permanent: true,
      },
      {
        source: "/manage/inbox",
        destination: "/manage/action-items",
        permanent: true,
      },
      // Redirect /grants to /funding-opportunities (common alias)
      {
        source: "/community/:communityId/grants",
        destination: "/community/:communityId/funding-opportunities",
        permanent: true,
      },
      // The project Updates view is consolidated into the project root
      // (/project/:projectId now renders the v2 UpdatesContent). Redirect the
      // legacy singular /update AND plural /updates paths there so old links,
      // bookmarks, and shared update URLs land on the canonical page. The
      // separate Updates tab has been removed and share links now point to the
      // root, so this no longer bounces the tab (the earlier breakage).
      {
        source: "/project/:projectId/update",
        destination: "/project/:projectId",
        permanent: true,
      },
      {
        source: "/project/:projectId/updates",
        destination: "/project/:projectId",
        permanent: true,
      },
    ];
  },
};

const bundleAnalyzer = withBundleAnalyzer(removeImports(nextConfig));

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

const withSentry = withSentryConfig(
  bundleAnalyzer,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    // An auth token is required for uploading source maps.
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: true,
    org: "karma-crypto-inc",
    project: "gap-frontend",
    tunnelRoute: "/monitoring",
    reactComponentAnnotation: true,
    // `silent: true` above already suppresses plugin logging; `debug: true`
    // contradicted it and re-enabled verbose sourcemap diagnostics on every
    // build for output nobody reads.
    debug: false,
  },
  {
    // Sentry's "widen" mode uploads source maps for a larger set of client
    // files than the ones actually referenced by the emitted bundles — its
    // own docs note this increases build time, and it grows the sourcemap
    // set held/processed during the build. The Next 16 Turbopack build is
    // already at the edge of the 8 GB build container, so the marginally
    // prettier frames are not worth the headroom. Sourcemaps for the real
    // bundles are still generated and uploaded, so stack traces stay
    // symbolicated.
    widenClientFileUpload: false,

    // Remove transpileClientSDK as it's deprecated in Next.js 15
    // transpileClientSDK: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);

// The Sentry SDK is switched OFF at runtime on every non-production
// deployment — sentry.server.config.ts, sentry.edge.config.ts and
// instrumentation-client.ts all set `enabled: NEXT_PUBLIC_VERCEL_ENV ===
// "production"`. Preview builds were still paying the full build-time cost
// of the Sentry plugin (source map generation/processing/upload plus
// reactComponentAnnotation, an SWC transform applied to every component in
// the tree) to produce artifacts for an SDK that never initializes on those
// deployments.
//
// That work happens inside the Turbopack compile phase, which is exactly
// where the 8 GB preview build container is OOM-killed (exit 137), so
// skipping it on previews removes pure waste rather than trading anything
// away.
//
// Deliberately fail-safe: only an explicit "preview" opts out. If the
// variable is missing or holds anything else — including a production build
// or a local build — Sentry stays fully enabled, so production
// instrumentation can never be dropped by accident.
const isPreviewBuild =
  process.env.VERCEL_ENV === "preview" || process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

export default isPreviewBuild ? bundleAnalyzer : withSentry;
