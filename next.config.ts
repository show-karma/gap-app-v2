/**
 * Next.js Configuration
 *
 * Bun Compatibility Notes:
 * - This config works with both Node.js (Vercel deployment) and Bun (local development)
 * - ESM imports are used where packages support them
 * - Some packages (next-remove-imports, @next/bundle-analyzer) only support CommonJS exports
 * - Webpack fallbacks are still needed for client-side bundling regardless of runtime
 * - Bun handles Node.js built-ins natively on the server, but webpack still bundles for browser
 *
 * Package Import Notes:
 * - @next/bundle-analyzer: Uses `export =` syntax, requires CommonJS import
 * - next-remove-imports: Only exports CommonJS
 * - @sentry/nextjs: Supports ESM, uses named exports
 */

import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

/**
 * @next/bundle-analyzer uses `export =` syntax which requires CommonJS import.
 * This is compatible with both Node.js and Bun runtimes.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bundleAnalyzer = require("@next/bundle-analyzer");
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/**
 * next-remove-imports only exports CommonJS, so we need to use require()
 * This is compatible with both Node.js and Bun runtimes
 * See: https://github.com/vercel/next.js/discussions/27825
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const removeImports = require("next-remove-imports")();

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "Content-Security-Policy",
    value:
      "frame-src 'self' https://auth.privy.io https://*.privy.io https://paragraph.com https://*.paragraph.com; frame-ancestors 'self';",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 10000,
  turbopack: {},
  eslint: {
    dirs: ["app", "components", "utilities", "hooks", "store", "types"],
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer, webpack }) => {
    /**
     * Client-side Node.js polyfill fallbacks
     *
     * These fallbacks are required for webpack bundling regardless of the runtime (Node.js or Bun).
     * They tell webpack to exclude Node.js built-in modules from the client bundle since they
     * are not available in the browser environment.
     *
     * Note: While Bun provides native implementations of these modules on the server,
     * webpack still needs these fallbacks for client-side bundling.
     */
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        // File system modules - not available in browser
        fs: false,
        path: false,
        os: false,
        // Network modules - not available in browser
        net: false,
        tls: false,
        http: false,
        https: false,
        // Crypto and encoding - browser has native alternatives (Web Crypto API)
        crypto: false,
        buffer: false,
        // Stream and utility modules
        stream: false,
        zlib: false,
        util: false,
        events: false,
        // URL handling - browser has native URL API
        url: false,
        querystring: false,
      };
    }

    // External modules that should not be bundled (server-only dependencies)
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // Reduce bundle size by excluding moment.js locales
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );

    // Exclude Storybook story files from production build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.stories\.(tsx?|jsx?)$/,
      })
    );

    return config;
  },
  transpilePackages: ["@show-karma/karma-gap-sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Apply configuration wrappers in order: removeImports -> bundleAnalyzer -> Sentry
const configWithPlugins = withBundleAnalyzer(removeImports(nextConfig));

/**
 * Sentry Configuration
 * Provides error tracking and performance monitoring
 *
 * Note: Sentry SDK v9+ uses a single SentryBuildOptions object instead of separate arguments.
 * See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */
const finalConfig = withSentryConfig(configWithPlugins, {
  // Organization and project settings
  org: "karma-crypto-inc",
  project: "gap-frontend",

  // Authentication for source map uploads
  // Can also be set via SENTRY_AUTH_TOKEN environment variable
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppresses SDK build logs
  silent: true,

  // Prints additional debug information during build
  debug: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",

  // Automatically annotate React components with Sentry-specific data attributes
  reactComponentAnnotation: {
    enabled: true,
  },

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Hides source maps from generated client bundles
  sourcemaps: {
    disable: true,
  },

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors
  // See: https://docs.sentry.io/product/crons/
  automaticVercelMonitors: true,
});

export default finalConfig;
