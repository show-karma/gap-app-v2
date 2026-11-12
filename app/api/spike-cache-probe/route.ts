// SPIKE ONLY (spike/cloudflare-opennext) -- never merge.
//
// Makes the `"use cache"` composable cache observable: the cached function
// returns the moment it ran, tagged with the same tag the Sanity webhook
// (`/api/blog/revalidate`) invalidates. A repeat request that returns the same
// `renderedAt` is a cache hit; after a signed webhook call it must change.
// `?throw=1` throws an unhandled error, to check that Sentry's onRequestError
// hook reports a route failure from the runtime under test.
import { cacheLife, cacheTag } from "next/cache";
import { connection, NextResponse } from "next/server";
import { blogListTag } from "@/sanity/lib/gateway";

async function cachedStamp(): Promise<{ renderedAt: string; nonce: number }> {
  "use cache";
  cacheLife("hours");
  cacheTag(blogListTag());
  return { renderedAt: new Date().toISOString(), nonce: Math.random() };
}

export async function GET(request: Request): Promise<NextResponse> {
  await connection();
  if (new URL(request.url).searchParams.get("throw") === "1") {
    throw new Error("spike sentry probe: unhandled route error");
  }
  const stamp = await cachedStamp();
  return NextResponse.json({ ...stamp, servedAt: new Date().toISOString() });
}
