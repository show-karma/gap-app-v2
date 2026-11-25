// Worker entry for the Cloudflare Workers build: the public, routing Worker.
//
// The app runs as two Workers. This one answers every request: it runs the
// routing layer OpenNext generates (proxy.ts, rewrites, pages served whole from
// the cache) and passes the rest to the Next server Worker over a service
// binding (cloudflare/front-handler.ts, cloudflare/next-server.ts). Keeping the
// 57 MiB Next server out of this script is what lets a new isolate start fast.
// It also holds the Durable Objects both Workers use.
//
// It adds what the generated worker lacks:
//
// - A `scheduled` handler. It replaces the Vercel cron in vercel.json
//   (`/api/cron/warm-sitemaps`, every six hours) with a Cron Trigger declared in
//   wrangler.jsonc. The trigger calls the route through the worker's own fetch
//   handler, with the same bearer token Vercel sends, and the route emits
//   Sentry Cron Monitor check-ins via `Sentry.withMonitor`.
// - The Sanity Studio. On this build it is a static `sanity build` in the
//   assets (`pnpm cf:build:studio`), not a Next.js route, so it stays out of
//   the Worker bundle. wrangler.jsonc runs this worker first for its paths so
//   deep links fall back to the Studio's index.html and every response gets the
//   headers the Next.js route had: no framing by other sites, never indexed.
//   proxy.ts never sees these requests, so the one rule of it the Studio needs,
//   the 308 from an alias host to the canonical one, is applied here too.
// - A shared cache for the social preview (OG) images and for the images
//   `next/image` optimizes, which on Vercel the CDN keeps and here nothing does
//   (cloudflare/og-image-cache.ts, cloudflare/next-image-cache.ts).
// - The background step that gives each project or community page its own
//   cache entry after its first visit, which Vercel does and Next leaves to
//   the platform (cloudflare/shell-upgrade.ts).
// - `X-Robots-Tag: noindex, nofollow` on every response served on *.workers.dev
//   or when `APP_ENV === "preview"` (staging, PR previews and the production
//   Worker before its cutover) so search engines must never index copies.

import "./sentry-safe-random-id";
import { canonicalUrl, isAliasHost } from "../utilities/domains";
import { PAGES } from "../utilities/pages";
import { REWRITTEN_PATH_HEADER } from "../utilities/tenant-param";
import { default as openNextHandler } from "./front-handler";
import {
  isNextImagePath,
  NEXT_IMAGE_CACHE_HEADER,
  nextImageCacheKey,
  withImageLifetime,
} from "./next-image-cache";
import {
  isOgImagePath,
  type OgImageBucket,
  serveFromR2Cache,
  serveOgImage,
} from "./og-image-cache";
import {
  isFallbackShellResponse,
  queueShellUpgrade,
  type RevalidationQueueNamespace,
} from "./shell-upgrade";
import { withWorkersDevNoindex } from "./workers-dev-noindex";

type Fetcher = { fetch(request: Request): Promise<Response> };
type Env = {
  ASSETS: Fetcher;
  APP_ENV?: string;
  NEXT_SERVER: Fetcher;
  NEXT_INC_CACHE_R2_BUCKET?: OgImageBucket;
  NEXT_CACHE_DO_QUEUE?: RevalidationQueueNamespace;
  CF_VERSION_METADATA?: { id: string; timestamp?: string };
  CRON_SECRET?: string;
  CRON_WARM_ORIGIN?: string;
};
type Context = { waitUntil(promise: Promise<unknown>): void };
type LinkElement = {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
};
declare const HTMLRewriter: new () => {
  on(
    selector: string,
    handlers: { element(element: LinkElement): void }
  ): {
    transform(response: Response): Response;
  };
};

const WARM_SITEMAPS_PATH = "/api/cron/warm-sitemaps";

const STUDIO_PATH = PAGES.ADMIN_STUDIO;
const STUDIO_HEADERS: Record<string, string> = {
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "frame-ancestors 'self';",
  "X-Robots-Tag": "noindex, nofollow",
};

function isStudioPath(pathname: string): boolean {
  return pathname === STUDIO_PATH || pathname.startsWith(`${STUDIO_PATH}/`);
}

