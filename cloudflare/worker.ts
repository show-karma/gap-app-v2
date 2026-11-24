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
//   handler, with the same bearer token Vercel sends, so the route itself does
//   not change.
// - The Sanity Studio. On this build it is a static `sanity build` in the
//   assets (`pnpm cf:build:studio`), not a Next.js route, so it stays out of
//   the Worker bundle. wrangler.jsonc runs this worker first for its paths so
//   deep links fall back to the Studio's index.html and every response gets the
//   headers the Next.js route had: no framing by other sites, never indexed.
//   proxy.ts never sees these requests, so the one rule of it the Studio needs,
//   the 308 from an alias host to the canonical one, is applied here too.
// - A shared cache for the social preview (OG) images, which on Vercel the CDN
//   keeps and here nothing does (cloudflare/og-image-cache.ts).
// - The background step that gives each project or community page its own
//   cache entry after its first visit, which Vercel does and Next leaves to
//   the platform (cloudflare/shell-upgrade.ts).
// - `X-Robots-Tag: noindex` on every response served on *.workers.dev: the
//   staging, PR previews and the production Worker before its cutover are
//   copies of the site that search engines must never index.

import "./sentry-safe-random-id";
import { canonicalUrl, isAliasHost } from "../utilities/domains";
import { PAGES } from "../utilities/pages";
import { REWRITTEN_PATH_HEADER } from "../utilities/tenant-param";
import { default as openNextHandler } from "./front-handler";
import { isOgImagePath, type OgImageBucket, serveOgImage } from "./og-image-cache";
import {
  isFallbackShellResponse,
  queueShellUpgrade,
  type RevalidationQueueNamespace,
} from "./shell-upgrade";
import { withWorkersDevNoindex } from "./workers-dev-noindex";

type Fetcher = { fetch(request: Request): Promise<Response> };
type Env = {
  ASSETS: Fetcher;
  NEXT_SERVER: Fetcher;
  NEXT_INC_CACHE_R2_BUCKET?: OgImageBucket;
  NEXT_CACHE_DO_QUEUE?: RevalidationQueueNamespace;
  CF_VERSION_METADATA?: { id: string; timestamp?: string };
  CRON_SECRET?: string;
  CRON_WARM_ORIGIN?: string;
  TEST_WORKER?: string;
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

// Test Worker only: everything gated on TEST_WORKER = "1", which only the
// *.workers.dev test Worker sets. Never set it on a Worker with a custom domain.
//
// - x-karma-test-host stands in for the Host header. proxy.ts picks the tenant
//   from the Host, and on *.workers.dev the Host cannot be anything else:
//   Cloudflare routes on it, so `Host: grantsapp.scroll.io` would reach Scroll's
//   own zone. With it, whitelabel tenants can be exercised without DNS.
// - x-karma-isolate on every response names the isolate and counts the requests
//   it has served, which shows whether Cloudflare reuses isolates.
const TEST_HOST_HEADER = "x-karma-test-host";
// Workers forbid random values and a meaningful clock in global scope, so the
// isolate is named and timed on its first request.
let isolateId = "";
let isolateFirstRequestAt = 0;
let isolateRequests = 0;
let nextServerLoaded = false;
const ISOLATE_PROBE_PATH = "/__karma/isolate";

function isTestWorker(env: Env): boolean {
  return env.TEST_WORKER === "1";
}

function withIsolateHeader(response: Response): Response {
  const tagged = new Response(response.body, response);
  tagged.headers.set(
    "x-karma-isolate",
    `${isolateId};n=${isolateRequests};age=${Date.now() - isolateFirstRequestAt}`
  );
  return tagged;
}

function withTestHost(request: Request, env: Env): Request {
  const testHost = isTestWorker(env) ? request.headers.get(TEST_HOST_HEADER) : null;
  if (!testHost) return request;
  const url = new URL(request.url);
  url.hostname = testHost;
  const headers = new Headers(request.headers);
  headers.delete(TEST_HOST_HEADER);
  headers.set("host", testHost);
  return new Request(url, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  });
}

function handle(request: Request, env: Env, ctx: Context): Promise<Response> {
  const render = async (rendered: Request): Promise<Response> => {
    nextServerLoaded = true;
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
  // Without the bucket or the version binding (a config that left one out),
  // OG images are drawn every time rather than failing.
  const deploymentId = env.CF_VERSION_METADATA?.id;
  if (
    request.method !== "GET" ||
    !isOgImagePath(new URL(request.url).pathname) ||
    !env.NEXT_INC_CACHE_R2_BUCKET ||
    !deploymentId
  ) {
    return render(request);
  }
  return serveOgImage(request, {
    bucket: env.NEXT_INC_CACHE_R2_BUCKET,
    deploymentId,
    render,
    waitUntil: (promise) => ctx.waitUntil(promise),
    onError: (error) => console.error("OG image cache:", error),
  });
}

async function route(incoming: Request, env: Env, ctx: Context): Promise<Response> {
  const request = withTestHost(incoming, env);
  if (isStudioPath(new URL(request.url).pathname)) return serveStudio(request, env);
  if (!isTestWorker(env)) return handle(request, env, ctx);
  if (!isolateId) {
    isolateId = crypto.randomUUID().slice(0, 8);
    isolateFirstRequestAt = Date.now();
  }
  isolateRequests++;
  // Answers without loading the Next.js server, to tell isolate reuse apart
  // from what the server costs once it is loaded.
  if (new URL(request.url).pathname === ISOLATE_PROBE_PATH) {
    return withIsolateHeader(Response.json({ nextLoaded: nextServerLoaded }));
  }
  return withIsolateHeader(await handle(request, env, ctx));
}

export default {
  async fetch(incoming: Request, env: Env, ctx: Context): Promise<Response> {
    return withWorkersDevNoindex(incoming, await route(incoming, env, ctx));
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
    ctx.waitUntil(openNextHandler.fetch(request, env, ctx));
  },
};

// Durable Object classes the cache overrides in open-next.config.ts bind to.
// They live in this Worker; the Next server Worker binds to them by script name.
// @ts-expect-error -- generated by `opennextjs-cloudflare build`
export { DOQueueHandler } from "../.open-next/.build/durable-objects/queue.js";
// @ts-expect-error -- generated by `opennextjs-cloudflare build`
export { DOShardedTagCache } from "../.open-next/.build/durable-objects/sharded-tag-cache.js";
