/**
 * Which deployment this code is running in, without naming a hosting platform.
 *
 * Every "is this production / a preview?" decision in the app goes through
 * here, so moving off Vercel means setting two variables rather than editing
 * every call site:
 *
 *   APP_ENV              server and build time
 *   NEXT_PUBLIC_APP_ENV  inlined into every bundle, so the browser sees it too
 *
 * Vercel's own `VERCEL_ENV` / `NEXT_PUBLIC_VERCEL_ENV` remain the fallback, so
 * a Vercel deployment that sets neither neutral variable behaves exactly as it
 * did when the call sites read Vercel's variables directly.
 *
 * This module must import nothing: next.config.ts loads it (through
 * utilities/token-bridge/origins.ts) before the path-alias resolver exists, and
 * it also runs in proxy.ts and in client bundles.
 */

export const DEPLOYMENT_ENVS = ["production", "preview", "development"] as const;

export type DeploymentEnv = (typeof DEPLOYMENT_ENVS)[number];

/** The variables a deployment environment can be read from, in precedence order. */
export interface DeploymentEnvSources {
  NEXT_PUBLIC_APP_ENV?: string;
  APP_ENV?: string;
  NEXT_PUBLIC_VERCEL_ENV?: string;
  VERCEL_ENV?: string;
}

/**
 * Precedence: the neutral variables before Vercel's, and within each pair the
 * NEXT_PUBLIC_ one first — it is the only one the browser can see, so
 * preferring it keeps the server and the client agreeing on the answer.
 */
const PRECEDENCE: readonly (keyof DeploymentEnvSources)[] = [
  "NEXT_PUBLIC_APP_ENV",
  "APP_ENV",
  "NEXT_PUBLIC_VERCEL_ENV",
  "VERCEL_ENV",
];

function isDeploymentEnv(value: string): value is DeploymentEnv {
  return (DEPLOYMENT_ENVS as readonly string[]).includes(value);
}

/**
 * The deployment environment the given variables describe.
 *
 * The first NON-EMPTY variable in precedence order decides. If it holds
 * anything other than an exact, known value, the answer is `undefined` — it
 * does NOT fall through to a lower-precedence variable. A typo in the neutral
 * variable therefore reads as "unknown" (which every caller treats as the
 * restrictive case) instead of silently borrowing whatever the platform says.
 */
export function resolveDeploymentEnv(sources: DeploymentEnvSources): DeploymentEnv | undefined {
  for (const key of PRECEDENCE) {
    const value = sources[key];
    if (value === undefined || value === "") continue;
    return isDeploymentEnv(value) ? value : undefined;
  }
  return undefined;
}

/**
 * Reads the variables at call time, so tests and build-time evaluation see the
 * same value the request path does.
 *
 * Each read is a literal `process.env.NAME` on purpose: Next only inlines
 * NEXT_PUBLIC_* variables into the client bundle when the access is written out
 * in full. In the browser the two server-only reads are always undefined.
 */
export function readDeploymentEnvSources(): DeploymentEnvSources {
  return {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
}

/** The current deployment environment, or `undefined` when nothing says. */
export function deploymentEnv(): DeploymentEnv | undefined {
  return resolveDeploymentEnv(readDeploymentEnvSources());
}

/** Exactly "production". Unknown is not production. */
export function isProductionDeployment(): boolean {
  return deploymentEnv() === "production";
}

/** Exactly "preview". Unknown is not a preview. */
export function isPreviewDeployment(): boolean {
  return deploymentEnv() === "preview";
}

/**
 * Whether this build or server process is running on Vercel. Vercel sets
 * `VERCEL` in its build containers, its functions and in `vercel build`.
 *
 * Server and build time only — the variable never reaches the browser. Client
 * code that needs the answer reads {@link vercelAnalyticsEnabled}, which
 * next.config.ts stamps into the bundle from this.
 */
export function isVercelPlatform(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Whether to mount Vercel Web Analytics and Speed Insights. Their scripts are
 * served from Vercel's edge (`/_vercel/...`), so on any other platform they
 * would only 404. Inlined at build time by next.config.ts via
 * {@link deploymentBuildEnv}.
 */
export function vercelAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === "true";
}

/**
 * The origin of this specific deployment when the platform publishes one
 * (Vercel's `VERCEL_URL`, a bare hostname), or `undefined` elsewhere. Server
 * side only.
 */
export function platformDeploymentOrigin(): string | undefined {
  const host = process.env.VERCEL_URL?.trim();
  if (!host) return undefined;
  return /^https?:\/\//i.test(host) ? host.replace(/\/+$/, "") : `https://${host}`;
}

/**
 * Public variables next.config.ts derives at build time, so the browser gets
 * an answer even when only the server-side variable was configured.
 *
 * - `NEXT_PUBLIC_APP_ENV` is copied from `APP_ENV` only when it was not set
 *   itself. On Vercel neither is set, so nothing is added and the bundle reads
 *   `NEXT_PUBLIC_VERCEL_ENV` exactly as before.
 * - `NEXT_PUBLIC_VERCEL_ANALYTICS` keeps an explicit "true"/"false" and
 *   otherwise follows {@link isVercelPlatform}.
 */
export function deploymentBuildEnv(): Record<string, string> {
  const vars: Record<string, string> = {};
  const appEnv = process.env.APP_ENV;
  if (appEnv && !process.env.NEXT_PUBLIC_APP_ENV) {
    vars.NEXT_PUBLIC_APP_ENV = appEnv;
  }
  const analytics = process.env.NEXT_PUBLIC_VERCEL_ANALYTICS;
  vars.NEXT_PUBLIC_VERCEL_ANALYTICS =
    analytics === "true" || analytics === "false" ? analytics : String(isVercelPlatform());
  return vars;
}
