"use client";

import { createContext, useContext } from "react";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import type { WhitelabelDomain } from "./whitelabel-config";

interface WhitelabelContextValue {
  isWhitelabel: boolean;
  communitySlug: string | null;
  config: WhitelabelDomain | null;
  tenantConfig: TenantConfig | null;
}

const WhitelabelCtx = createContext<WhitelabelContextValue>({
  isWhitelabel: false,
  communitySlug: null,
  config: null,
  tenantConfig: null,
});

export function WhitelabelProvider({
  isWhitelabel,
  communitySlug,
  config,
  tenantConfig,
  children,
}: WhitelabelContextValue & { children: React.ReactNode }) {
  return (
    <WhitelabelCtx.Provider value={{ isWhitelabel, communitySlug, config, tenantConfig }}>
      {children}
    </WhitelabelCtx.Provider>
  );
}

export function useWhitelabel(): WhitelabelContextValue {
  return useContext(WhitelabelCtx);
}
