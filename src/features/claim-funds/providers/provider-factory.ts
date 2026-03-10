import { createHedgeyProvider } from "./hedgey/hedgey-provider";
import type { ClaimGrantsConfig, ClaimProvider, HedgeyProviderConfig } from "./types";

/**
 * Factory function to create a claim provider based on configuration.
 */
export function createClaimProvider(
  config: ClaimGrantsConfig | undefined,
  testCampaignIds?: string[]
): ClaimProvider | null {
  if (!config?.enabled) {
    return null;
  }

  switch (config.provider) {
    case "hedgey":
      if (!config.providerConfig || config.providerConfig.type !== "hedgey") {
        return null;
      }
      return createHedgeyProvider(config.providerConfig as HedgeyProviderConfig, testCampaignIds);

    case "none":
      return null;

    default:
      return null;
  }
}

/**
 * Type guard to check if a provider config is for Hedgey
 */
export function isHedgeyConfig(
  config: ClaimGrantsConfig
): config is ClaimGrantsConfig & { providerConfig: HedgeyProviderConfig } {
  return config.provider === "hedgey" && config.providerConfig?.type === "hedgey";
}
