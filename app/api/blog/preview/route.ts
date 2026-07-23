import { draftMode } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerEnv } from "@/utilities/env";
import { PAGES } from "@/utilities/pages";

// Entry point for Sanity's "Preview" action (Studio Presentation tool /
// share link): `?secret=<SANITY_PREVIEW_SECRET>&slug=<post-slug>`. A valid
// secret enables Next.js draft mode (sets the `__prerender_bypass` /
// `__next_preview_data` cookies) and redirects into the post itself, which
// then reads through the content gateway with `{ draft: true }` so it can
// render unpublished edits. See `app/blog/[slug]/page.tsx`.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { SANITY_PREVIEW_SECRET } = getServerEnv();
  const secret = request.nextUrl.searchParams.get("secret");
  const slug = request.nextUrl.searchParams.get("slug");

  if (!SANITY_PREVIEW_SECRET || !secret || secret !== SANITY_PREVIEW_SECRET) {
    return NextResponse.json({ ok: false, error: "Invalid preview secret" }, { status: 401 });
  }

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  (await draftMode()).enable();

  return NextResponse.redirect(new URL(PAGES.BLOG_POST(slug), request.url));
}
