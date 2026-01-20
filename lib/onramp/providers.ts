import { OnrampProvider } from "@/hooks/donation/types";

const COINBASE_PAY_URL = process.env.NEXT_PUBLIC_COINBASE_PAY_URL || "https://pay.coinbase.com";

export const ALLOWED_ONRAMP_DOMAINS = ["pay.coinbase.com"] as const;

export interface OnrampUrlParams {
  token: string;
  fiatAmount?: number;
  fiatCurrency?: string;
  asset?: string;
  redirectUrl?: string;
  partnerUserRef?: string;
}

export interface OnrampProviderConfig {
  id: OnrampProvider;
  name: string;
  buildUrl: (params: OnrampUrlParams) => string;
  description: string;
  supportedCurrencies: Array<{ code: string; symbol: string }>;
  supportedNetworks: string[];
}

const PROVIDER_CONFIGS: Record<OnrampProvider, OnrampProviderConfig> = {
  [OnrampProvider.COINBASE]: {
    id: OnrampProvider.COINBASE,
    name: "Coinbase",
    buildUrl: ({
      token,
      fiatAmount,
      fiatCurrency,
      asset,
      redirectUrl,
      partnerUserRef,
    }: OnrampUrlParams) => {
      const params = new URLSearchParams({ sessionToken: token });
      if (fiatAmount) params.set("presetFiatAmount", String(fiatAmount));
      if (fiatCurrency) params.set("fiatCurrency", fiatCurrency);
      if (asset) params.set("defaultAsset", asset);
      if (redirectUrl) params.set("redirectUrl", redirectUrl);
      if (partnerUserRef) params.set("partnerUserId", partnerUserRef);
      return `${COINBASE_PAY_URL}/buy/select-asset?${params.toString()}`;
    },
    description: "Purchase crypto with card via Coinbase",
    supportedCurrencies: [
      { code: "USD", symbol: "$" },
      { code: "EUR", symbol: "€" },
      { code: "GBP", symbol: "£" },
    ],
    supportedNetworks: ["ethereum", "base", "optimism", "polygon", "arbitrum"],
  },
};

export const DEFAULT_ONRAMP_PROVIDER = OnrampProvider.COINBASE;

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
