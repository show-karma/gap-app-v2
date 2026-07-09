import * as Sentry from "@sentry/nextjs";
import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { mapPayloadToPaths, type SanityRevalidatePayload } from "@/src/domain/blog/revalidate";
import { getServerEnv } from "@/utilities/env";

// Sanity Studio webhook (Settings > API > Webhooks): fires on post
// create/update/publish/unpublish/delete and immediately invalidates the
// affected paths, so edits show up without waiting for the `revalidate =
// 60` ISR ceiling on `/blog` and `/blog/[slug]`. That ceiling is still the
// self-healing fallback if this route is ever unreachable or misconfigured.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { SANITY_WEBHOOK_SECRET } = getServerEnv();

  // No secret configured means the request can never be authenticated —
  // reject outright rather than calling parseBody() without a secret,
  // which would return `isValidSignature: null` (skipped, not verified).
  if (!SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "Webhook not configured" }, { status: 401 });
  }

  try {
    const { isValidSignature, body } = await parseBody<SanityRevalidatePayload>(
      request,
      SANITY_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    const paths = mapPayloadToPaths(body);
    for (const path of paths) revalidatePath(path);

    return NextResponse.json({ ok: true, revalidated: paths }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "/api/blog/revalidate" } });
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
}
