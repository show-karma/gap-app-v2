import { OnrampProvider } from "@/hooks/donation/types";

/**
 * Chain IDs supported by Stripe for fiat onramp
 * Maps to: ethereum (1), base (8453), polygon (137), avalanche (43114)
 */
export const STRIPE_SUPPORTED_CHAIN_IDS = [1, 8453, 137, 43114] as const;

export const ALLOWED_ONRAMP_DOMAINS = ["crypto.link.com"] as const;

/**
 * Countries where Stripe Crypto Onramp is available.
 * Currently limited to US and EU member states.
 * ISO 3166-1 alpha-2 country codes.
 */
export const STRIPE_ALLOWED_COUNTRIES = new Set([
  // United States
  "US",
  // EU member states (27 countries)
  "AT", // Austria
  "BE", // Belgium
  "BG", // Bulgaria
  "HR", // Croatia
  "CY", // Cyprus
  "CZ", // Czech Republic
  "DK", // Denmark
  "EE", // Estonia
  "FI", // Finland
  "FR", // France
  "DE", // Germany
  "GR", // Greece
  "HU", // Hungary
  "IE", // Ireland
  "IT", // Italy
  "LV", // Latvia
  "LT", // Lithuania
  "LU", // Luxembourg
  "MT", // Malta
  "NL", // Netherlands
  "PL", // Poland
  "PT", // Portugal
  "RO", // Romania
  "SK", // Slovakia
  "SI", // Slovenia
  "ES", // Spain
  "SE", // Sweden
]);

/** EU member states - used for EUR currency selection */
const EU_COUNTRIES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

/**
 * Check if a country is supported for Stripe onramp.
 */
export function isCountrySupported(countryCode: string | null | undefined): boolean {
  if (!countryCode) return false;
  return STRIPE_ALLOWED_COUNTRIES.has(countryCode.toUpperCase());
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
}

/**
 * Get the appropriate currency based on user's country.
 * US users get USD, EU users get EUR.
 */
export function getCurrencyForCountry(countryCode: string | null | undefined): CurrencyInfo {
  if (!countryCode) {
    return { code: "USD", symbol: "$" };
  }

  const upperCode = countryCode.toUpperCase();

  if (upperCode === "US") {
    return { code: "USD", symbol: "$" };
  }

  if (EU_COUNTRIES.has(upperCode)) {
    return { code: "EUR", symbol: "€" };
  }

  // Default to USD for any other case
  return { code: "USD", symbol: "$" };
}

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
    ],
    supportedNetworks: ["mainnet", "base", "polygon"],
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

export function getSupportedProviders(): OnrampProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS);
}
