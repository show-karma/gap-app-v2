import { headers } from "next/headers";
import React from "react";
import { errorManager } from "@/components/Utilities/errorManager";
import { api } from "@/utilities/api/client";
import { HttpError } from "@/utilities/api/errors";
import { orElse } from "@/utilities/api/or-else";
import { getWhitelabelByDomain } from "@/utilities/whitelabel-config";
import { getTenantConfig } from "../config/tenant-config";
import type { TenantConfig } from "../types/tenant";
import { isKnownTenant } from "../types/tenant";

// TODO(#1775): add zod schema
interface CommunityApiResponse {
  name?: string;
  uid?: string;
  imageURL?: string;
}

export interface TenantServerResult {
  tenant: TenantConfig;
  communityNotFound?: false;
}

export interface CommunityNotFoundResult {
  tenant: null;
  communityNotFound: true;
  communitySlug: string;
}

export type GetTenantServerResult = TenantServerResult | CommunityNotFoundResult;

const serverCache = typeof React.cache === "function" ? React.cache : (fn: unknown) => fn;

export const getTenantServer = serverCache(async (): Promise<GetTenantServerResult> => {
  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const whitelabelConfig = getWhitelabelByDomain(host);

  // Resolve tenant and community from the host domain rather than
  // trusting client-supplied headers which can be spoofed.
  const tenantIdHeader = whitelabelConfig?.tenantId || whitelabelConfig?.communitySlug || "karma";
  const communitySlug = whitelabelConfig?.communitySlug || undefined;

  if (isKnownTenant(tenantIdHeader)) {
    const config = getTenantConfig(tenantIdHeader, communitySlug);
    return { tenant: config };
  }

  // Unknown tenant — treat as community slug with karma config
  const effectiveSlug = communitySlug || tenantIdHeader;
  const config = getTenantConfig("karma", effectiveSlug);

  // Fetch community data from API. Any failure (including 404) degrades to
  // communityNotFound, matching the previous fetchData behavior which never
  // threw and only checked for a falsy payload.
  let communityData: CommunityApiResponse | undefined;
  try {
    communityData = await orElse(
      api.get<CommunityApiResponse>(`/v2/communities/${effectiveSlug}`),
      undefined
    );
  } catch (error) {
    // A 404 here just means the slug doesn't match a known community —
    // the expected `communityNotFound` outcome, not a failure to report.
    if (!(error instanceof HttpError && error.status === 404)) {
      errorManager(`Error fetching community data for tenant slug: ${effectiveSlug}`, error);
    }
    communityData = undefined;
  }

  if (!communityData) {
    return { tenant: null, communityNotFound: true, communitySlug: effectiveSlug };
  }

  return {
    tenant: {
      ...config,
      id: effectiveSlug,
      name: communityData.name || config.name,
      communityUID: communityData.uid || config.communityUID,
      communitySlug: effectiveSlug,
      assets: {
        ...config.assets,
        logo: communityData.imageURL || config.assets.logo,
        logoDark: undefined,
      },
      navigation: {
        ...config.navigation,
        header: {
          ...config.navigation.header,
          logo: undefined,
          shouldHaveTitle: true,
          poweredBy: true,
        },
      },
    },
  };
});
