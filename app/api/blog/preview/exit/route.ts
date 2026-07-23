import { draftMode } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PAGES } from "@/utilities/pages";

// Exit control for `<PreviewBanner>` (`src/components/blog/PreviewBanner.tsx`).
// No secret required — this route only ever revokes draft mode, it never
// grants it, so there's nothing to gate. Redirects back to the post being
// previewed (`?slug=`) when given, otherwise to the blog index.
export async function GET(request: NextRequest): Promise<NextResponse> {
  (await draftMode()).disable();

  const slug = request.nextUrl.searchParams.get("slug");
  const redirectPath = slug ? PAGES.BLOG_POST(slug) : PAGES.BLOG;

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
