"use client";

import { createContext, useContext } from "react";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";

interface WhitelabelContextValue {
  isWhitelabel: boolean;
  communitySlug: string | null;
  tenantConfig: TenantConfig | null;
}

const WhitelabelCtx = createContext<WhitelabelContextValue>({
  isWhitelabel: false,
  communitySlug: null,
  tenantConfig: null,
});

export function WhitelabelProvider({
  isWhitelabel,
  communitySlug,
  tenantConfig,
  children,
}: WhitelabelContextValue & { children: React.ReactNode }) {
  return (
    <WhitelabelCtx.Provider value={{ isWhitelabel, communitySlug, tenantConfig }}>
      {children}
    </WhitelabelCtx.Provider>
  );
}

export function useWhitelabel(): WhitelabelContextValue {
  return useContext(WhitelabelCtx);
}
