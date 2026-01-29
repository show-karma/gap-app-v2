import { OnrampProvider } from "@/hooks/donation/types";

const STRIPE_ONRAMP_URL = process.env.NEXT_PUBLIC_STRIPE_ONRAMP_URL || "https://crypto.link.com";

export const ALLOWED_ONRAMP_DOMAINS = [
  "crypto.link.com",
  "global.transak.com",
  "global-stg.transak.com",
] as const;

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
  [OnrampProvider.TRANSAK]: {
    id: OnrampProvider.TRANSAK,
    name: "Transak",
    // URL is returned from backend via onrampUrl in response
    buildUrl: ({ token }: OnrampUrlParams) => token,
    description: "Purchase crypto with card via Transak",
    supportedCurrencies: [
      { code: "USD", symbol: "$" },
      { code: "EUR", symbol: "€" },
      { code: "GBP", symbol: "£" },
    ],
    supportedNetworks: ["ethereum", "base", "optimism", "polygon", "arbitrum"],
  },
};

export const DEFAULT_ONRAMP_PROVIDER = OnrampProvider.TRANSAK;

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
