import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as Sentry from "@sentry/nextjs";
import { SITE_URL } from "@/utilities/meta";

/** Public path of the purple card background shared by the project and community OG images. */
export const OG_BACKGROUND_PATH = "/assets/previews/background.jpg";

interface AssetsBinding {
  fetch(input: RequestInfo | URL): Promise<Response>;
}

interface CloudflareContext {
  env?: { ASSETS?: AssetsBinding };
}

const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for("__cloudflare-context__");

let backgroundImage: Promise<string> | undefined;

function getCloudflareAssetsBinding(): AssetsBinding | undefined {
  const context = (globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL] as
    | CloudflareContext
    | undefined;
  return context?.env?.ASSETS;
}

async function loadBackgroundBytes(): Promise<Buffer> {
  const assets = getCloudflareAssetsBinding();
  if (assets) {
    const response = await assets.fetch(new Request(`https://assets.local${OG_BACKGROUND_PATH}`));
    if (!response.ok) {
      throw new Error(`ASSETS fetch for ${OG_BACKGROUND_PATH} returned HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  // Keep a single string literal so Next.js output file tracing bundles the
  // asset on Node/Vercel deployments.
  return readFile(join(process.cwd(), "public/assets/previews/background.jpg"));
}

/**
 * CSS `background-image` value for the OG card background, read once per
 * server instance from Cloudflare's `ASSETS` binding (when running on Workers)
 * or from the deployment's filesystem (Node/Vercel) and inlined as a data URI,
 * so an OG render does not fetch it over the public CDN.
 *
 * If loading fails, it falls back to the CDN URL and reports to Sentry so the
 * OG card still renders instead of failing the route.
 */
export function getOgBackgroundImage(): Promise<string> {
  backgroundImage ??= loadBackgroundBytes()
    .then((data) => `url(data:image/jpeg;base64,${data.toString("base64")})`)
    .catch((error: unknown) => {
      Sentry.captureException(error, { tags: { route: "api/metadata", asset: "og-background" } });
      return `url(${SITE_URL}${OG_BACKGROUND_PATH})`;
    });
  return backgroundImage;
}

/** Test-only: forget the cached value so the next call reads the file again. */
export function resetOgBackgroundImageForTests(): void {
  backgroundImage = undefined;
}
