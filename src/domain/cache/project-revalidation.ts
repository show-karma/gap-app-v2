import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Contract for the project-changed notices gap-indexer sends to
 * `app/api/cache/projects/revalidate` (gap-indexer:
 * `app/modules/v2/external/frontend-cache/frontend-project-cache.invalidator.ts`).
 * Kept free of Next imports so it can be tested on its own.
 */

/** `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`. */
export const PROJECT_CACHE_SIGNATURE_HEADER = "x-karma-signature";

/** A notice older or newer than this is rejected, so a captured one cannot be replayed. */
export const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

/** The indexer sends at most this many projects per request. */
export const MAX_PROJECTS_PER_NOTICE = 100;

/** Comfortably above 100 uids of 66 characters plus the JSON around them. */
export const MAX_NOTICE_BYTES = 16 * 1024;

const PROJECT_UID = /^0x[0-9a-fA-F]{64}$/;

export const projectRevalidationNoticeSchema = z.object({
  projects: z
    .array(z.object({ uid: z.string().regex(PROJECT_UID, "not a project uid") }))
    .min(1)
    .max(MAX_PROJECTS_PER_NOTICE),
});

export type ProjectRevalidationNotice = z.infer<typeof projectRevalidationNoticeSchema>;

function parseSignatureHeader(header: string): { timestamp: number; digest: string } | null {
  const parts = new Map(
    header.split(",").map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index).trim(), part.slice(index + 1).trim()] as const;
    })
  );
  const timestamp = Number(parts.get("t"));
  const digest = parts.get("v1");
  if (!Number.isInteger(timestamp) || !digest || !/^[0-9a-f]{64}$/.test(digest)) return null;
  return { timestamp, digest };
}

/**
 * True when `header` is a valid signature of `rawBody` under `secret`, made
 * within the tolerance window around `nowSeconds`. Compares in constant time.
 */
export function isValidProjectRevalidationSignature({
  secret,
  header,
  rawBody,
  nowSeconds,
}: {
  secret: string;
  header: string | null;
  rawBody: string;
  nowSeconds: number;
}): boolean {
  if (!secret || !header) return false;
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;
  if (Math.abs(nowSeconds - parsed.timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = new Uint8Array(
    createHmac("sha256", secret).update(`${parsed.timestamp}.${rawBody}`).digest()
  );
  const received = new Uint8Array(Buffer.from(parsed.digest, "hex"));
  return received.length === expected.length && timingSafeEqual(received, expected);
}
