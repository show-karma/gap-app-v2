import { z } from "zod";
import { DEPLOYMENT_ENVS } from "./deployment-env";

// --- Helpers ---

const booleanEnvVar = z
  .string()
  .transform((v) => v === "true")
  .optional()
  .default(false);

/** production | preview | development — see utilities/deployment-env.ts. */
const deploymentEnvVar = z.enum(DEPLOYMENT_ENVS).optional();

// --- Client env schema (NEXT_PUBLIC_* vars, inlined at build time) ---

/** Zod schema for validating NEXT_PUBLIC_* client-side environment variables. */
export const clientSchema = z.object({
  NEXT_PUBLIC_ENV: z.enum(["production", "staging", "development", "dev"]).default("development"),
  NEXT_PUBLIC_GAP_INDEXER_URL: z.string().url(),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1),

  // Deployment environment. The neutral variable wins; Vercel's is the
  // fallback for deployments that do not set it. See utilities/deployment-env.ts.
  NEXT_PUBLIC_APP_ENV: deploymentEnvVar,
  NEXT_PUBLIC_VERCEL_ENV: deploymentEnvVar,
  // Stamped by next.config.ts at build time ("true" on Vercel). Gates the
  // Vercel Web Analytics and Speed Insights scripts; anything but "true" is
  // off, so a malformed value is not worth failing startup over.
  NEXT_PUBLIC_VERCEL_ANALYTICS: z.string().optional(),

  // RPC URLs
  NEXT_PUBLIC_RPC_MAINNET: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_OPTIMISM: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_ARBITRUM: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_BASE: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_CELO: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_POLYGON: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_SEI: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_LISK: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_SCROLL: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_SEPOLIA: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_OPTIMISM_SEPOLIA: z.string().min(1).optional(),
  NEXT_PUBLIC_RPC_BASE_SEPOLIA: z.string().min(1).optional(),

  // Analytics & monitoring
  NEXT_PUBLIC_MIXPANEL_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_GA_TRACKING_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_AMPLITUDE_KEY: z.string().min(1).optional(),
  // Injected by next.config.ts from the package version at build time, so it is
  // absent in tests and in any runtime that bypasses the Next build.
  NEXT_PUBLIC_APP_VERSION: z.string().min(1).optional(),

  // Third-party integrations
  NEXT_PUBLIC_PROJECT_ID: z.string().optional().default(""),
  NEXT_PUBLIC_OSO_API_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_ALCHEMY_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_ALCHEMY_POLICY_ID: z.string().optional().default(""),
  NEXT_PUBLIC_ZERODEV_PROJECT_ID: z.string().optional().default(""),
  NEXT_PUBLIC_IPFS_TOKEN: z.string().min(1).optional(),

  // Payments
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional().default(""),

  // Testing
  NEXT_PUBLIC_E2E_AUTH_BYPASS: booleanEnvVar,

  // Sanity Blog CMS
  NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().optional().default(""),
  NEXT_PUBLIC_SANITY_DATASET: z.string().optional().default("production"),
  NEXT_PUBLIC_SANITY_API_VERSION: z.string().optional().default("2024-01-01"),
});

// --- Server env schema (only available server-side) ---

/** Zod schema for validating server-only environment variables. */
export const serverSchema = z.object({
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  ANALYZE: booleanEnvVar,
  // Server-side deployment environment; same precedence as the client pair.
  APP_ENV: deploymentEnvVar,
  VERCEL_ENV: deploymentEnvVar,
  // Vercel's per-deployment hostname. Optional fallback for the app's own
  // origin; other platforms leave it unset. See platformDeploymentOrigin().
  VERCEL_URL: z.string().min(1).optional(),

  // Sanity Blog CMS — server-only secrets
  SANITY_VIEWER_TOKEN: z.string().optional().default(""),
  SANITY_WEBHOOK_SECRET: z.string().optional().default(""),
  SANITY_PREVIEW_SECRET: z.string().optional().default(""),

  // Shared with gap-indexer (same name there): verifies its project-changed
  // notices on /api/cache/projects/revalidate. Unset: every notice is refused
  // and project pages refresh on their cache lifetime alone.
  PROJECT_CACHE_REVALIDATION_SECRET: z.string().optional().default(""),
});

// --- Validation ---

/** Convert empty strings to undefined so optional fields aren't rejected by enum/url validators */
function stripEmptyStrings(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === "" ? undefined : v]));
}

/**
 * Validates environment variables against a Zod schema.
 * @param schema - Zod schema to validate against.
 * @param data - Raw environment variables object.
 * @param label - Human-readable label used in error messages (e.g. "client").
 * @returns Parsed and validated environment variables.
 * @throws {Error} If validation fails, listing each invalid variable.
 */
export function validateEnv<T extends z.ZodType>(
  schema: T,
  data: Record<string, unknown>,
  label: string
): z.infer<T> {
  const result = schema.safeParse(stripEmptyStrings(data));
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const formatted = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs as string[]).join(", ")}`)
      .join("\n");

    throw new Error(`\n❌ Invalid ${label} environment variables:\n${formatted}\n`);
  }
  return result.data;
}

export type ClientEnv = z.infer<typeof clientSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;
