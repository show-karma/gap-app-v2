import { getTenantForExclusiveDomain } from "../config/domain-constants";
import { getDomainMappingBySlug, isSharedSubdomain } from "../config/domain-mapping";
import type { TenantDetectionRequest, TenantId } from "../types/tenant";

export function extractCommunityFromPath(pathname: string): TenantId | null {
  if (!pathname) return null;
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  if (!firstSegment) return null;
  const mapping = getDomainMappingBySlug(firstSegment);
  return mapping?.id || null;
}

/**
 * Detects tenant from request.
 * 1. Exclusive domain (e.g., app.opgrants.io) -> configured tenant
 * 2. Shared domain -> get community from URL path
 */
export async function detectTenant(request: TenantDetectionRequest): Promise<TenantId | null> {
  const hostname = request.headers.get("host");
  const pathname = request.headers.get("x-pathname") || "/";

  if (hostname && isSharedSubdomain(hostname)) {
    return extractCommunityFromPath(pathname);
  }

  const exclusiveTenant = hostname ? getTenantForExclusiveDomain(hostname) : null;
  if (exclusiveTenant) return exclusiveTenant;

  return null;
}
