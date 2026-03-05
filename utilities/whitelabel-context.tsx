"use client";

import { createContext, useContext } from "react";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import type { WhitelabelDomain } from "./whitelabel-config";

interface WhitelabelContextValue {
  isWhitelabel: boolean;
  isUmbrella: boolean;
  communitySlug: string | null;
  config: WhitelabelDomain | null;
  tenantConfig: TenantConfig | null;
}

const WhitelabelCtx = createContext<WhitelabelContextValue>({
  isWhitelabel: false,
  isUmbrella: false,
  communitySlug: null,
  config: null,
  tenantConfig: null,
});

export function WhitelabelProvider({
  isWhitelabel,
  isUmbrella,
  communitySlug,
  config,
  tenantConfig,
  children,
}: WhitelabelContextValue & { children: React.ReactNode }) {
  return (
    <WhitelabelCtx.Provider
      value={{ isWhitelabel, isUmbrella, communitySlug, config, tenantConfig }}
    >
      {children}
    </WhitelabelCtx.Provider>
  );
}

export function useWhitelabel(): WhitelabelContextValue {
  return useContext(WhitelabelCtx);
}
