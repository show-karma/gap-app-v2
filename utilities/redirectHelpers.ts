import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { FRONTEND_NEXTJS_ROUTES } from "./frontendNextjsRoutes"

/**
 * Get the governance subdomain based on environment
 * - Production: gov.karmahq.xyz
 * - Staging: govstag.karmahq.xyz
 */
function getGovSubdomain(): string {
  const isProduction = process.env.NEXT_PUBLIC_ENV === "production"
  return isProduction ? "gov.karmahq.xyz" : "govstag.karmahq.xyz"
}

/**
 * Check if a path should redirect to governance subdomain
 *
 * PRIORITY RULE: gap-app-v2 routes ALWAYS take precedence over redirects.
 * This only redirects routes that gap-app-v2 does NOT handle.
 */
export function shouldRedirectToGov(path: string): boolean {
  // Check exact matches
  if (FRONTEND_NEXTJS_ROUTES.includes(path as any)) {
    return true
  }

  // Check prefix matches
  return FRONTEND_NEXTJS_ROUTES.some((route) => {
    if (route.endsWith("/")) {
      return path.startsWith(route)
    }
    return false
  })
}

/**
 * Create redirect response to governance subdomain (environment-aware)
 * - Production: Redirects to gov.karmahq.xyz
 * - Staging: Redirects to govstag.karmahq.xyz
 */
export function redirectToGov(request: NextRequest): NextResponse {
  const govUrl = new URL(request.nextUrl.pathname, request.url)
  govUrl.hostname = getGovSubdomain()
  govUrl.search = request.nextUrl.search // Preserve query params
  return NextResponse.redirect(govUrl, 308) // 308 = Permanent Redirect
}
