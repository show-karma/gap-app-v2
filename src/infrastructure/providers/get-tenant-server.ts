import { headers } from "next/headers";
import React from "react";
import fetchData from "@/utilities/fetchData";
import { getTenantConfig } from "../config/tenant-config";
import type { TenantConfig } from "../types/tenant";
import { isKnownTenant } from "../types/tenant";

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
  const tenantIdHeader = headersList.get("x-tenant-id") || "karma";
  const communitySlug = headersList.get("x-community-slug") || undefined;

  if (isKnownTenant(tenantIdHeader)) {
    const config = getTenantConfig(tenantIdHeader, communitySlug);
    return { tenant: config };
  }

  // Unknown tenant — treat as community slug with karma config
  const effectiveSlug = communitySlug || tenantIdHeader;
  const config = getTenantConfig("karma", effectiveSlug);

  // Fetch community data from API
  const [communityData] = await fetchData(
    `/v2/communities/${effectiveSlug}`,
    "GET",
    undefined,
    undefined,
    undefined,
    true
  );

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
