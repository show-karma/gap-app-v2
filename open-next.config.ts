// Cloudflare Workers build config for @opennextjs/cloudflare.
//
// SPIKE (feasibility test, branch spike/cloudflare-opennext). Nothing here is
// deployed: it only drives `opennextjs-cloudflare build` and the local
// `wrangler dev` / miniflare simulation. See
// docs/cloudflare-opennext-feasibility.md for the findings.
//
// Cache layout, per https://opennext.js.org/cloudflare/caching:
// - incremental cache (ISR pages, route handlers and the `"use cache"`
//   composable cache): R2, fronted by the regional Cache API so a hot entry is
//   not an R2 read on every request.
// - tag cache: the sharded Durable Object, in "next mode" (stores per-tag
//   revalidation timestamps, which is what Next 16's revalidateTag(tag,
//   profile) and cacheTag() need). Chosen over D1 for write throughput and
//   latency; D1 is the low-traffic option.
// - revalidation queue: Durable Object, so stale-while-revalidate refreshes
//   are deduplicated instead of firing one background render per request.
// - cache interception stays off: it is incompatible with partial
//   prerendering, which `cacheComponents` turns on for every route.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  tagCache: doShardedTagCache({ baseShardSize: 12, regionalCache: true }),
  queue: doQueue,
  enableCacheInterception: false,
});
