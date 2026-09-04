"use client";

import { Suspense } from "react";

/**
 * The Suspense boundary the manage chrome sits behind.
 *
 * `ManageSidebar` and `ManageBreadcrumbs` both read `usePathname()` to work out
 * which entry is active and what the crumb trail is. A client component reading
 * URL state outside a boundary is what stops a route from being prerendered
 * (`CLIENT_HOOK_DYNAMIC`), and these two sit in the layout, so between them they
 * held down every route under `/community/[communityId]/manage`.
 *
 * A boundary is the right answer here rather than a server-side rewrite: the
 * manage tree is noindex (`robots: index: false` on its layout), so DEV-612's
 * no-JS visibility rule does not apply — nothing behind this boundary needs to
 * be in the crawlable payload.
 *
 * One shared wrapper rather than two inline `<Suspense>` tags so the two pieces
 * of chrome cannot drift apart, and so the reason lives in exactly one place.
 * Each caller supplies the fallback that matches its own footprint, because a
 * `null` fallback in the sidebar slot would collapse the rail and shift the page.
 */
export function ManageChromeBoundary({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
