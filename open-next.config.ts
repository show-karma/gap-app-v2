// Cloudflare Workers build config for @opennextjs/cloudflare.
//
// Drives `opennextjs-cloudflare build` for the Worker in wrangler.jsonc and the
// local `wrangler dev` / miniflare simulation. See
// docs/cloudflare-opennext-feasibility.md for the findings.
//
// Cache layout, per https://opennext.js.org/cloudflare/caching:
// - incremental cache (ISR pages, route handlers and the `"use cache"`
//   composable cache): R2, fronted by the regional Cache API so a hot entry is
//   not an R2 read on every request. A fallback shell R2 does not have is
//   read from the build's copy in the static assets, because Next cannot
//   render one at request time (cloudflare/shell-fallback-cache.ts).
// - tag cache: the sharded Durable Object, in "next mode" (stores per-tag
//   revalidation timestamps, which is what Next 16's revalidateTag(tag,
//   profile) and cacheTag() need). Chosen over D1 for write throughput and
//   latency; D1 is the low-traffic option.
// - revalidation queue: Durable Object, so stale-while-revalidate refreshes
//   are deduplicated instead of firing one background render per request.
// - cache interception is on: a page the cache holds in full is answered by
//   the routing layer, before the Next server is loaded or rendered. That
//   saves the server's load in a new isolate (1.6–3.9 s of CPU) and its render
//   in a warm one. A partially prerendered page (an entry with postponed
//   state) still goes to the server, which resumes it: served alone, its shell
//   would never get the parts rendered per request. That check is a patch
//   (patches/@opennextjs__aws@4.1.15.patch); unpatched, interception is
//   incompatible with `cacheComponents`.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";
import { withShellFallback } from "./cloudflare/shell-fallback-cache";

export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(
    withShellFallback(r2IncrementalCache, staticAssetsIncrementalCache),
    { mode: "long-lived" }
  ),
  tagCache: doShardedTagCache({ baseShardSize: 12, regionalCache: true }),
  queue: doQueue,
  enableCacheInterception: true,
});
