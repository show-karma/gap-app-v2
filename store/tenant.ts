import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { getTenantConfig } from "@/src/infrastructure/config/tenant-config";
import type { TenantConfig } from "@/src/infrastructure/types/tenant";
import { isKnownTenant } from "@/src/infrastructure/types/tenant";

interface TenantState {
  tenant: TenantConfig | null;
  setTenant: (tenant: TenantConfig | null) => void;
}

function hexToRgb(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function applyTheme(tenant: TenantConfig | null) {
  if (!tenant || typeof document === "undefined") return;

  const root = document.documentElement;

  root.style.setProperty("--color-primary", hexToRgb(tenant.theme.colors.primary));
  root.style.setProperty("--color-primary-dark", hexToRgb(tenant.theme.colors.primaryDark));
  root.style.setProperty("--color-primary-light", hexToRgb(tenant.theme.colors.primaryLight));
  root.style.setProperty("--color-secondary", hexToRgb(tenant.theme.colors.secondary));
  root.style.setProperty("--color-success", hexToRgb(tenant.theme.colors.success));
  root.style.setProperty("--color-warning", hexToRgb(tenant.theme.colors.warning));
  root.style.setProperty("--color-error", hexToRgb(tenant.theme.colors.error));
  root.style.setProperty("--color-border", hexToRgb(tenant.theme.colors.border));
  root.style.setProperty("--color-background", hexToRgb(tenant.theme.colors.background));
  root.style.setProperty("--color-foreground", hexToRgb(tenant.theme.colors.foreground));
  root.style.setProperty("--color-buttontext", hexToRgb(tenant.theme.colors.buttontext));
  root.style.setProperty("--color-muted-foreground", hexToRgb(tenant.theme.colors.mutedForeground));

  root.style.setProperty("--radius-small", tenant.theme.radius.small);
  root.style.setProperty("--radius-medium", tenant.theme.radius.medium);
  root.style.setProperty("--radius-large", tenant.theme.radius.large);

  root.style.setProperty("--font-sans", tenant.theme.fonts.sans.join(", "));
  root.style.setProperty("--font-mono", tenant.theme.fonts.mono.join(", "));
}

export const useTenantStore = create<TenantState>()(
  devtools(
    (set) => ({
      tenant: null,
      setTenant: (tenant) => {
        applyTheme(tenant);
        set({ tenant });
      },
    }),
    { name: "tenant-store" }
  )
);

export function useTenant(): TenantConfig {
  const tenant = useTenantStore((state) => state.tenant);
  if (!tenant) {
    return getTenantConfig("karma");
  }
  return tenant;
}

export function useTenantSafe(): TenantConfig | null {
  return useTenantStore((state) => state.tenant);
}
