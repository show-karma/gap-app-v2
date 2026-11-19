// Gives each project and community page its own cache entry.
//
// With Cache Components and `partialPrefetching`, a page of a dynamic route
// that was not generated at build (`/project/gitcoin`) is first answered with
// the route's fallback shell, the static part rendered with its params unknown,
// and the rest is rendered for the request. Next then renders that URL's own
// shell in the background and stores it, so the next visit is served from the
// cache. On Vercel the platform does that step; Next skips it in minimal mode,
// which is how OpenNext runs it. On the Worker nothing does it, so these pages
// were rendered in full on every request, never cached (`private, no-store`),
// with the project's content waiting on the cache store and the indexer.
//
// This takes the platform's place: when Next answers with a fallback shell, the
// page is sent to OpenNext's revalidation queue (the NEXT_CACHE_DO_QUEUE Durable
// Object), the same path a stale page takes. The queue requests it with
// `x-prerender-revalidate`, Next renders that page's shell and stores it, and
// later requests are cache hits. The queue already dedupes a page in flight and
// retries a failed render later.
//
// The queue's request skips proxy.ts (OpenNext bypasses middleware for it), so
// it must name the internal path the proxy rewrote the page to
// (`/t/karma/project/gitcoin`), not the public one, which would be a 404. The
// proxy reports that path in REWRITTEN_PATH_HEADER (utilities/tenant-param.ts).
//
// A fallback shell is the only response that is both `x-nextjs-postponed: 1`
// and carries no `x-nextjs-cache`: prerendered and stored pages say HIT, MISS or
// STALE, and a missing project is a 404.
//
// Kept free of Worker and adapter imports so it can be unit tested.

export const POSTPONED_HEADER = "x-nextjs-postponed";
export const NEXT_CACHE_HEADER = "x-nextjs-cache";
const PRERENDER_REVALIDATE_HEADER = "x-prerender-revalidate";
const RSC_HEADER = "rsc";

const DAY_MS = 86_400_000;
// Requests for the same URL inside this window are not queued again by this
// isolate; the queue dedupes across isolates. A page whose render never gets
// stored (on staging, /community/<id>/impact: Next answers even the queue's
// request with the fallback shell) is otherwise sent again on every visit.
const REQUEUE_AFTER_MS = 600_000;
// OpenNext's default; the queue keeps one Durable Object per shard.
const QUEUE_SHARDS = 10;

/** The message OpenNext's revalidation queue takes (`DOQueueHandler.revalidate`). */
export interface RevalidationMessage {
  MessageBody: { host: string; url: string; lastModified: number };
  MessageDeduplicationId: string;
  MessageGroupId: string;
}

/** The part of the NEXT_CACHE_DO_QUEUE namespace binding this uses. */
export interface RevalidationQueueNamespace {
  idFromName(name: string): unknown;
  get(id: never): { revalidate(message: RevalidationMessage): Promise<unknown> };
}

/** True when `response` is a route's fallback shell, not the page's own cache entry. */
export function isFallbackShellResponse(request: Request, response: Response): boolean {
  if (request.method !== "GET" || response.status !== 200) return false;
  // The queue's own request: never send it back to the queue.
  if (request.headers.has(PRERENDER_REVALIDATE_HEADER)) return false;
  // Client navigations render in full and never get a shell.
  if (request.headers.has(RSC_HEADER)) return false;
  return response.headers.get(POSTPONED_HEADER) === "1" && !response.headers.has(NEXT_CACHE_HEADER);
}

// The shard OpenNext itself picks for a path (generateMessageGroupId in
// @opennextjs/aws), so a page this queues and the same page going stale land
// on the same Durable Object, which dedupes them.
function cyrb128(text: string): number {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  return h1 >>> 0;
}

export function messageGroupId(path: string): string {
  let t = cyrb128(path) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const randomFloat = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return `revalidate-${Math.floor(randomFloat * QUEUE_SHARDS)}`;
}

/** The page to render: the request's host and the internal path it was rewritten to. */
export interface ShellUpgradeTarget {
  host: string;
  path: string;
}

/**
 * The queue message for a page served with its fallback shell.
 *
 * The queue skips a page it rendered after `lastModified`. Setting that to the
 * later of the deployment and a day ago renders each page once per deployment
 * and at most once a day, even if Next keeps answering it with the shell.
 */
export function shellUpgradeMessage(
  { host, path }: ShellUpgradeTarget,
  deployedAt: number,
  now: number
): RevalidationMessage {
  return {
    MessageBody: { host, url: path, lastModified: Math.max(deployedAt, now - DAY_MS) },
    MessageDeduplicationId: `shell-upgrade:${host}${path}`,
    MessageGroupId: messageGroupId(path),
  };
}

const recentlyQueued = new Map<string, number>();

/**
 * Sends a page answered with its fallback shell to the revalidation queue, so
 * that its own shell is rendered and stored. Never throws.
 */
export async function queueShellUpgrade(
  target: ShellUpgradeTarget,
  options: {
    queue: RevalidationQueueNamespace;
    deployedAt: number;
    onError?: (error: unknown) => void;
    now?: () => number;
  }
): Promise<void> {
  const now = (options.now ?? Date.now)();
  const key = `${target.host}${target.path}`;
  const last = recentlyQueued.get(key);
  if (last !== undefined && now - last < REQUEUE_AFTER_MS) return;
  recentlyQueued.set(key, now);
  if (recentlyQueued.size > 1000) recentlyQueued.clear();
  const message = shellUpgradeMessage(target, options.deployedAt, now);
  try {
    const stub = options.queue.get(options.queue.idFromName(message.MessageGroupId) as never);
    await stub.revalidate(message);
  } catch (error) {
    // SUPPRESSED: reported through onError; the page was already served from its fallback shell.
    recentlyQueued.delete(key);
    options.onError?.(error);
  }
}