async function serveStudio(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (isAliasHost(url.hostname)) {
    return Response.redirect(canonicalUrl(url.pathname, url.search), 308);
  }
  let response = await env.ASSETS.fetch(request);
  if (response.status === 404) {
    // A Studio route such as /admin/studio/structure/post is client-side: serve the app shell.
    const shell = new URL(`${STUDIO_PATH}/index.html`, request.url);
    response = await env.ASSETS.fetch(new Request(shell, request));
  }
  // `sanity build` writes the favicon and manifest links at the site root
  // (/static/...) even with a basePath, while the files themselves sit under
  // the Studio's own static/ folder. Point them there.
  if (response.headers.get("content-type")?.includes("text/html")) {
    response = new HTMLRewriter()
      .on('link[href^="/static/"]', {
        element(link) {
          link.setAttribute("href", `${STUDIO_PATH}${link.getAttribute("href")}`);
        },
      })
      .transform(response);
  }
  const withHeaders = new Response(response.body, response);
  for (const [name, value] of Object.entries(STUDIO_HEADERS)) withHeaders.headers.set(name, value);
  return withHeaders;
}

function handle(request: Request, env: Env, ctx: Context): Promise<Response> {
  const render = async (rendered: Request): Promise<Response> => {
    let response: Response = await openNextHandler.fetch(rendered, env, ctx);
    const rewrittenPath = response.headers.get(REWRITTEN_PATH_HEADER);
    if (rewrittenPath !== null) {
      // Internal to the Worker: the visitor never sees the /t/<tenant> path.
      response = new Response(response.body, response);
      response.headers.delete(REWRITTEN_PATH_HEADER);
    }
    if (env.NEXT_CACHE_DO_QUEUE && isFallbackShellResponse(rendered, response)) {
      const url = new URL(rendered.url);
      ctx.waitUntil(
        queueShellUpgrade(
          { host: url.host, path: rewrittenPath ?? url.pathname },
          {
            queue: env.NEXT_CACHE_DO_QUEUE,
            deployedAt: Date.parse(env.CF_VERSION_METADATA?.timestamp ?? "") || 0,
            onError: (error) => console.error("Fallback shell upgrade:", error),
          }
        )
      );
    }
    return response;
  };
  const url = new URL(request.url);
  // Without the bucket or the version binding (a config that left one out),
  // images are drawn or optimized every time rather than failing.
  const deploymentId = env.CF_VERSION_METADATA?.id;
  const bucket = request.method === "GET" ? env.NEXT_INC_CACHE_R2_BUCKET : undefined;
  if (isNextImagePath(url.pathname)) {
    const optimize = async (optimized: Request) =>
      withImageLifetime(await openNextHandler.fetch(optimized, env, ctx));
    if (!bucket || !deploymentId) return optimize(request);
    return serveFromR2Cache(request, {
      bucket,
      key: nextImageCacheKey(url, request.headers.get("accept"), deploymentId),
      render: optimize,
      waitUntil: (promise) => ctx.waitUntil(promise),
      statusHeader: NEXT_IMAGE_CACHE_HEADER,
      onError: (error) => console.error("Image cache:", error),
    });
  }
  if (!bucket || !deploymentId || !isOgImagePath(url.pathname)) {
    return render(request);
  }
  return serveOgImage(request, {
    bucket,
    deploymentId,
    render,
    waitUntil: (promise) => ctx.waitUntil(promise),
    onError: (error) => console.error("OG image cache:", error),
  });
}

function route(request: Request, env: Env, ctx: Context): Promise<Response> {
  if (isStudioPath(new URL(request.url).pathname)) return serveStudio(request, env);
  return handle(request, env, ctx);
}

export default {
  async fetch(incoming: Request, env: Env, ctx: Context): Promise<Response> {
    return withWorkersDevNoindex(incoming, await route(incoming, env, ctx), env.APP_ENV);
  },

  async scheduled(
    _controller: { cron: string; scheduledTime: number },
    env: Env,
    ctx: Context
  ): Promise<void> {
    const headers = new Headers();
    if (env.CRON_SECRET) headers.set("authorization", `Bearer ${env.CRON_SECRET}`);
    // The origin only routes the request inside this worker; it is never
    // fetched over the network.
    const origin = env.CRON_WARM_ORIGIN || "http://localhost";
    const request = new Request(new URL(WARM_SITEMAPS_PATH, origin), { headers });
    ctx.waitUntil(
      openNextHandler
        .fetch(request, env, ctx)
        .then(async (response) => {
          if (!response.ok) {
            console.error(`Cron ${WARM_SITEMAPS_PATH} returned HTTP ${response.status}`);
          }
          await response.body?.cancel();
        })
        .catch((error) => {
          console.error(`Cron ${WARM_SITEMAPS_PATH} failed:`, error);
        })
    );
  },
};

// Durable Object classes the cache overrides in open-next.config.ts bind to.
// They live in this Worker; the Next server Worker binds to them by script name.
// @ts-expect-error -- generated by `opennextjs-cloudflare build`
export { DOQueueHandler } from "../.open-next/.build/durable-objects/queue.js";
// @ts-expect-error -- generated by `opennextjs-cloudflare build`
export { DOShardedTagCache } from "../.open-next/.build/durable-objects/sharded-tag-cache.js";
