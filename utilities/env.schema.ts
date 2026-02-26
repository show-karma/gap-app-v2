import { z } from "zod";

// --- Helpers ---

const booleanEnvVar = z
  .string()
  .transform((v) => v === "true")
  .optional()
  .default("false");

// --- Client env schema (NEXT_PUBLIC_* vars, inlined at build time) ---

export const clientSchema = z.object({
  NEXT_PUBLIC_ENV: z.enum(["production", "staging", "development", "dev"]),
  NEXT_PUBLIC_GAP_INDEXER_URL: z.string().url(),
  NEXT_PUBLIC_PRIVY_APP_ID: z.string().min(1),

  NEXT_PUBLIC_VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),

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
});

// --- Server env schema (only available server-side) ---

export const serverSchema = z.object({
  SENTRY_AUTH_TOKEN: z.string().min(1).optional(),
  ANALYZE: booleanEnvVar,
  VERCEL_URL: z.string().min(1).optional(),
});

// --- Validation ---

/** Convert empty strings to undefined so optional fields aren't rejected by enum/url validators */
function stripEmptyStrings(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === "" ? undefined : v]));
}

export function validateEnv<T extends z.ZodTypeAny>(
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
