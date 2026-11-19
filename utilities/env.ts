import {
  type ClientEnv,
  clientSchema,
  type ServerEnv,
  serverSchema,
  validateEnv,
} from "./env.schema";

export { clientSchema, serverSchema, validateEnv };
export type { ClientEnv, ServerEnv };

/**
 * Every client variable, each read as a literal `process.env.NEXT_PUBLIC_*`
 * member so Next inlines its build-time value into every bundle, server ones
 * included.
 *
 * Passing `process.env` itself would read the runtime environment instead.
 * Vercel's runtime happens to hold the NEXT_PUBLIC_* values, but a Cloudflare
 * Worker's only holds its `vars` and secrets, so validation threw at module
 * load and took instrumentation.ts and every server module importing
 * `clientEnv` down with it. The `keyof ClientEnv` record makes a key added to
 * the schema but missing here a type error.
 */
export const clientEnvSource: Record<keyof ClientEnv, string | undefined> = {
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_GAP_INDEXER_URL: process.env.NEXT_PUBLIC_GAP_INDEXER_URL,
  NEXT_PUBLIC_PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  NEXT_PUBLIC_VERCEL_ANALYTICS: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS,
  NEXT_PUBLIC_RPC_MAINNET: process.env.NEXT_PUBLIC_RPC_MAINNET,
  NEXT_PUBLIC_RPC_OPTIMISM: process.env.NEXT_PUBLIC_RPC_OPTIMISM,
  NEXT_PUBLIC_RPC_ARBITRUM: process.env.NEXT_PUBLIC_RPC_ARBITRUM,
  NEXT_PUBLIC_RPC_BASE: process.env.NEXT_PUBLIC_RPC_BASE,
  NEXT_PUBLIC_RPC_CELO: process.env.NEXT_PUBLIC_RPC_CELO,
  NEXT_PUBLIC_RPC_POLYGON: process.env.NEXT_PUBLIC_RPC_POLYGON,
  NEXT_PUBLIC_RPC_SEI: process.env.NEXT_PUBLIC_RPC_SEI,
  NEXT_PUBLIC_RPC_LISK: process.env.NEXT_PUBLIC_RPC_LISK,
  NEXT_PUBLIC_RPC_SCROLL: process.env.NEXT_PUBLIC_RPC_SCROLL,
  NEXT_PUBLIC_RPC_SEPOLIA: process.env.NEXT_PUBLIC_RPC_SEPOLIA,
  NEXT_PUBLIC_RPC_OPTIMISM_SEPOLIA: process.env.NEXT_PUBLIC_RPC_OPTIMISM_SEPOLIA,
  NEXT_PUBLIC_RPC_BASE_SEPOLIA: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA,
  NEXT_PUBLIC_MIXPANEL_KEY: process.env.NEXT_PUBLIC_MIXPANEL_KEY,
  NEXT_PUBLIC_GA_TRACKING_ID: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_AMPLITUDE_KEY: process.env.NEXT_PUBLIC_AMPLITUDE_KEY,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  NEXT_PUBLIC_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID,
  NEXT_PUBLIC_OSO_API_KEY: process.env.NEXT_PUBLIC_OSO_API_KEY,
  NEXT_PUBLIC_ALCHEMY_KEY: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
  NEXT_PUBLIC_ALCHEMY_POLICY_ID: process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID,
  NEXT_PUBLIC_ZERODEV_PROJECT_ID: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID,
  NEXT_PUBLIC_IPFS_TOKEN: process.env.NEXT_PUBLIC_IPFS_TOKEN,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_E2E_AUTH_BYPASS: process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS,
  NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
  NEXT_PUBLIC_SANITY_API_VERSION: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
};

/**
 * Validated and typed client environment variables.
 * Safe to use in both server and client code.
 */
export const clientEnv = validateEnv(clientSchema, clientEnvSource, "client");

let _serverEnv: ServerEnv | null = null;

/**
 * Validated and typed server-only environment variables.
 * Only use in server-side code (API routes, next.config, instrumentation).
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must not be called on the client");
  }
  if (!_serverEnv) {
    _serverEnv = validateEnv(serverSchema, process.env, "server");
  }
  return _serverEnv;
}
