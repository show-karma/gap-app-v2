import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import * as Sentry from "@sentry/nextjs";
import { SITE_URL } from "@/utilities/meta";

/** Public path of the purple card background shared by the project and community OG images. */
export const OG_BACKGROUND_PATH = "/assets/previews/background.jpg";

let backgroundImage: Promise<string> | undefined;

/**
 * CSS `background-image` value for the OG card background, read once per
 * server instance from the deployment's own filesystem and inlined as a data
 * URI, so an OG render no longer downloads it from the CDN (Fast Data
 * Transfer). This is the "Node.js runtime with local assets" pattern from the
 * `next/og` docs; the routes that use it run on the Node.js runtime.
 *
 * The path stays a single string literal so output file tracing can see it
 * and ship the file with the function. If the read still fails, the image
 * falls back to the CDN URL and the failure goes to Sentry, so the card keeps
 * rendering instead of the route failing.
 */
export function getOgBackgroundImage(): Promise<string> {
  backgroundImage ??= readFile(join(process.cwd(), "public/assets/previews/background.jpg"))
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
