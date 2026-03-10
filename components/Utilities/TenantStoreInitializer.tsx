"use client";

import { type ReactNode, useEffect, useRef } from "react";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { useTenantStore } from "@/store/tenant";

interface TenantStoreInitializerProps {
  tenant: TenantConfig;
  children: ReactNode;
}

export function TenantStoreInitializer({ tenant, children }: TenantStoreInitializerProps) {
  const initializedRef = useRef<string | null>(null);
  const setTenant = useTenantStore((state) => state.setTenant);

  useEffect(() => {
    if (tenant && initializedRef.current !== tenant.id) {
      setTenant(tenant);
      initializedRef.current = tenant.id;
    }
  }, [tenant, setTenant]);

  return <>{children}</>;
}
