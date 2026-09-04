import { createHash, timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notebookOverviewTag } from "@/services/notebook-overview.service";
import { notebookMetricTag } from "@/services/notebooks/notebook-metric-registry.query";
import { NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { getServerEnv } from "@/utilities/env";

/**
 * On-demand revalidation for notebook pages (FR3).
 *
 * gap-indexer calls this when it ingests new grants or milestones, so a page
 * reflects the change immediately instead of waiting out the hourly window.
 * The window remains the self-healing fallback if this route is ever
 * unreachable or misconfigured — the same relationship `/api/blog/revalidate`
 * has with its ISR ceiling.
 *
 * SECURITY. This endpoint must reject unauthenticated calls. Left open it is a
 * free cache-buster: anyone could evict every community's cached payload in a
 * loop and turn each subsequent page view into an upstream API call, which is
 * a cheap amplified DoS against gapapi using our own servers. So:
 *
 *   - no secret configured means every call is refused, rather than
 *     accidentally running open in an environment where the variable was never
 *     set;
 *   - the token is compared in constant time, so the comparison cannot be used
 *     to recover it byte by byte;
 *   - only communities with notebooks enabled can be targeted, which keeps a
 *     leaked token from being used to churn arbitrary cache tags.
 */

export const dynamic = "force-dynamic";

const RevalidateBodySchema = z.object({
  /** Community slug whose notebook data changed. */
  communityId: z.string().trim().min(1).max(128),
});

/**
 * Constant-time token comparison.
 *
 * Compares SHA-256 digests rather than the raw strings: `timingSafeEqual`
 * throws on a length mismatch, and branching on length would itself leak the
 * secret's length. Digests are always 32 bytes, so every comparison takes the
 * same path regardless of what was presented.
 */
function tokensMatch(presented: string, expected: string): boolean {
  const digest = (value: string) => new Uint8Array(createHash("sha256").update(value).digest());
  return timingSafeEqual(digest(presented), digest(expected));
}

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, ...rest] = header.split(" ");
  if (scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token.length > 0 ? token : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { NOTEBOOKS_REVALIDATE_SECRET } = getServerEnv();

  // Fail closed. An unset secret can never authenticate anything, so refuse
  // rather than fall through to a comparison against an empty string.
  if (!NOTEBOOKS_REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: "Revalidation not configured" }, { status: 401 });
  }

  const presented = bearerToken(request);
  if (!presented || !tokensMatch(presented, NOTEBOOKS_REVALIDATE_SECRET)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Caller-controlled input: a bad body is a 400, never conflated with a
  // revalidation failure below.
  let communityId: string;
  try {
    const parsed = RevalidateBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
    }
    communityId = parsed.data.communityId;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  // A valid token still cannot churn arbitrary tags: only communities that
  // actually have notebook pages are addressable.
  if (!NOTEBOOKS_ENABLED_COMMUNITIES.includes(communityId)) {
    return NextResponse.json({ ok: false, error: "Unknown community" }, { status: 404 });
  }

  // Revalidation is server-side work: a throw here is a genuine server fault
  // and must surface as 5xx rather than masquerading as a bad request.
  try {
    const tags = [notebookOverviewTag(communityId), notebookMetricTag(communityId)];
    // "max" is the profile Next 16 expects from a route handler; `updateTag`
    // is Server-Action-only and throws here.
    for (const tag of tags) revalidateTag(tag, "max");
    return NextResponse.json({ ok: true, revalidated: tags }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "/api/notebooks/revalidate" } });
    return NextResponse.json({ ok: false, error: "Revalidation failed" }, { status: 500 });
  }
}
