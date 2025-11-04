import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { FRONTEND_NEXTJS_ROUTES } from "./frontendNextjsRoutes";

/**
 * Check if a path should redirect to gov.karmahq.xyz
 *
 * PRIORITY RULE: gap-app-v2 routes ALWAYS take precedence over redirects.
 * This only redirects routes that gap-app-v2 does NOT handle.
 */
export function shouldRedirectToGov(path: string): boolean {
  // Check exact matches
  if (FRONTEND_NEXTJS_ROUTES.includes(path as any)) {
    return true;
  }

  // Check prefix matches
  return FRONTEND_NEXTJS_ROUTES.some((route) => {
    if (route.endsWith("/")) {
      return path.startsWith(route);
    }
    return false;
  });
}

/**
 * Create redirect response to gov.karmahq.xyz
 */
export function redirectToGov(request: NextRequest): NextResponse {
  const govUrl = new URL(request.nextUrl.pathname, request.url);
  govUrl.hostname = "gov.karmahq.xyz";
  govUrl.search = request.nextUrl.search; // Preserve query params
  return NextResponse.redirect(govUrl, 308); // 308 = Permanent Redirect
}
