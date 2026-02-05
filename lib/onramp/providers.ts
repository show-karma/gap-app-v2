import { OnrampProvider } from "@/hooks/donation/types";

/**
 * Chain IDs supported by Stripe for fiat onramp
 * Maps to: ethereum (1), base (8453), polygon (137), avalanche (43114)
 */
export const STRIPE_SUPPORTED_CHAIN_IDS = [1, 8453, 137, 43114] as const;

export const ALLOWED_ONRAMP_DOMAINS = ["crypto.link.com"] as const;

export interface OnrampProviderConfig {
  id: OnrampProvider;
  name: string;
  description: string;
  supportedCurrencies: Array<{ code: string; symbol: string }>;
  supportedNetworks: string[];
}

const PROVIDER_CONFIGS: Record<OnrampProvider, OnrampProviderConfig> = {
  [OnrampProvider.STRIPE]: {
    id: OnrampProvider.STRIPE,
    name: "Stripe",
    description: "Purchase crypto with card via Stripe",
    supportedCurrencies: [
      { code: "USD", symbol: "$" },
      { code: "EUR", symbol: "€" },
      { code: "GBP", symbol: "£" },
    ],
    supportedNetworks: ["ethereum", "base", "polygon", "avalanche"],
  },
};

export const DEFAULT_ONRAMP_PROVIDER = OnrampProvider.STRIPE;

export function getProviderConfig(provider: OnrampProvider): OnrampProviderConfig {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unsupported onramp provider: ${provider}`);
  }
  return config;
}

export function getDefaultProvider(): OnrampProviderConfig {
  return getProviderConfig(DEFAULT_ONRAMP_PROVIDER);
}

export function getSupportedProviders(): OnrampProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS);
}
