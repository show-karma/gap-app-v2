// The site's copies on *.workers.dev (the staging, PR previews and the
// production Worker before its cutover) serve the same pages as the production
// hosts. Search engines must never index them, so every response there says so.
// The production hosts never end in .workers.dev, so they are not affected.

const WORKERS_DEV_SUFFIX = ".workers.dev";
const NOINDEX = "noindex, nofollow";

/** The response, marked not to be indexed when it was served on *.workers.dev. */
export function withWorkersDevNoindex(request: Request, response: Response): Response {
  if (!new URL(request.url).hostname.endsWith(WORKERS_DEV_SUFFIX)) return response;
  const marked = new Response(response.body, response);
  marked.headers.set("X-Robots-Tag", NOINDEX);
  return marked;
}
