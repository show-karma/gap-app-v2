const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
];

const removeImports = require("next-remove-imports")();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 10000,
  turbopack: {},
  eslint: {
    dirs: ["app", "components", "utilities", "hooks", "store", "types"],
  },

  webpack: (config, { isServer, webpack }) => {
    // Fix for browserslist and other Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
        events: false,
        url: false,
        buffer: false,
        util: false,
      };
    }

    // Add external modules that should not be bundled
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // Ignore dynamic requires in browserslist
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /@react-native-async-storage\/async-storage/,
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

module.exports = withBundleAnalyzer(removeImports(nextConfig));

// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
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
    debug: true,
  },
  {
    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

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

module.exports = {
  ...module.exports,
  experimental: {
    optimizePackageImports: [
      "@dynamic-labs/sdk-react-core",
      "@tanstack/react-query",
      "@radix-ui/react-dialog",
      "@radix-ui/react-popover",
      "@heroicons/react",
      "@show-karma/karma-gap-sdk",
    ],
  },
};
