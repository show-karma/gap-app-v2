// Non-production deployments (staging on *.workers.dev or staging.karmahq.org, PR
// previews, and the production Worker before its cutover on *.workers.dev)
// serve the same pages as production. Search engines must never index them, so
// every response served on *.workers.dev or when APP_ENV === "preview" says so.
// Production custom hosts never end in .workers.dev and run with APP_ENV === "production",
// so they are not affected.

const WORKERS_DEV_SUFFIX = ".workers.dev";
const PREVIEW_ENV = "preview";
const NOINDEX = "noindex, nofollow";

/**
 * Marks responses with `X-Robots-Tag: noindex, nofollow` when served on
 * `*.workers.dev` or in a `preview` deployment (`APP_ENV === "preview"`).
 */
export function withWorkersDevNoindex(
  request: Request,
  response: Response,
  appEnv?: string
): Response {
  const isWorkersDev = new URL(request.url).hostname.endsWith(WORKERS_DEV_SUFFIX);
  if (!isWorkersDev && appEnv !== PREVIEW_ENV) return response;
  const marked = new Response(response.body, response);
  marked.headers.set("X-Robots-Tag", NOINDEX);
  return marked;
}
