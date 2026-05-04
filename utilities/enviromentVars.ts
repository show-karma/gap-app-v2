const isDev = process.env.NEXT_PUBLIC_ENV === "staging";

export const envVars = {
  isDev,
  VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  NEXT_PUBLIC_ENV: process.env.NEXT_PUBLIC_ENV,
  NEXT_PUBLIC_KARMA_API: "https://api.karmahq.xyz/api",
  NEXT_PUBLIC_GAP_INDEXER_URL: process.env.NEXT_PUBLIC_GAP_INDEXER_URL as string,
  // gap-oauth (the OAuth 2.1 / oidc-provider service) lives next to
  // gap-indexer. The consent UI and connections page call it directly;
  // gap-indexer's MCP middleware verifies tokens against its JWKS.
  NEXT_PUBLIC_GAP_OAUTH_URL: (process.env.NEXT_PUBLIC_GAP_OAUTH_URL ||
    "http://localhost:3003") as string,
  RPC: {
    MAINNET: process.env.NEXT_PUBLIC_RPC_MAINNET as string,
    OPTIMISM: process.env.NEXT_PUBLIC_RPC_OPTIMISM as string,
    ARBITRUM: process.env.NEXT_PUBLIC_RPC_ARBITRUM as string,
    BASE: process.env.NEXT_PUBLIC_RPC_BASE as string,
    CELO: process.env.NEXT_PUBLIC_RPC_CELO as string,
    POLYGON: process.env.NEXT_PUBLIC_RPC_POLYGON as string,
    OPT_SEPOLIA: process.env.NEXT_PUBLIC_RPC_OPTIMISM_SEPOLIA as string,
    BASE_SEPOLIA: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA as string,
    SEPOLIA: process.env.NEXT_PUBLIC_RPC_SEPOLIA as string,
    SEI: process.env.NEXT_PUBLIC_RPC_SEI as string,
    LISK: process.env.NEXT_PUBLIC_RPC_LISK as string,
    SCROLL: process.env.NEXT_PUBLIC_RPC_SCROLL as string,
  },
  PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  ANON_KARMA_URL: "https://anon.karmahq.xyz",
  PROFILE_ID: isDev
    ? "0x418102f570483423fc7d431e0efd1cc5d49f2b3fe4c85cb7d837bcfa83e7db03"
    : "0xf123b01fbc8e244131dd1078c8c6778a7037855139f01e65e0e424e06584edd2",
  VERCEL_URL:
    process.env.NEXT_PUBLIC_ENV === "production"
      ? `https://karmahq.xyz`
      : "https://staging.karmahq.xyz",
  OSO_API_KEY: process.env.NEXT_PUBLIC_OSO_API_KEY || "",
  PRIVY_APP_ID: process.env.NEXT_PUBLIC_PRIVY_APP_ID || "",
  ENV: process.env.NEXT_PUBLIC_ENV || "development",
  ZERODEV_PROJECT_ID: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || "",
  ALCHEMY_POLICY_ID: process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID || "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  // Karma platform-owned Telegram bot handle (without leading @).
  // Hardcoded — single bot used across all environments.
  KARMA_TELEGRAM_BOT_HANDLE: "karmahq_support_bot",
};

// Re-exported as a named constant so callers can `import { KARMA_TELEGRAM_BOT_HANDLE }`
// directly instead of aliasing `envVars.KARMA_TELEGRAM_BOT_HANDLE` at module scope
// in every consumer.
export const KARMA_TELEGRAM_BOT_HANDLE = envVars.KARMA_TELEGRAM_BOT_HANDLE;
