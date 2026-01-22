import { OnrampProvider } from "@/hooks/donation/types";

const COINBASE_PAY_URL = process.env.NEXT_PUBLIC_COINBASE_PAY_URL || "https://pay.coinbase.com";
const STRIPE_ONRAMP_URL = process.env.NEXT_PUBLIC_STRIPE_ONRAMP_URL || "https://crypto.link.com";

export const ALLOWED_ONRAMP_DOMAINS = ["pay.coinbase.com", "crypto.link.com"] as const;

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
    // Note: With the Quote-based flow, URL is returned from backend (onrampUrl in response)
    // This buildUrl is kept as fallback for backwards compatibility only
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
      if (partnerUserRef) params.set("partnerUserRef", partnerUserRef);
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
  [OnrampProvider.STRIPE]: {
    id: OnrampProvider.STRIPE,
    name: "Stripe",
    buildUrl: ({
      token,
      fiatAmount,
      fiatCurrency,
      redirectUrl,
      partnerUserRef,
    }: OnrampUrlParams) => {
      // Stripe Crypto Onramp uses an embedded widget, not a redirect URL
      // The client_secret (token) is used to initialize the embedded element
      // For fallback/redirect scenarios, we construct a URL to our internal handler
      const params = new URLSearchParams({ client_secret: token });
      if (fiatAmount) params.set("amount", String(fiatAmount));
      if (fiatCurrency) params.set("currency", fiatCurrency);
      if (redirectUrl) params.set("redirect_url", redirectUrl);
      if (partnerUserRef) params.set("session_id", partnerUserRef);
      return `${STRIPE_ONRAMP_URL}/onramp?${params.toString()}`;
    },
    description: "Purchase crypto with card via Stripe",
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
