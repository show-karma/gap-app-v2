import { isIP } from "node:net";
import { isVercelPlatform } from "./deployment-env";

function validIp(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && isIP(trimmed) !== 0 ? trimmed : null;
}

function rightmostForwardedIp(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const entries = headerValue.split(",");
  return validIp(entries[entries.length - 1]);
}

/**
 * Extracts the trusted client IP address from request headers according to the
 * hosting platform's guarantees:
 *
 * - Cloudflare Workers (non-Vercel): `cf-connecting-ip` is set by the edge
 *   and cannot be spoofed by the caller, whereas `x-real-ip` is forwarded from
 *   the client untouched and MUST NOT be trusted.
 * - Vercel (`process.env.VERCEL` set): `x-real-ip` is set by the edge and
 *   cannot be spoofed, whereas `cf-connecting-ip` is not stripped and MUST NOT
 *   be trusted.
 * - Fallback: `x-forwarded-for` can have entries prepended by the caller, so
 *   only the rightmost entry (appended by the closest trusted proxy) is read.
 *
 * Every candidate is trimmed and validated with `node:net` `isIP`.
 */
export function extractTrustedClientIp(headers: {
  get(name: string): string | null;
}): string | null {
  const platformHeader = isVercelPlatform() ? "x-real-ip" : "cf-connecting-ip";
  return (
    validIp(headers.get(platformHeader)) ?? rightmostForwardedIp(headers.get("x-forwarded-for"))
  );
}
