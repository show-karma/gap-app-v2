import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Per-fetch cap so one hung upstream fails fast and is reported instead of
// silently eating the whole maxDuration budget.
const FETCH_TIMEOUT_MS = 15_000;

// Vercel cron (see vercel.json) that keeps every sitemap warm: it GETs the
// index, extracts the child URLs, and GETs each one. The public routes then
// refresh their own Data Cache entries (stale-while-revalidate), so crawler
// traffic is never what triggers a refresh and Googlebot only ever sees warm,
// fast responses — including right after a deploy, when the CDN cache is cold
// but the Data Cache (which persists across deployments) is not.
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const warmed: Record<string, number> = {};

  const indexUrl = `${SITE_URL}/sitemap_index.xml`;
  let children: string[];
  try {
    const indexRes = await fetch(indexUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    warmed[indexUrl] = indexRes.status;
    if (!indexRes.ok) {
      return NextResponse.json({ ok: false, warmed }, { status: 502 });
    }
    const body = await indexRes.text();
    children = Array.from(body.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);
    // A valid index from this app always lists children (static, communities,
    // and one per kind), so a 200 that parses to zero <loc> entries means the
    // warmer read the wrong payload — treat it as a failure and report it
    // rather than returning ok=true after warming nothing.
    if (children.length === 0) {
      Sentry.captureException(new Error("warm-sitemaps index parsed to zero child <loc> entries"), {
        tags: { route: "/api/cron/warm-sitemaps" },
        extra: { indexUrl },
      });
      return NextResponse.json({ ok: false, warmed }, { status: 502 });
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { route: "/api/cron/warm-sitemaps" } });
    warmed[indexUrl] = 0;
    return NextResponse.json({ ok: false, warmed }, { status: 502 });
  }

  // Sequential on purpose: a burst would contend with the indexer's public
  // rate limit for no benefit — the cron has a minute and ~7 children.
  for (const child of children) {
    try {
      const res = await fetch(child, {
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      warmed[child] = res.status;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { route: "/api/cron/warm-sitemaps" },
        extra: { child },
      });
      warmed[child] = 0;
    }
  }

  const failures = Object.values(warmed).filter((status) => status !== 200).length;
  return NextResponse.json({ ok: failures === 0, warmed }, { status: failures === 0 ? 200 : 502 });
}
