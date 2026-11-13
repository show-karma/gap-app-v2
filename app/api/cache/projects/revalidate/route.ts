import * as Sentry from "@sentry/nextjs";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  isValidProjectRevalidationSignature,
  MAX_NOTICE_BYTES,
  PROJECT_CACHE_SIGNATURE_HEADER,
  projectRevalidationNoticeSchema,
} from "@/src/domain/cache/project-revalidation";
import { projectTag } from "@/utilities/cache/tags";
import { getServerEnv } from "@/utilities/env";

const ROUTE = "/api/cache/projects/revalidate";

/**
 * Receives gap-indexer's project-changed notices and expires the cached pages
 * of those projects at once.
 *
 * The indexer sends one after every write to a project or one of its grants
 * (gap-indexer: the project and grant repositories), so an edit shows on the
 * public project page on the next request instead of after the cache lifetime.
 * Every cache entry behind a project page is tagged with the project's uid
 * (`services/project.cached.ts`), whichever id the route used.
 *
 * `{ expire: 0 }`, not "max": the next reader must get the new data, not the
 * old page while it rebuilds. That is what Next documents for a webhook, where
 * `updateTag` is not available.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { PROJECT_CACHE_REVALIDATION_SECRET } = getServerEnv();

  // Without a secret no request can be authenticated: refuse everything.
  if (!PROJECT_CACHE_REVALIDATION_SECRET) {
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_NOTICE_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody) > MAX_NOTICE_BYTES) {
    return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
  }

  const signed = isValidProjectRevalidationSignature({
    secret: PROJECT_CACHE_REVALIDATION_SECRET,
    header: request.headers.get(PROJECT_CACHE_SIGNATURE_HEADER),
    rawBody,
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  if (!signed) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  // Signed but malformed is a bug on the sending side: a 400 the indexer logs.
  let uids: string[];
  try {
    const notice = projectRevalidationNoticeSchema.parse(JSON.parse(rawBody));
    uids = [...new Set(notice.projects.map(({ uid }) => uid.toLowerCase()))];
  } catch (error) {
    Sentry.captureException(error, { tags: { route: ROUTE } });
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  try {
    for (const uid of uids) revalidateTag(projectTag(uid), { expire: 0 });
    return NextResponse.json({ ok: true, revalidated: uids.length }, { status: 200 });
  } catch (error) {
    // A 5xx makes the indexer retry, which is right for a failure on this side.
    Sentry.captureException(error, { tags: { route: ROUTE } });
    return NextResponse.json({ ok: false, error: "Revalidation failed" }, { status: 500 });
  }
}
