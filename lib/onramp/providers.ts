import { OnrampProvider } from "@/hooks/donation/types";

export interface OnrampUrlParams {
  token: string;
  fiatAmount?: number;
  fiatCurrency?: string;
  asset?: string;
}

export interface OnrampProviderConfig {
  id: OnrampProvider;
  name: string;
  baseUrl: string;
  buildUrl: (params: OnrampUrlParams) => string;
  description: string;
  supportedCurrencies: Array<{ code: string; symbol: string }>;
  supportedNetworks: string[];
}

const PROVIDER_CONFIGS: Record<OnrampProvider, OnrampProviderConfig> = {
  [OnrampProvider.COINBASE]: {
    id: OnrampProvider.COINBASE,
    name: "Coinbase",
    baseUrl: "https://pay.coinbase.com/buy/select-asset",
    buildUrl: ({ token, fiatAmount, fiatCurrency, asset }: OnrampUrlParams) => {
      const params = new URLSearchParams({ sessionToken: token });
      if (fiatAmount) params.set("presetFiatAmount", String(fiatAmount));
      if (fiatCurrency) params.set("fiatCurrency", fiatCurrency);
      if (asset) params.set("defaultAsset", asset);
      return `https://pay.coinbase.com/buy/select-asset?${params.toString()}`;
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
