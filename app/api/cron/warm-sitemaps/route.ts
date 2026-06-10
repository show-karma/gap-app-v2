import { NextResponse } from "next/server";
import { SITE_URL } from "@/utilities/meta";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel cron (see vercel.json) that keeps every sitemap warm: it GETs the
// index, extracts the child URLs, and GETs each one. The public routes then
// refresh their own Data Cache entries (stale-while-revalidate), so crawler
// traffic is never what triggers a refresh and Googlebot only ever sees warm,
// fast responses — including right after a deploy, when the CDN cache is cold
// but the Data Cache (which persists across deployments) is not.
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const warmed: Record<string, number> = {};

  const indexUrl = `${SITE_URL}/sitemap_index.xml`;
  const indexRes = await fetch(indexUrl, { cache: "no-store" });
  warmed[indexUrl] = indexRes.status;
  if (!indexRes.ok) {
    return NextResponse.json({ ok: false, warmed }, { status: 502 });
  }

  const body = await indexRes.text();
  const children = Array.from(body.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]);

  // Sequential on purpose: a burst would contend with the indexer's public
  // rate limit for no benefit — the cron has a minute and ~7 children.
  for (const child of children) {
    try {
      const res = await fetch(child, { cache: "no-store" });
      warmed[child] = res.status;
    } catch {
      warmed[child] = 0;
    }
  }

  const failures = Object.values(warmed).filter((status) => status !== 200).length;
  return NextResponse.json({ ok: failures === 0, warmed }, { status: failures === 0 ? 200 : 502 });
}
